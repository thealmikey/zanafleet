import {
  Logger,
  Optional,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { UpdateSignUpStepCommand } from '../commands/update-signup-step.command';
import { SignUpSessionStatus } from '../dto/signup.enums';
import { SignUpSessionEntity } from '../entities/signup-session.entity';
import { SignUpStepCompletedEventV1 } from '../events/signup-step-completed.event';
import { UpdateSignUpStepResult } from './signup-result.interfaces';

/**
 * UpdateSignUpStepCommandHandler
 *
 * Handles the UpdateSignUpStepCommand by:
 * 1. Finding the sign-up session by ID
 * 2. Validating session status (not expired/completed)
 * 3. Checking for idempotency
 * 4. Applying updates (workspaceId, roles, linkedWallets)
 * 5. Updating completedSteps array
 * 6. Setting status to PARTIAL if it was INITIATED
 * 7. Persisting and publishing domain event
 */
@CommandHandler(UpdateSignUpStepCommand)
@Injectable()
export class UpdateSignUpStepCommandHandler
  implements ICommandHandler<UpdateSignUpStepCommand>
{
  private readonly logger = new Logger(UpdateSignUpStepCommandHandler.name);

  constructor(
    @InjectRepository(SignUpSessionEntity)
    private readonly signupSessionRepository: Repository<SignUpSessionEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Executes the sign-up step update process
   *
   * @param command UpdateSignUpStepCommand
   */
  async execute(
    command: UpdateSignUpStepCommand,
  ): Promise<UpdateSignUpStepResult> {
    const {
      sessionId,
      stepName,
      workspaceId,
      roles,
      linkedWallets,
      idempotencyKey,
    } = command;

    this.logger.log(
      `Executing UpdateSignUpStepCommand for session: ${sessionId}, step: ${stepName}`,
    );

    // Step 1: Find session
    const session = await this.signupSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`SignUp session ${sessionId} not found`);
    }

    // Step 2: Validate status
    if (session.status === SignUpSessionStatus.EXPIRED) {
      throw new BadRequestException(`SignUp session ${sessionId} has expired`);
    }

    if (session.status === SignUpSessionStatus.COMPLETED) {
      throw new BadRequestException(
        `SignUp session ${sessionId} is already completed`,
      );
    }

    // Step 3: Idempotency check
    const hasChanges = this.detectDeepChanges(session, {
      workspaceId,
      roles,
      linkedWallets,
      stepName,
    });

    if (
      idempotencyKey &&
      session.idempotencyKey === idempotencyKey &&
      !hasChanges
    ) {
      this.logger.log(
        `Duplicate request detected via idempotency key: ${idempotencyKey}. No changes needed.`,
      );
      return {
        sessionId: session.id,
        status: session.status,
        completedSteps: session.completedSteps,
      };
    }

    // Step 4: Apply changes and track for event
    const changes: Record<string, unknown> = {};

    if (workspaceId !== undefined && session.workspaceId !== workspaceId) {
      changes.workspaceId = workspaceId;
      session.workspaceId = workspaceId;
    }

    if (
      roles !== undefined &&
      JSON.stringify(session.roles) !== JSON.stringify(roles)
    ) {
      changes.roles = roles;
      session.roles = [...roles];
    }

    if (
      linkedWallets !== undefined &&
      JSON.stringify(session.linkedWallets) !== JSON.stringify(linkedWallets)
    ) {
      changes.linkedWallets = linkedWallets;
      session.linkedWallets = [...linkedWallets];
    }

    if (idempotencyKey) {
      session.idempotencyKey = idempotencyKey;
    }

    // Step 5: Update completed steps
    if (!session.completedSteps.includes(stepName)) {
      session.completedSteps = [...session.completedSteps, stepName];
      changes.stepName = stepName;
    }

    // Step 6: Update status if needed
    if (session.status === SignUpSessionStatus.INITIATED) {
      session.status = SignUpSessionStatus.PARTIAL;
    }

    // Step 7: Persist to PostgreSQL
    await this.signupSessionRepository.save(session);
    this.logger.debug(`SignUp session ${sessionId} updated in PostgreSQL`);

    // Step 8: Create and publish domain event
    const eventId = uuidv4();
    const event = new SignUpStepCompletedEventV1({
      eventId,
      sessionId,
      stepName,
      changes,
      occurredAt: new Date(),
    });

    this.eventBus.publish(event);
    this.logger.log(
      `SignUpStepCompletedEvent-V1 published for session: ${sessionId}`,
    );

    // Step 9: Publish to external NATS EventBus
    if (this.eventBusService) {
      try {
        await this.eventBusService.publish(
          NatsSubjects.SignUp.STEP_COMPLETED_V1,
          event,
        );
      } catch (publishError: unknown) {
        const errorMessage =
          publishError instanceof Error
            ? publishError.message
            : String(publishError);
        this.logger.warn(
          `NATS publish failed for SignUpStepCompletedEvent-V1: ${errorMessage}`,
        );
      }
    }

    return {
      sessionId: session.id,
      status: session.status,
      completedSteps: session.completedSteps,
    };
  }

  /**
   * Helper to detect if there are actual changes compared to current state
   */
  private detectDeepChanges(
    session: SignUpSessionEntity,
    updates: {
      workspaceId?: string | null;
      roles?: string[];
      linkedWallets?: string[];
      stepName: string;
    },
  ): boolean {
    if (
      updates.workspaceId !== undefined &&
      session.workspaceId !== updates.workspaceId
    )
      return true;

    if (
      updates.roles !== undefined &&
      JSON.stringify(session.roles) !== JSON.stringify(updates.roles)
    )
      return true;

    if (
      updates.linkedWallets !== undefined &&
      JSON.stringify(session.linkedWallets) !==
        JSON.stringify(updates.linkedWallets)
    )
      return true;

    if (!session.completedSteps.includes(updates.stepName)) return true;

    return false;
  }
}
