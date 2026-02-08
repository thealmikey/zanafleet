import { Controller, Logger, OnModuleDestroy } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';
import { RiderTelemetryData } from '@zanafleet/contracts';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { UpdateRiderLocationCommand } from '../commands/update-rider-location.command';

/**
 * Configuration for batch processing of telemetry messages.
 */
export interface BatchConfig {
  /** Maximum messages to accumulate before flushing */
  maxBatchSize: number;
  /** Maximum time to wait before flushing in milliseconds */
  maxWaitMs: number;
}

/**
 * Default batch configuration for high-throughput scenarios.
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 100,
  maxWaitMs: 500,
};

/**
 * Subscriber that receives rider telemetry from mobile apps via NATS
 * and dispatches UpdateRiderLocationCommand to the command handler.
 *
 * Supports two modes:
 * - Immediate processing: each message is processed as it arrives
 * - Batch processing: messages are accumulated and processed in batches
 */
@Controller()
export class RiderTelemetrySubscriber implements OnModuleDestroy {
  private readonly logger = new Logger(RiderTelemetrySubscriber.name);

  private readonly batchEnabled: boolean;
  private readonly batchConfig: BatchConfig;
  private batchBuffer: RiderTelemetryData[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly commandBus: CommandBus,
    batchConfig?: BatchConfig,
  ) {
    this.batchEnabled = !!batchConfig;
    this.batchConfig = batchConfig ?? DEFAULT_BATCH_CONFIG;
  }

  /**
   * Handle incoming rider telemetry messages from NATS.
   * Validates payload, transforms to command, and dispatches.
   */
  @MessagePattern(NatsSubjects.Location.RIDER_TELEMETRY_V1)
  async handleRiderTelemetry(
    @Payload() data: Record<string, unknown>,
    @Ctx() _context: NatsContext,
  ): Promise<void> {
    try {
      const telemetry = this.validateAndTransform(data);

      if (this.batchEnabled) {
        await this.addToBatch(telemetry);
      } else {
        await this.processMessage(telemetry);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process rider telemetry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Validate and transform raw payload to RiderTelemetryData.
   * Throws on validation failure.
   */
  validateAndTransform(data: Record<string, unknown>): RiderTelemetryData {
    if (typeof data.riderId !== 'string' || !data.riderId.trim()) {
      throw new Error('Missing or invalid riderId: must be a non-empty string');
    }

    if (typeof data.latitude !== 'number' || !Number.isFinite(data.latitude)) {
      throw new Error('Missing or invalid latitude: must be a finite number');
    }

    if (typeof data.longitude !== 'number' || !Number.isFinite(data.longitude)) {
      throw new Error('Missing or invalid longitude: must be a finite number');
    }

    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error(`Latitude out of range: ${data.latitude}. Must be between -90 and 90`);
    }

    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error(`Longitude out of range: ${data.longitude}. Must be between -180 and 180`);
    }

    const timestamp = this.parseTimestamp(data.timestamp);

    return {
      riderId: data.riderId.trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      heading: this.parseOptionalNumber(data.heading),
      speed: this.parseOptionalNumber(data.speed),
      accuracy: this.parseOptionalNumber(data.accuracy),
      timestamp,
    };
  }

  private parseTimestamp(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      throw new Error(`Invalid timestamp: ${value}`);
    }

    return new Date();
  }

  private parseOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }

  private async processMessage(telemetry: RiderTelemetryData): Promise<void> {
    const command = new UpdateRiderLocationCommand(telemetry);
    await this.commandBus.execute(command);
    this.logger.debug(`Processed telemetry for rider ${telemetry.riderId}`);
  }

  private async addToBatch(telemetry: RiderTelemetryData): Promise<void> {
    this.batchBuffer.push(telemetry);

    if (this.batchTimeout === null) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatch().catch((err) => {
          this.logger.error('Batch flush failed', err);
        });
      }, this.batchConfig.maxWaitMs);
    }

    if (this.batchBuffer.length >= this.batchConfig.maxBatchSize) {
      await this.flushBatch();
    }
  }

  /**
   * Flush accumulated batch and process all messages.
   * Exposed for testing and graceful shutdown.
   */
  async flushBatch(): Promise<void> {
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = this.batchBuffer;
    this.batchBuffer = [];

    if (batch.length === 0) {
      return;
    }

    this.logger.debug(`Flushing batch of ${batch.length} telemetry messages`);

    const results = await Promise.allSettled(
      batch.map((telemetry) => this.processMessage(telemetry)),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(
        `${failures.length}/${batch.length} batch messages failed to process`,
      );
    }
  }

  /**
   * Get current batch buffer size (for testing).
   */
  getBatchSize(): number {
    return this.batchBuffer.length;
  }

  /**
   * Check if batch processing is enabled.
   */
  isBatchEnabled(): boolean {
    return this.batchEnabled;
  }

  /**
   * Lifecycle hook called during graceful shutdown.
   * Flushes any pending batch and clears the timeout to prevent leaked timers.
   */
  async onModuleDestroy(): Promise<void> {
    await this.flushBatch();
  }
}
