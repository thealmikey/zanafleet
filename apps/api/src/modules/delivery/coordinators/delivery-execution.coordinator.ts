import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { LocationIntelligenceService } from '../../location-intelligence/services/location-intelligence.service';
import { PolicyEvaluationEngineService } from '../../policy/services/policy-evaluation-engine.service';
import { DeliveryEntity } from '../entities/delivery.entity';
import { DelayDetectedEventV1 } from '../events/delay-detected.event';
import { DropoffConfirmedEventV1 } from '../events/dropoff-confirmed.event';
import { PickupConfirmedEventV1 } from '../events/pickup-confirmed.event';
import { ProgressUpdatedEventV1 } from '../events/progress-updated.event';

import { DeliveryLifecycleCoordinator } from './delivery-lifecycle.coordinator';

export interface PickupProofInput {
  photoUrl?: string;
  signature?: string;
  notes?: string;
}

export interface DropoffProofInput {
  photoUrl?: string;
  signature?: string;
  recipientName?: string;
}

export interface TelemetryInput {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface ConfirmPickupResult {
  success: boolean;
  deliveryId: string;
  error?: string;
}

export interface ConfirmDropoffResult {
  success: boolean;
  deliveryId: string;
  error?: string;
}

export interface UpdateProgressResult {
  deliveryId: string;
  estimatedArrival?: Date;
  isDelayed: boolean;
}

export interface DelayDetectionResult {
  isDelayed: boolean;
  delayMinutes?: number;
}

export class DeliveryNotFoundError extends Error {
  constructor(public readonly deliveryId: string) {
    super(`Delivery ${deliveryId} not found`);
    this.name = 'DeliveryNotFoundError';
  }
}

export class RiderMismatchError extends Error {
  constructor(
    public readonly deliveryId: string,
    public readonly expectedRiderId: string | null,
    public readonly actualRiderId: string
  ) {
    super(
      `Rider ${actualRiderId} is not assigned to delivery ${deliveryId}. Expected: ${expectedRiderId}`
    );
    this.name = 'RiderMismatchError';
  }
}

export class InvalidStatusError extends Error {
  constructor(
    public readonly deliveryId: string,
    public readonly currentStatus: string,
    public readonly expectedStatuses: string[]
  ) {
    super(
      `Delivery ${deliveryId} has status ${currentStatus}, expected one of: ${expectedStatuses.join(
        ', '
      )}`
    );
    this.name = 'InvalidStatusError';
  }
}

/**
 * DeliveryExecutionCoordinator
 *
 * Orchestrates live delivery execution operations including:
 * - Pickup confirmation with proof collection
 * - Dropoff confirmation with proof collection
 * - Progress updates with telemetry data
 * - Delay detection and SLA breach tracking
 *
 * Delegates state transitions to DeliveryLifecycleCoordinator.
 */
@Injectable()
export class DeliveryExecutionCoordinator {
  private readonly logger = new Logger(DeliveryExecutionCoordinator.name);

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    private readonly lifecycleCoordinator: DeliveryLifecycleCoordinator,
    private readonly locationIntelligenceService: LocationIntelligenceService,
    private readonly eventBus: EventBusService,
    @Optional()
    _policyEngine?: PolicyEvaluationEngineService
  ) {}

  /**
   * Confirms pickup of a delivery by the assigned rider.
   *
   * Validates:
   * - Delivery exists
   * - Rider matches assignedRiderId
   * - Current status is Assigned
   *
   * Transitions: Assigned -> PickedUp -> InTransit
   * Emits: PickupConfirmedEventV1
   */
  async confirmPickup(
    deliveryId: string,
    riderId: string,
    proofData?: PickupProofInput
  ): Promise<ConfirmPickupResult> {
    this.logger.log(`Confirming pickup for delivery ${deliveryId} by rider ${riderId}`);

    try {
      const delivery = await this.deliveryRepository.findOne({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new DeliveryNotFoundError(deliveryId);
      }

      if (delivery.assignedRiderId !== riderId) {
        throw new RiderMismatchError(deliveryId, delivery.assignedRiderId, riderId);
      }

      if (delivery.status !== DeliveryStatus.Assigned) {
        throw new InvalidStatusError(deliveryId, delivery.status, [DeliveryStatus.Assigned]);
      }

      await this.lifecycleCoordinator.transitionState(deliveryId, DeliveryStatus.PickedUp, riderId);

      await this.lifecycleCoordinator.transitionState(
        deliveryId,
        DeliveryStatus.InTransit,
        riderId
      );

      const event = new PickupConfirmedEventV1({
        eventId: uuidv4(),
        deliveryId,
        riderId,
        proofData: proofData ?? null,
        confirmedAt: new Date(),
      });

      await this.eventBus.publish(NatsSubjects.Delivery.PICKUP_CONFIRMED_V1, event);

      this.logger.log(`Pickup confirmed for delivery ${deliveryId}`);

      return {
        success: true,
        deliveryId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to confirm pickup for delivery ${deliveryId}: ${errorMessage}`);

      return {
        success: false,
        deliveryId,
        error: errorMessage,
      };
    }
  }

  /**
   * Confirms dropoff of a delivery by the assigned rider.
   *
   * Validates:
   * - Delivery exists
   * - Rider matches assignedRiderId
   * - Current status is InTransit
   *
   * Transitions: InTransit -> Delivered
   * Emits: DropoffConfirmedEventV1
   */
  async confirmDropoff(
    deliveryId: string,
    riderId: string,
    proofData?: DropoffProofInput
  ): Promise<ConfirmDropoffResult> {
    this.logger.log(`Confirming dropoff for delivery ${deliveryId} by rider ${riderId}`);

    try {
      const delivery = await this.deliveryRepository.findOne({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new DeliveryNotFoundError(deliveryId);
      }

      if (delivery.assignedRiderId !== riderId) {
        throw new RiderMismatchError(deliveryId, delivery.assignedRiderId, riderId);
      }

      if (delivery.status !== DeliveryStatus.InTransit) {
        throw new InvalidStatusError(deliveryId, delivery.status, [DeliveryStatus.InTransit]);
      }

      await this.lifecycleCoordinator.transitionState(
        deliveryId,
        DeliveryStatus.Delivered,
        riderId
      );

      const event = new DropoffConfirmedEventV1({
        eventId: uuidv4(),
        deliveryId,
        riderId,
        proofData: proofData ?? null,
        confirmedAt: new Date(),
      });

      await this.eventBus.publish(NatsSubjects.Delivery.DROPOFF_CONFIRMED_V1, event);

      this.logger.log(`Dropoff confirmed for delivery ${deliveryId}`);

      return {
        success: true,
        deliveryId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to confirm dropoff for delivery ${deliveryId}: ${errorMessage}`);

      return {
        success: false,
        deliveryId,
        error: errorMessage,
      };
    }
  }

  /**
   * Updates delivery progress with telemetry data.
   *
   * Validates:
   * - Delivery exists
   * - Current status is PickedUp or InTransit
   *
   * Checks for abnormal delays and emits ProgressUpdatedEventV1.
   */
  async updateProgress(
    deliveryId: string,
    telemetryData: TelemetryInput
  ): Promise<UpdateProgressResult> {
    this.logger.log(`Updating progress for delivery ${deliveryId}`);

    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new DeliveryNotFoundError(deliveryId);
    }

    const validStatuses = [DeliveryStatus.PickedUp, DeliveryStatus.InTransit];
    if (!validStatuses.includes(delivery.status)) {
      throw new InvalidStatusError(deliveryId, delivery.status, validStatuses);
    }

    const delayResult = await this.detectAbnormalDelay(deliveryId);

    let estimatedArrival: Date | undefined;
    if (delivery.assignedRiderId) {
      try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const riderPath = await this.locationIntelligenceService.getRiderPath(
          delivery.assignedRiderId,
          { start: oneHourAgo, end: now }
        );

        if (riderPath.length > 0) {
          const avgSpeedKmh = 25;
          const estimatedDistanceKm = 5;
          const estimatedTimeHours = estimatedDistanceKm / avgSpeedKmh;
          estimatedArrival = new Date(now.getTime() + estimatedTimeHours * 60 * 60 * 1000);
        }
      } catch (error) {
        this.logger.warn(`Could not get rider path for ETA calculation: ${error}`);
      }
    }

    const event = new ProgressUpdatedEventV1({
      eventId: uuidv4(),
      deliveryId,
      riderId: delivery.assignedRiderId ?? 'unknown',
      currentLocation: {
        latitude: telemetryData.latitude,
        longitude: telemetryData.longitude,
      },
      estimatedArrival,
      distanceRemainingMeters: null,
      updatedAt: telemetryData.timestamp,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.PROGRESS_UPDATED_V1, event);

    this.logger.log(`Progress updated for delivery ${deliveryId}`);

    return {
      deliveryId,
      estimatedArrival,
      isDelayed: delayResult.isDelayed,
    };
  }

  /**
   * Detects abnormal delays by comparing current time against SLA.
   *
   * If the delivery is past its SLA dropoff time:
   * - Updates slaBreachedAt timestamp
   * - Emits DelayDetectedEventV1
   */
  async detectAbnormalDelay(deliveryId: string): Promise<DelayDetectionResult> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new DeliveryNotFoundError(deliveryId);
    }

    if (!delivery.slaDropoffBy) {
      return { isDelayed: false };
    }

    const now = new Date();
    const slaTime = new Date(delivery.slaDropoffBy);

    if (now <= slaTime) {
      return { isDelayed: false };
    }

    const delayMs = now.getTime() - slaTime.getTime();
    const delayMinutes = Math.floor(delayMs / (1000 * 60));

    if (!delivery.slaBreachedAt) {
      await this.deliveryRepository.update(deliveryId, {
        slaBreachedAt: now,
      });

      const event = new DelayDetectedEventV1({
        eventId: uuidv4(),
        deliveryId,
        riderId: delivery.assignedRiderId,
        expectedBy: slaTime,
        detectedAt: now,
        delayMinutes,
        reason: 'SLA dropoff time exceeded',
      });

      await this.eventBus.publish(NatsSubjects.Delivery.DELAY_DETECTED_V1, event);

      this.logger.warn(
        `Delay detected for delivery ${deliveryId}: ${delayMinutes} minutes past SLA`
      );
    }

    return {
      isDelayed: true,
      delayMinutes,
    };
  }
}
