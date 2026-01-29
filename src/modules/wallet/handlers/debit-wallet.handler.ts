import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { DebitWalletCommand } from '../commands/debit-wallet.command';
import { WalletEntity } from '../entities/wallet.entity';
import { WalletDebitedEventV1 } from '../events/wallet-debited.event';
import { InsufficientFundsException } from '../exceptions/insufficient-funds.exception';

/**
 * DebitWalletCommandHandler
 *
 * Handles the DebitWalletCommand by:
 * 1. Finding the wallet
 * 2. Validating sufficient balance
 * 3. Subtracting from the balance
 * 4. Persisting to PostgreSQL
 * 5. Emitting WalletDebitedEvent-V1 to event bus
 */
@CommandHandler(DebitWalletCommand)
@Injectable()
export class DebitWalletCommandHandler
  implements ICommandHandler<DebitWalletCommand>
{
  private readonly logger = new Logger(DebitWalletCommandHandler.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: DebitWalletCommand): Promise<number> {
    const eventId = uuidv4();

    this.logger.log(
      `Executing DebitWalletCommand for wallet: ${command.walletId}, amount: ${command.amount}`,
    );

    const wallet = await this.walletRepository.findOne({
      where: { id: command.walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${command.walletId} not found`);
    }

    const currentBalance = parseFloat(wallet.balance);

    if (currentBalance < command.amount) {
      this.logger.warn(
        `Insufficient funds in wallet ${command.walletId}. Balance: ${currentBalance}, Requested: ${command.amount}`,
      );
      throw new InsufficientFundsException(
        command.walletId,
        currentBalance,
        command.amount,
      );
    }

    const newBalance = currentBalance - command.amount;

    try {
      wallet.balance = newBalance.toFixed(2);
      await this.walletRepository.save(wallet);
      this.logger.debug(
        `Wallet ${command.walletId} debited. New balance: ${newBalance}`,
      );

      const event = new WalletDebitedEventV1({
        eventId,
        walletId: command.walletId,
        amount: command.amount,
        newBalance,
        reference: command.reference,
        occurredAt: new Date(),
      });

      this.eventBus.publish(event);
      this.logger.log(`WalletDebitedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService.publish(
          NatsSubjects.Wallet.DEBITED_V1,
          event,
        ).catch(err => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return newBalance;
    } catch (error) {
      this.logger.error(
        `Failed to debit wallet: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
