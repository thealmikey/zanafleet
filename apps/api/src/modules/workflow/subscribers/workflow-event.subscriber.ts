import { Injectable, Logger } from '@nestjs/common';

import { WorkflowEngineService } from '../services/workflow-engine.service';

/**
 * WorkflowEventSubscriber
 *
 * Service that handles domain events from other modules and triggers workflow state transitions.
 *
 * Event Mapping:
 * - PaymentAuthorizedEvent → transition to PAYMENT_AUTHORIZED
 * - DriverAssignedEvent → transition to DRIVER_ASSIGNED
 * - VehicleAssignedEvent → transition to VEHICLE_ASSIGNED
 * - DeliveryCompletedEvent → transition to COMPLETED
 * - BookingCancelledEvent → transition to CANCELLED
 *
 * This service is meant to be called by other modules that publish events via EventBus.
 */
@Injectable()
export class WorkflowEventSubscriber {
  private readonly logger = new Logger(WorkflowEventSubscriber.name);

  constructor(private readonly workflowEngine: WorkflowEngineService) {}

  /**
   * Handle Payment Authorized Event
   * Triggers transition to PAYMENT_AUTHORIZED state
   */
  async onPaymentAuthorized(payload: {
    paymentId: string;
    orderId: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling payment authorized for: ${payload.paymentId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for payment ${payload.paymentId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'PaymentAuthorizedEvent-V1',
        eventData: {
          paymentId: payload.paymentId,
          orderId: payload.orderId,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'payment-module',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling payment authorized: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle Driver Assigned Event
   * Triggers transition to DRIVER_ASSIGNED state
   */
  async onDriverAssigned(payload: {
    driverId: string;
    orderId: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling driver assigned: ${payload.driverId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for driver ${payload.driverId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'DriverAssignedEvent-V1',
        eventData: {
          driverId: payload.driverId,
          orderId: payload.orderId,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'asset-module',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling driver assigned: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle Vehicle Assigned Event
   * Triggers transition to VEHICLE_ASSIGNED state
   */
  async onVehicleAssigned(payload: {
    vehicleId: string;
    orderId: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling vehicle assigned: ${payload.vehicleId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for vehicle ${payload.vehicleId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'VehicleAssignedEvent-V1',
        eventData: {
          vehicleId: payload.vehicleId,
          orderId: payload.orderId,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'asset-module',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling vehicle assigned: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle Delivery Completed Event
   * Triggers transition to COMPLETED state
   */
  async onDeliveryCompleted(payload: {
    deliveryId: string;
    orderId: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling delivery completed: ${payload.deliveryId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for delivery ${payload.deliveryId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'DeliveryCompletedEvent-V1',
        eventData: {
          deliveryId: payload.deliveryId,
          orderId: payload.orderId,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'delivery-module',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling delivery completed: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle Booking Cancelled Event
   * Triggers transition to CANCELLED state
   */
  async onBookingCancelled(payload: {
    bookingId: string;
    orderId: string;
    reason?: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling booking cancelled: ${payload.bookingId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for booking ${payload.bookingId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'BookingCancelledEvent-V1',
        eventData: {
          bookingId: payload.bookingId,
          orderId: payload.orderId,
          reason: payload.reason,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'user',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling booking cancelled: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle Estimate Generated Event
   * Triggers transition to OPTIONS_PRESENTED state
   */
  async onEstimateGenerated(payload: {
    estimateId: string;
    orderId: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling estimate generated: ${payload.estimateId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for estimate ${payload.estimateId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'EstimateGeneratedEvent-V1',
        eventData: {
          estimateId: payload.estimateId,
          orderId: payload.orderId,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'estimation-service',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling estimate generated: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle Booking Confirmed Event
   * Triggers transition to BOOKING_CONFIRMED state
   */
  async onBookingConfirmed(payload: {
    bookingId: string;
    orderId: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling booking confirmed: ${payload.bookingId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for booking ${payload.bookingId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'BookingConfirmedEvent-V1',
        eventData: {
          bookingId: payload.bookingId,
          orderId: payload.orderId,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'user',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling booking confirmed: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle Move Started Event
   * Triggers transition to IN_PROGRESS state
   */
  async onMoveStarted(payload: {
    moveId: string;
    orderId: string;
    instanceId?: string;
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling move started: ${payload.moveId}`);

    if (!payload.instanceId) {
      this.logger.warn(
        `No instanceId provided for move ${payload.moveId}, skipping workflow transition`,
      );
      return;
    }

    try {
      const result = await this.workflowEngine.triggerTransition({
        instanceId: payload.instanceId,
        eventType: 'MoveStartedEvent-V1',
        eventData: {
          moveId: payload.moveId,
          orderId: payload.orderId,
          eventId: crypto.randomUUID(),
        },
        triggeredBy: 'driver',
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to transition workflow ${payload.instanceId}: ${result.error}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling move started: ${err.message}`, err.stack);
    }
  }
}
