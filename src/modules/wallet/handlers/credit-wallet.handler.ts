import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreditWalletCommand } from '../commands/credit-wallet.command';
import { WalletCreditedEventV1 } from '../events/wallet-credited.event';
import { WalletEntity } from '../entities/wallet.entity';
import { EventBusService, NatsSubjects } from '../../../core/event-bus';

/**
 * CreditWalletCommandHandler
 *
 * Handles the CreditWalletCommand by:
 * 1. Finding the wallet
 * 2. Adding to the balance
 * 3. Persisting to PostgreSQL
 * 4. Emitting WalletCreditedEvent-V1 to event bus
 */
@CommandHandler(CreditWalletCommand)
@Injectable()
export class CreditWalletCommandHandler
  implements ICommandHandler<CreditWalletCommand>
{
  private readonly logger = new Logger(CreditWalletCommandHandler.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: CreditWalletCommand): Promise<number> {
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreditWalletCommand for wallet: ${command.walletId}, amount: ${command.amount}`,
    );

    const wallet = await this.walletRepository.findOne({
      where: { id: command.walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${command.walletId} not found`);
    }

    const currentBalance = parseFloat(wallet.balance);
    const newBalance = currentBalance + command.amount;

    try {
      wallet.balance = newBalance.toFixed(2);
      await this.walletRepository.save(wallet);
      this.logger.debug(
        `Wallet ${command.walletId} credited. New balance: ${newBalance}`,
      );

      const event = new WalletCreditedEventV1({
        eventId,
        walletId: command.walletId,
        amount: command.amount,
        newBalance,
        reference: command.reference,
        occurredAt: new Date(),
      });

      this.eventBus.publish(event);
      this.logger.log(`WalletCreditedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService.publish(
          NatsSubjects.Wallet.CREDITED_V1,
          event,
        ).catch(err => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return newBalance;
    } catch (error) {
      this.logger.error(
        `Failed to credit wallet: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
