import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { WalletEntity } from '../../../wallet/entities/wallet.entity';
import { InsufficientFundsException } from '../../../wallet/exceptions/insufficient-funds.exception';
import { CreateTransactionCommand } from '../../commands/create-transaction.command';
import { TransactionStatus, TransactionType } from '../../dto/transaction.enums';
import { TransactionEntity } from '../../entities/transaction.entity';
import { TransactionCreatedEventV1 } from '../../events/transaction-created.event';
import { CreateTransactionCommandHandler } from '../../handlers/create-transaction.handler';

describe('CreateTransactionCommandHandler', () => {
  let handler: CreateTransactionCommandHandler;
  let dataSource: jest.Mocked<DataSource>;
  let entityManager: jest.Mocked<EntityManager>;
  let walletRepository: jest.Mocked<Repository<WalletEntity>>;
  let transactionRepository: jest.Mocked<Repository<TransactionEntity>>;
  let eventBus: jest.Mocked<EventBus>;
  let savedTransactions: TransactionEntity[];
  let savedWallets: WalletEntity[];

  const buildCommand = (): CreateTransactionCommand =>
    new CreateTransactionCommand({
      sourceWalletId: '123e4567-e89b-12d3-a456-426614174001',
      destinationWalletId: '123e4567-e89b-12d3-a456-426614174002',
      amount: 50,
      type: TransactionType.Settlement,
      linkedEventId: 'linked-event-123',
    });

  beforeEach(() => {
    walletRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<WalletEntity>>;

    transactionRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<TransactionEntity>>;

    entityManager = {
      getRepository: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    entityManager.getRepository.mockImplementation((entity) => {
      if (entity === WalletEntity) {
        return walletRepository;
      }

      if (entity === TransactionEntity) {
        return transactionRepository;
      }

      throw new Error(`Unexpected repository request for entity: ${entity}`);
    });

    const transactionFn = jest.fn(
      async (runInTransaction: (manager: EntityManager) => Promise<unknown>) =>
        runInTransaction(entityManager)
    );

    dataSource = {
      transaction: transactionFn,
    } as unknown as jest.Mocked<DataSource>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    savedTransactions = [];
    savedWallets = [];

    transactionRepository.save.mockImplementation(async (entity) => {
      savedTransactions.push({ ...entity } as TransactionEntity);
      return entity as TransactionEntity;
    });
    walletRepository.save.mockImplementation(async (entity) => {
      savedWallets.push({ ...entity } as WalletEntity);
      return entity as WalletEntity;
    });

    handler = new CreateTransactionCommandHandler(dataSource, eventBus, undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should complete transaction and emit TransactionCreatedEventV1', async () => {
    const command = buildCommand();

    const sourceWallet = {
      id: command.sourceWalletId,
      balance: '100.00',
    } as WalletEntity;

    const destinationWallet = {
      id: command.destinationWalletId,
      balance: '70.00',
    } as WalletEntity;

    walletRepository.findOne
      .mockResolvedValueOnce(sourceWallet)
      .mockResolvedValueOnce(destinationWallet);

    const transactionId = await handler.execute(command);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionRepository.save).toHaveBeenCalledTimes(2);
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0].status).toBe(TransactionStatus.Pending);
    expect(savedTransactions[1].status).toBe(TransactionStatus.Completed);

    expect(walletRepository.save).toHaveBeenCalledTimes(2);
    expect(savedWallets).toHaveLength(2);
    const debitedWallet = savedWallets.find((wallet) => wallet.id === command.sourceWalletId);
    const creditedWallet = savedWallets.find((wallet) => wallet.id === command.destinationWalletId);

    expect(debitedWallet).toBeDefined();
    expect(creditedWallet).toBeDefined();
    expect((debitedWallet as WalletEntity).balance).toBe('50.00');
    expect((creditedWallet as WalletEntity).balance).toBe('120.00');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const emittedEvent = eventBus.publish.mock.calls[0][0] as TransactionCreatedEventV1;

    expect(emittedEvent).toBeInstanceOf(TransactionCreatedEventV1);
    expect(emittedEvent.sourceWalletId).toBe(command.sourceWalletId);
    expect(emittedEvent.destinationWalletId).toBe(command.destinationWalletId);
    expect(emittedEvent.amount).toBe(command.amount);
    expect(emittedEvent.status).toBe(TransactionStatus.Completed);
    expect(emittedEvent.transactionId).toBe(transactionId);
    expect(transactionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should throw NotFoundException when source wallet is missing', async () => {
    const command = buildCommand();

    walletRepository.findOne.mockResolvedValueOnce(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(walletRepository.findOne).toHaveBeenCalledTimes(1);
    expect(transactionRepository.save).not.toHaveBeenCalled();
    expect(walletRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when destination wallet is missing', async () => {
    const command = buildCommand();

    const sourceWallet = {
      id: command.sourceWalletId,
      balance: '100.00',
    } as WalletEntity;

    walletRepository.findOne.mockResolvedValueOnce(sourceWallet).mockResolvedValueOnce(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(walletRepository.findOne).toHaveBeenCalledTimes(2);
    expect(transactionRepository.save).not.toHaveBeenCalled();
    expect(walletRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw InsufficientFundsException when source balance is too low', async () => {
    const command = buildCommand();

    const sourceWallet = {
      id: command.sourceWalletId,
      balance: '30.00',
    } as WalletEntity;

    const destinationWallet = {
      id: command.destinationWalletId,
      balance: '10.00',
    } as WalletEntity;

    walletRepository.findOne
      .mockResolvedValueOnce(sourceWallet)
      .mockResolvedValueOnce(destinationWallet);

    await expect(handler.execute(command)).rejects.toThrow(InsufficientFundsException);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(walletRepository.findOne).toHaveBeenCalledTimes(2);
    expect(transactionRepository.save).not.toHaveBeenCalled();
    expect(walletRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
