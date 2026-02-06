import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus';
import {
  UpdateCommitmentStatusCommand,
  isValidStatusTransition,
} from '../commands/update-commitment-status.command';
import { CommitmentStatus } from '../dto/commitment.enums';
import { CommitmentEntity } from '../entities/commitment.entity';
import { CommitmentStatusChangedEventV1 } from '../events/commitment-status-changed.event';

/**
 * UpdateCommitmentStatusCommandHandler
 *
 * Handles the UpdateCommitmentStatusCommand by:
 * 1. Validating commitment exists
 * 2. Enforcing legal status transitions
 * 3. Setting fulfilledAt or breachedAt timestamp as appropriate
 * 4. Persisting to PostgreSQL
 * 5. Emitting CommitmentStatusChangedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Validates status transitions before persistence
 * - Atomic operations (validate, persist, then emit)
 * - Proper error handling and logging
 */
@CommandHandler(UpdateCommitmentStatusCommand)
@Injectable()
export class UpdateCommitmentStatusCommandHandler
  implements ICommandHandler<UpdateCommitmentStatusCommand>
{
  private readonly logger = new Logger(UpdateCommitmentStatusCommandHandler.name);

  constructor(
    @InjectRepository(CommitmentEntity)
    private readonly commitmentRepository: Repository<CommitmentEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Update commitment status
   *
   * @param command UpdateCommitmentStatusCommand
   * @returns void
   * @throws NotFoundException if commitment does not exist
   * @throws BadRequestException if status transition is invalid
   */
  async execute(command: UpdateCommitmentStatusCommand): Promise<void> {
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing UpdateCommitmentStatusCommand: commitment=${command.commitmentId}, newStatus=${command.newStatus}`
    );

    try {
      // Step 1: Validate commitment exists
      const commitment = await this.commitmentRepository.findOne({
        where: { id: command.commitmentId },
      });

      if (!commitment) {
        this.logger.warn(`Commitment not found: ${command.commitmentId}`);
        throw new NotFoundException(`Commitment with ID '${command.commitmentId}' does not exist`);
      }

      const previousStatus = commitment.status;

      // Step 2: Validate status transition
      if (!isValidStatusTransition(previousStatus, command.newStatus)) {
        this.logger.warn(`Invalid status transition: ${previousStatus} -> ${command.newStatus}`);
        throw new BadRequestException(
          `Invalid status transition from '${previousStatus}' to '${command.newStatus}'`
        );
      }

      // Step 3: Update commitment status and timestamps
      commitment.status = command.newStatus;

      if (command.newStatus === CommitmentStatus.FULFILLED) {
        commitment.fulfilledAt = now;
      } else if (command.newStatus === CommitmentStatus.BREACHED) {
        commitment.breachedAt = now;
      }

      // Step 4: Persist to PostgreSQL
      await this.commitmentRepository.save(commitment);
      this.logger.debug(
        `Commitment status updated in PostgreSQL: ${command.commitmentId} (${previousStatus} -> ${command.newStatus})`
      );

      // Step 5: Create and emit event
      const event = new CommitmentStatusChangedEventV1({
        eventId,
        commitmentId: command.commitmentId,
        previousStatus,
        newStatus: command.newStatus,
        changedAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`CommitmentStatusChangedEvent-V1 emitted: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('commitment.events.status-changed-v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to update commitment status: ${err.message}`, err.stack);
      throw error;
    }
  }
}
