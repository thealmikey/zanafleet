import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { CreateWalletCommand } from '../commands/create-wallet.command';
import { WalletEntity } from '../entities/wallet.entity';
import { WalletCreatedEventV1 } from '../events/wallet-created.event';

/**
 * CreateWalletCommandHandler
 *
 * Handles the CreateWalletCommand by:
 * 1. Persisting to PostgreSQL
 * 2. Emitting WalletCreatedEvent-V1 to event bus
 */
@CommandHandler(CreateWalletCommand)
@Injectable()
export class CreateWalletCommandHandler
  implements ICommandHandler<CreateWalletCommand>
{
  private readonly logger = new Logger(CreateWalletCommandHandler.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: CreateWalletCommand): Promise<string> {
    const walletId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreateWalletCommand for owner: ${command.ownerId} (type: ${command.ownerType})`,
    );

    try {
      const entity = WalletEntity.fromDomain({
        walletId,
        ownerId: command.ownerId,
        ownerType: command.ownerType,
        type: command.type,
        currency: command.currency,
        balance: 0,
        createdAt: now,
      });

      await this.walletRepository.save(entity);
      this.logger.debug(`Wallet persisted to PostgreSQL: ${walletId}`);

      const event = new WalletCreatedEventV1({
        eventId,
        walletId,
        ownerId: command.ownerId,
        ownerType: command.ownerType,
        type: command.type,
        currency: command.currency,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`WalletCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService.publish(
          NatsSubjects.Wallet.CREATED_V1,
          event,
        ).catch(err => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return walletId;
    } catch (error) {
      this.logger.error(
        `Failed to create wallet: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
