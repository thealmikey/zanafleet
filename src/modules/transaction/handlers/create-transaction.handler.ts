import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { WalletEntity } from '../../wallet/entities/wallet.entity';
import { InsufficientFundsException } from '../../wallet/exceptions/insufficient-funds.exception';
import { CreateTransactionCommand } from '../commands/create-transaction.command';
import { TransactionStatus } from '../dto/transaction.enums';
import { TransactionEntity } from '../entities/transaction.entity';
import { TransactionCreatedEventV1 } from '../events/transaction-created.event';
import { TransactionFailedException } from '../exceptions/transaction-failed.exception';

/**
 * CreateTransactionCommandHandler
 *
 * Handles the CreateTransactionCommand by performing an atomic fund transfer:
 * 1. Validate both wallets exist
 * 2. Validate source has sufficient funds
 * 3. Create transaction record with status `pending`
 * 4. Debit source wallet
 * 5. Credit destination wallet
 * 6. Update transaction status to `completed`
 * 7. Emit event
 *
 * All operations are wrapped in a database transaction for atomicity.
 * On failure, the transaction is rolled back and status is set to `failed`.
 */
@CommandHandler(CreateTransactionCommand)
@Injectable()
export class CreateTransactionCommandHandler implements ICommandHandler<CreateTransactionCommand> {
  private readonly logger = new Logger(CreateTransactionCommandHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: CreateTransactionCommand): Promise<string> {
    const transactionId = uuidv4();
    const eventId = uuidv4();
    const now = new Date();

    this.logger.log(
      `Executing CreateTransactionCommand: ${command.sourceWalletId} -> ${command.destinationWalletId}, amount: ${command.amount}`
    );

    let finalStatus: TransactionStatus = TransactionStatus.Failed;
    let transactionEntity: TransactionEntity | null = null;

    try {
      await this.dataSource.transaction(async (manager: EntityManager) => {
        const walletRepo = manager.getRepository(WalletEntity);
        const transactionRepo = manager.getRepository(TransactionEntity);

        const sourceWallet = await walletRepo.findOne({
          where: { id: command.sourceWalletId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!sourceWallet) {
          throw new NotFoundException(`Source wallet with ID ${command.sourceWalletId} not found`);
        }

        const destinationWallet = await walletRepo.findOne({
          where: { id: command.destinationWalletId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!destinationWallet) {
          throw new NotFoundException(
            `Destination wallet with ID ${command.destinationWalletId} not found`
          );
        }

        const sourceBalance = parseFloat(sourceWallet.balance);

        if (sourceBalance < command.amount) {
          throw new InsufficientFundsException(
            command.sourceWalletId,
            sourceBalance,
            command.amount
          );
        }

        transactionEntity = TransactionEntity.fromDomain({
          transactionId,
          sourceWalletId: command.sourceWalletId,
          destinationWalletId: command.destinationWalletId,
          amount: command.amount,
          type: command.type,
          status: TransactionStatus.Pending,
          linkedEventId: command.linkedEventId,
          createdAt: now,
        });

        await transactionRepo.save(transactionEntity);
        this.logger.debug(`Transaction created with status pending: ${transactionId}`);

        const newSourceBalance = sourceBalance - command.amount;
        sourceWallet.balance = newSourceBalance.toFixed(2);
        await walletRepo.save(sourceWallet);
        this.logger.debug(
          `Source wallet ${command.sourceWalletId} debited. New balance: ${newSourceBalance}`
        );

        const destinationBalance = parseFloat(destinationWallet.balance);
        const newDestinationBalance = destinationBalance + command.amount;
        destinationWallet.balance = newDestinationBalance.toFixed(2);
        await walletRepo.save(destinationWallet);
        this.logger.debug(
          `Destination wallet ${command.destinationWalletId} credited. New balance: ${newDestinationBalance}`
        );

        transactionEntity.status = TransactionStatus.Completed;
        await transactionRepo.save(transactionEntity);
        this.logger.debug(`Transaction status updated to completed: ${transactionId}`);

        finalStatus = TransactionStatus.Completed;
      });

      const event = new TransactionCreatedEventV1({
        eventId,
        transactionId,
        sourceWalletId: command.sourceWalletId,
        destinationWalletId: command.destinationWalletId,
        amount: command.amount,
        type: command.type,
        status: finalStatus,
        linkedEventId: command.linkedEventId,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`TransactionCreatedEvent-V1 emitted: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish(NatsSubjects.Transaction.CREATED_V1, event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return transactionId;
    } catch (error) {
      this.logger.error(`Transaction failed: ${(error as Error).message}`, (error as Error).stack);

      if (error instanceof NotFoundException || error instanceof InsufficientFundsException) {
        throw error;
      }

      throw new TransactionFailedException(transactionId, (error as Error).message);
    }
  }
}
