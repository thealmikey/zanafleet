import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CreateTransactionCommand } from '../../commands/create-transaction.command';
import { TransactionCreatedEventV1 } from '../../events/transaction-created.event';
import { CreateTransactionCommandHandler } from '../../handlers/create-transaction.handler';
import { TransactionEntity } from '../../entities/transaction.entity';
import { TransactionType, TransactionStatus } from '../../dto/transaction.enums';
import { WalletEntity } from '../../../wallet/entities/wallet.entity';
import { WalletType, OwnerType } from '../../../wallet/dto/wallet.enums';
import { InsufficientFundsException } from '../../../wallet/exceptions/insufficient-funds.exception';

/**
 * Integration Tests: CreateTransactionCommand End-to-End
 *
 * Test flow:
 * 1. Create source and destination wallets with balances
 * 2. Execute transaction command
 * 3. Verify atomicity: both wallets updated or neither
 * 4. Verify event emission
 * 5. Test error scenarios: insufficient funds, non-existent wallets
 */
describe('CreateTransactionCommand Integration Tests', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let eventBus: EventBus;
  let transactionRepository: Repository<TransactionEntity>;
  let walletRepository: Repository<WalletEntity>;
  let emittedEvents: TransactionCreatedEventV1[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CqrsModule,
        TypeOrmModule.forFeature([TransactionEntity, WalletEntity]),
      ],
      providers: [
        CreateTransactionCommandHandler,
      ],
    }).compile();

    commandBus = module.get<CommandBus>(CommandBus);
    eventBus = module.get<EventBus>(EventBus);
    transactionRepository = module.get<Repository<TransactionEntity>>(
      getRepositoryToken(TransactionEntity),
    );
    walletRepository = module.get<Repository<WalletEntity>>(
      getRepositoryToken(WalletEntity),
    );

    eventBus.subscribe((event) => {
      if (event instanceof TransactionCreatedEventV1) {
        emittedEvents.push(event);
      }
    });

    commandBus.register([CreateTransactionCommandHandler]);
  });

  afterEach(async () => {
    emittedEvents = [];
    await transactionRepository.delete({});
    await walletRepository.delete({});
  });

  afterAll(async () => {
    await module.close();
  });

  async function createWallet(
    id: string,
    balance: number,
  ): Promise<WalletEntity> {
    const wallet = WalletEntity.fromDomain({
      walletId: id,
      ownerId: '550e8400-e29b-41d4-a716-446655440999',
      ownerType: OwnerType.Organization,
      type: WalletType.Escrow,
      currency: 'USD',
      balance,
      createdAt: new Date(),
    });
    return walletRepository.save(wallet);
  }

  describe('Successful Transaction', () => {
    it('should transfer funds between wallets atomically', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440001';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440002';

      await createWallet(sourceWalletId, 500);
      await createWallet(destWalletId, 100);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 150,
        type: TransactionType.Settlement,
      });

      const transactionId = await commandBus.execute(command);

      expect(transactionId).toBeDefined();
      expect(typeof transactionId).toBe('string');

      const sourceWallet = await walletRepository.findOne({
        where: { id: sourceWalletId },
      });
      const destWallet = await walletRepository.findOne({
        where: { id: destWalletId },
      });

      expect(parseFloat(sourceWallet?.balance || '0')).toBe(350);
      expect(parseFloat(destWallet?.balance || '0')).toBe(250);

      const transaction = await transactionRepository.findOne({
        where: { id: transactionId },
      });
      expect(transaction).toBeDefined();
      expect(transaction?.status).toBe(TransactionStatus.Completed);
      expect(parseFloat(transaction?.amount || '0')).toBe(150);

      expect(emittedEvents.length).toBe(1);
      const event = emittedEvents[0];
      expect(event.transactionId).toBe(transactionId);
      expect(event.status).toBe(TransactionStatus.Completed);
      expect(event.amount).toBe(150);
    });

    it('should transfer exact balance (zero remaining)', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440003';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440004';

      await createWallet(sourceWalletId, 200);
      await createWallet(destWalletId, 0);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 200,
        type: TransactionType.Reward,
      });

      const transactionId = await commandBus.execute(command);

      const sourceWallet = await walletRepository.findOne({
        where: { id: sourceWalletId },
      });
      const destWallet = await walletRepository.findOne({
        where: { id: destWalletId },
      });

      expect(parseFloat(sourceWallet?.balance || '0')).toBe(0);
      expect(parseFloat(destWallet?.balance || '0')).toBe(200);

      const transaction = await transactionRepository.findOne({
        where: { id: transactionId },
      });
      expect(transaction?.status).toBe(TransactionStatus.Completed);
    });

    it('should include linkedEventId when provided', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440005';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440006';
      const linkedEventId = '550e8400-e29b-41d4-a716-446655440099';

      await createWallet(sourceWalletId, 100);
      await createWallet(destWalletId, 0);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 50,
        type: TransactionType.Fee,
        linkedEventId,
      });

      const transactionId = await commandBus.execute(command);

      const transaction = await transactionRepository.findOne({
        where: { id: transactionId },
      });
      expect(transaction?.linkedEventId).toBe(linkedEventId);

      const event = emittedEvents[0];
      expect(event.linkedEventId).toBe(linkedEventId);
    });

    it('should handle all transaction types', async () => {
      const types = [
        TransactionType.Settlement,
        TransactionType.Reward,
        TransactionType.Fee,
        TransactionType.Penalty,
      ];

      for (let i = 0; i < types.length; i++) {
        const sourceWalletId = `550e8400-e29b-41d4-a716-44665544001${i}`;
        const destWalletId = `550e8400-e29b-41d4-a716-44665544002${i}`;

        await createWallet(sourceWalletId, 100);
        await createWallet(destWalletId, 0);

        const command = new CreateTransactionCommand({
          sourceWalletId,
          destinationWalletId: destWalletId,
          amount: 10,
          type: types[i],
        });

        const transactionId = await commandBus.execute(command);

        const transaction = await transactionRepository.findOne({
          where: { id: transactionId },
        });
        expect(transaction?.type).toBe(types[i]);
      }
    });
  });

  describe('Insufficient Funds', () => {
    it('should reject transaction when source has insufficient funds', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440030';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440031';

      await createWallet(sourceWalletId, 50);
      await createWallet(destWalletId, 100);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 100,
        type: TransactionType.Settlement,
      });

      await expect(commandBus.execute(command)).rejects.toThrow(
        InsufficientFundsException,
      );

      const sourceWallet = await walletRepository.findOne({
        where: { id: sourceWalletId },
      });
      const destWallet = await walletRepository.findOne({
        where: { id: destWalletId },
      });

      expect(parseFloat(sourceWallet?.balance || '0')).toBe(50);
      expect(parseFloat(destWallet?.balance || '0')).toBe(100);

      expect(emittedEvents.length).toBe(0);
    });

    it('should reject transaction when source balance is zero', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440032';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440033';

      await createWallet(sourceWalletId, 0);
      await createWallet(destWalletId, 100);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 10,
        type: TransactionType.Penalty,
      });

      await expect(commandBus.execute(command)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(emittedEvents.length).toBe(0);
    });
  });

  describe('Non-Existent Wallets', () => {
    it('should reject transaction when source wallet does not exist', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440040';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440041';

      await createWallet(destWalletId, 100);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 50,
        type: TransactionType.Settlement,
      });

      await expect(commandBus.execute(command)).rejects.toThrow(NotFoundException);
      await expect(commandBus.execute(command)).rejects.toThrow(
        `Source wallet with ID ${sourceWalletId} not found`,
      );

      const destWallet = await walletRepository.findOne({
        where: { id: destWalletId },
      });
      expect(parseFloat(destWallet?.balance || '0')).toBe(100);

      expect(emittedEvents.length).toBe(0);
    });

    it('should reject transaction when destination wallet does not exist', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440042';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440043';

      await createWallet(sourceWalletId, 200);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 50,
        type: TransactionType.Reward,
      });

      await expect(commandBus.execute(command)).rejects.toThrow(NotFoundException);
      await expect(commandBus.execute(command)).rejects.toThrow(
        `Destination wallet with ID ${destWalletId} not found`,
      );

      const sourceWallet = await walletRepository.findOne({
        where: { id: sourceWalletId },
      });
      expect(parseFloat(sourceWallet?.balance || '0')).toBe(200);

      expect(emittedEvents.length).toBe(0);
    });
  });

  describe('Event Metadata', () => {
    it('should emit event with correct metadata', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440050';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440051';

      await createWallet(sourceWalletId, 100);
      await createWallet(destWalletId, 0);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 25,
        type: TransactionType.Fee,
      });

      const transactionId = await commandBus.execute(command);

      const event = emittedEvents[0];
      expect(event.eventId).toBeDefined();
      expect(event.aggregateId).toBe(transactionId);
      expect(event.aggregateType).toBe('Transaction');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.eventType).toBe('TransactionCreatedEvent-V1');
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should serialize and deserialize event correctly', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440052';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440053';
      const linkedEventId = '550e8400-e29b-41d4-a716-446655440054';

      await createWallet(sourceWalletId, 500);
      await createWallet(destWalletId, 0);

      const command = new CreateTransactionCommand({
        sourceWalletId,
        destinationWalletId: destWalletId,
        amount: 100,
        type: TransactionType.Settlement,
        linkedEventId,
      });

      await commandBus.execute(command);

      const originalEvent = emittedEvents[0];
      const serialized = originalEvent.toJSON();
      const deserialized = TransactionCreatedEventV1.fromJSON(serialized);

      expect(deserialized.transactionId).toBe(originalEvent.transactionId);
      expect(deserialized.sourceWalletId).toBe(originalEvent.sourceWalletId);
      expect(deserialized.destinationWalletId).toBe(originalEvent.destinationWalletId);
      expect(deserialized.amount).toBe(originalEvent.amount);
      expect(deserialized.type).toBe(originalEvent.type);
      expect(deserialized.status).toBe(originalEvent.status);
      expect(deserialized.linkedEventId).toBe(originalEvent.linkedEventId);
      expect(deserialized.eventType).toBe('TransactionCreatedEvent-V1');
    });
  });

  describe('Multiple Transactions', () => {
    it('should handle multiple sequential transactions correctly', async () => {
      const walletA = '550e8400-e29b-41d4-a716-446655440060';
      const walletB = '550e8400-e29b-41d4-a716-446655440061';

      await createWallet(walletA, 1000);
      await createWallet(walletB, 500);

      await commandBus.execute(
        new CreateTransactionCommand({
          sourceWalletId: walletA,
          destinationWalletId: walletB,
          amount: 200,
          type: TransactionType.Settlement,
        }),
      );

      await commandBus.execute(
        new CreateTransactionCommand({
          sourceWalletId: walletB,
          destinationWalletId: walletA,
          amount: 100,
          type: TransactionType.Reward,
        }),
      );

      await commandBus.execute(
        new CreateTransactionCommand({
          sourceWalletId: walletA,
          destinationWalletId: walletB,
          amount: 50,
          type: TransactionType.Fee,
        }),
      );

      const walletAFinal = await walletRepository.findOne({
        where: { id: walletA },
      });
      const walletBFinal = await walletRepository.findOne({
        where: { id: walletB },
      });

      expect(parseFloat(walletAFinal?.balance || '0')).toBe(850);
      expect(parseFloat(walletBFinal?.balance || '0')).toBe(650);

      expect(emittedEvents.length).toBe(3);
    });

    it('should create unique transaction IDs', async () => {
      const sourceWalletId = '550e8400-e29b-41d4-a716-446655440070';
      const destWalletId = '550e8400-e29b-41d4-a716-446655440071';

      await createWallet(sourceWalletId, 1000);
      await createWallet(destWalletId, 0);

      const id1 = await commandBus.execute(
        new CreateTransactionCommand({
          sourceWalletId,
          destinationWalletId: destWalletId,
          amount: 10,
          type: TransactionType.Settlement,
        }),
      );

      const id2 = await commandBus.execute(
        new CreateTransactionCommand({
          sourceWalletId,
          destinationWalletId: destWalletId,
          amount: 10,
          type: TransactionType.Settlement,
        }),
      );

      expect(id1).not.toBe(id2);
    });
  });
});
