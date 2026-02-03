import { EventBusService } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateEvidenceCommand } from '../commands/create-evidence.command';
import { EvidenceEntity } from '../entities/evidence.entity';
import { EvidenceCreatedEventV1 } from '../events/evidence-created.event';

/**
 * CreateEvidenceCommandHandler
 *
 * Handles the CreateEvidenceCommand by:
 * 1. Checking idempotency via commandId (return existing evidenceId if duplicate)
 * 2. Persisting evidence to PostgreSQL (immutable - no updates allowed)
 * 3. Emitting EvidenceCreatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Idempotent: same commandId returns existing evidenceId without side effects
 * - Evidence records are immutable (create only, no updates)
 * - Atomic operations (check idempotency, persist, then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateEvidenceCommand)
@Injectable()
export class CreateEvidenceCommandHandler implements ICommandHandler<CreateEvidenceCommand> {
  private readonly logger = new Logger(CreateEvidenceCommandHandler.name);

  constructor(
    @InjectRepository(EvidenceEntity)
    private readonly evidenceRepository: Repository<EvidenceEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Create evidence record
   *
   * @param command CreateEvidenceCommand
   * @returns evidenceId of created or existing evidence
   */
  async execute(command: CreateEvidenceCommand): Promise<string> {
    this.logger.log(
      `Executing CreateEvidenceCommand: commandId=${command.commandId}, type=${command.type}`
    );

    try {
      // Step 1: Check idempotency via commandId
      const existingEvidence = await this.evidenceRepository.findOne({
        where: { commandId: command.commandId },
      });

      if (existingEvidence) {
        this.logger.log(
          `Idempotent request detected: commandId=${command.commandId}, returning existing evidenceId=${existingEvidence.id}`
        );
        return existingEvidence.id;
      }

      // Step 2: Generate new evidenceId and timestamps
      const evidenceId = uuidv4();
      const now = new Date();
      const eventId = uuidv4();

      this.logger.debug(
        `Creating new evidence: evidenceId=${evidenceId}, commandId=${command.commandId}`
      );

      // Step 3: Create evidence entity (immutable - no updates allowed)
      const entity = EvidenceEntity.fromDomain({
        evidenceId,
        type: command.type,
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        subjectType: command.subjectType,
        subjectId: command.subjectId,
        payload: command.payload,
        source: command.source,
        commandId: command.commandId,
        createdAt: now,
      });

      // Step 4: Persist to PostgreSQL
      await this.evidenceRepository.save(entity);
      this.logger.debug(`Evidence persisted to PostgreSQL: ${evidenceId}`);

      // Step 5: Create and emit event
      const event = new EvidenceCreatedEventV1({
        eventId,
        evidenceId,
        type: command.type,
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        subjectType: command.subjectType,
        subjectId: command.subjectId,
        payload: command.payload,
        source: command.source,
        commandId: command.commandId,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`EvidenceCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('evidence.events.created-v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return evidenceId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create evidence: ${err.message}`, err.stack);
      throw error;
    }
  }
}
