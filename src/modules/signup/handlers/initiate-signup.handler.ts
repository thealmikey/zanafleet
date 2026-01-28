import { Logger, Optional, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { InitiateSignUpCommand } from '../commands/initiate-signup.command';
import { SignUpSessionStatus } from '../dto/signup.enums';
import { SignUpSessionEntity } from '../entities/signup-session.entity';
import { SignUpInitiatedEventV1 } from '../events/signup-initiated.event';
import { InitiateSignUpResult } from './signup-result.interfaces';

/**
 * InitiateSignUpCommandHandler
 *
 * Handles the InitiateSignUpCommand by:
 * 1. Creating a new sign-up session with INITIATED status
 * 2. Setting a 24-hour expiration time
 * 3. Persisting the session to PostgreSQL
 * 4. Publishing SignUpInitiatedEvent-V1 to internal bus and NATS
 */
@CommandHandler(InitiateSignUpCommand)
@Injectable()
export class InitiateSignUpCommandHandler
  implements ICommandHandler<InitiateSignUpCommand>
{
  private readonly logger = new Logger(InitiateSignUpCommandHandler.name);

  constructor(
    @InjectRepository(SignUpSessionEntity)
    private readonly signupSessionRepository: Repository<SignUpSessionEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Executes the sign-up initiation process
   *
   * @param command InitiateSignUpCommand
   * @returns result containing sessionId and expiration of the newly created sign-up session
   */
  async execute(
    command: InitiateSignUpCommand,
  ): Promise<InitiateSignUpResult> {
    const sessionId = uuidv4();
    const eventId = uuidv4();
    const now = new Date();
    // Expiration set to 24 hours from now
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    this.logger.log(
      `Executing InitiateSignUpCommand for actorType: ${command.actorType} (Session: ${sessionId})`,
    );

    try {
      // Step 1: Prepare session entity
      const entity = SignUpSessionEntity.fromDomain({
        sessionId,
        status: SignUpSessionStatus.INITIATED,
        actorType: command.actorType,
        idempotencyKey: command.idempotencyKey,
        roles: [],
        linkedWallets: [],
        completedSteps: [],
        expiresAt,
        createdAt: now,
      });

      // Step 2: Persist to PostgreSQL
      await this.signupSessionRepository.save(entity);
      this.logger.debug(`SignUp session persisted to PostgreSQL: ${sessionId}`);

      // Step 3: Create domain event
      const event = new SignUpInitiatedEventV1({
        eventId,
        sessionId,
        actorType: command.actorType,
        expiresAt,
        occurredAt: now,
      });

      // Step 4: Publish to internal EventBus (Synchronous handlers)
      this.eventBus.publish(event);
      this.logger.log(
        `SignUpInitiatedEvent-V1 published to internal bus: ${eventId}`,
      );

      // Step 5: Publish to external NATS EventBus (Asynchronous integration)
      if (this.eventBusService) {
        try {
          await this.eventBusService.publish(
            NatsSubjects.SignUp.INITIATED_V1,
            event,
          );
          this.logger.debug(
            `SignUpInitiatedEvent-V1 published to NATS: ${eventId}`,
          );
        } catch (publishError: unknown) {
          const errorMessage =
            publishError instanceof Error
              ? publishError.message
              : String(publishError);
          this.logger.warn(
            `NATS publish failed for SignUpInitiatedEvent-V1: ${errorMessage}`,
          );
        }
      }

      return { sessionId, expiresAt };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to initiate sign-up process: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
