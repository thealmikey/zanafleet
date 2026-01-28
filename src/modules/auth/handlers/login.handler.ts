import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as isUuid } from 'uuid';

import { ActorEntity } from '../../actor/entities/actor.entity';
import { ActorType } from '../../actor/dto/actor.enums';
import { LoginCommand } from '../commands/login.command';

export interface LoginResult {
  actorId: string;
  workspaceId: string;
  type: ActorType;
}

/**
 * LoginCommandHandler
 *
 * Handles LoginCommand by looking up an Actor by ID or wallet address.
 */
@CommandHandler(LoginCommand)
@Injectable()
export class LoginCommandHandler implements ICommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginCommandHandler.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
  ) {}

  /**
   * Executes the login process
   *
   * @param command LoginCommand
   * @returns Actor info on success
   * @throws UnauthorizedException if actor not found
   */
  async execute(command: LoginCommand): Promise<LoginResult> {
    const { identifier } = command;

    this.logger.log(`Attempting login for identifier: ${identifier}`);

    let actor: ActorEntity | null = null;

    // 1. Try to find by ID if identifier is a UUID
    if (isUuid(identifier)) {
      actor = await this.actorRepository.findOne({
        where: { id: identifier },
      });
    }

    // 2. Try to find by linkedWallets if not found by ID
    if (!actor) {
      actor = await this.actorRepository
        .createQueryBuilder('actor')
        .where(':identifier = ANY(actor.linkedWallets)', { identifier })
        .getOne();
    }

    if (!actor) {
      this.logger.warn(`Login failed: Actor not found for identifier ${identifier}`);
      throw new UnauthorizedException('Invalid identifier');
    }

    this.logger.log(`Login successful for actor: ${actor.id}`);

    const domain = actor.toDomain();
    return {
      actorId: domain.actorId,
      workspaceId: domain.workspaceId,
      type: domain.type,
    };
  }
}
