import {
  Logger,
  Optional,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { CreateActorCommand } from '../../actor/commands/create-actor.command';
import { FinalizeSignUpCommand } from '../commands/finalize-signup.command';
import { SignUpSessionStatus } from '../dto/signup.enums';
import { SignUpSessionEntity } from '../entities/signup-session.entity';
import { SignUpFinalizedEventV1 } from '../events/signup-finalized.event';

/**
 * FinalizeSignUpCommandHandler
 *
 * Handles the FinalizeSignUpCommand by:
 * 1. Finding the sign-up session
 * 2. Validating session status (not COMPLETED/EXPIRED)
 * 3. Validating mandatory fields (actorType, workspaceId)
 * 4. Orchestrating Actor creation via CreateActorCommand
 * 5. Updating session status to COMPLETED
 * 6. Publishing SignUpFinalizedEvent-V1
 */
@CommandHandler(FinalizeSignUpCommand)
@Injectable()
export class FinalizeSignUpCommandHandler implements ICommandHandler<FinalizeSignUpCommand> {
  private readonly logger = new Logger(FinalizeSignUpCommandHandler.name);

  constructor(
    @InjectRepository(SignUpSessionEntity)
    private readonly signupSessionRepository: Repository<SignUpSessionEntity>,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Executes the sign-up finalization process
   *
   * @param command FinalizeSignUpCommand
   * @returns Object containing the newly created actorId and its workspaceId
   */
  async execute(command: FinalizeSignUpCommand): Promise<{ actorId: string; workspaceId: string }> {
    const { sessionId } = command;

    this.logger.log(`Executing FinalizeSignUpCommand for session: ${sessionId}`);

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
      throw new BadRequestException(`SignUp session ${sessionId} is already completed`);
    }

    // Step 3: Validate mandatory fields
    if (!session.workspaceId) {
      throw new BadRequestException(
        `SignUp session ${sessionId} is missing mandatory field: workspaceId. Please complete required steps before finalizing.`
      );
    }

    // Step 4: Orchestrate Actor creation
    // We reuse the existing CreateActorCommandHandler logic via CommandBus
    const createActorCommand = new CreateActorCommand({
      type: session.actorType,
      workspaceId: session.workspaceId,
      roles: session.roles,
      linkedWallets: session.linkedWallets,
    });

    let actorId: string;
    try {
      actorId = await this.commandBus.execute<CreateActorCommand, string>(createActorCommand);
      this.logger.log(`Actor created successfully: ${actorId} for session: ${sessionId}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to create actor during sign-up finalization: ${err.message}`,
        err.stack
      );
      throw err;
    }

    // Step 5: Update session status
    session.status = SignUpSessionStatus.COMPLETED;
    await this.signupSessionRepository.save(session);
    this.logger.debug(`SignUp session ${sessionId} marked as COMPLETED`);

    // Step 6: Create and publish domain event
    const eventId = uuidv4();
    const event = new SignUpFinalizedEventV1({
      eventId,
      sessionId,
      actorId,
      workspaceId: session.workspaceId,
      occurredAt: new Date(),
    });

    this.eventBus.publish(event);
    this.logger.log(`SignUpFinalizedEvent-V1 published for session: ${sessionId}`);

    // Step 7: Publish to external NATS EventBus
    if (this.eventBusService) {
      try {
        await this.eventBusService.publish(NatsSubjects.SignUp.FINALIZED_V1, event);
      } catch (publishError: unknown) {
        const errorMessage =
          publishError instanceof Error ? publishError.message : String(publishError);
        this.logger.warn(`NATS publish failed for SignUpFinalizedEvent-V1: ${errorMessage}`);
      }
    }

    return {
      actorId,
      workspaceId: session.workspaceId,
    };
  }
}
