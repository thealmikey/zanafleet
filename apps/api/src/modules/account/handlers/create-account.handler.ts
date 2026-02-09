import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateAccountCommand } from '../commands/create-account.command';
import { AccountStatus } from '../dto/account.enums';
import { AccountEntity } from '../entities/account.entity';
import { AccountCreatedEventV1 } from '../events/account-created.event';

/**
 * CreateAccountCommandHandler
 * Handles the creation of new accounts in the system
 * Follows CQRS pattern with event sourcing
 */
@Injectable()
@CommandHandler(CreateAccountCommand)
export class CreateAccountCommandHandler implements ICommandHandler<CreateAccountCommand> {
  private readonly logger = new Logger(CreateAccountCommandHandler.name);

  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: CreateAccountCommand): Promise<string> {
    const accountId = uuidv4();
    const now = new Date();

    const entity = AccountEntity.fromDomain({
      accountId,
      externalId: command.externalId,
      accountType: command.accountType,
      status: AccountStatus.ACTIVE,
      currency: command.currency,
      metadata: command.metadata,
      createdAt: now,
    });

    await this.accountRepository.save(entity);

    const event = new AccountCreatedEventV1({
      eventId: uuidv4(),
      accountId,
      externalId: command.externalId,
      accountType: command.accountType,
      status: AccountStatus.ACTIVE,
      currency: command.currency,
      metadata: command.metadata,
      createdAt: now,
    });

    this.eventBus.publish(event);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Account.CREATED_V1, event)
        .catch((error) => {
          this.logger.error(`Failed to publish AccountCreatedEvent to NATS: ${error.message}`);
        });
    }

    this.logger.log(`Account created: ${accountId} for external entity: ${command.externalId}`);

    return accountId;
  }
}
