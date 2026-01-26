import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CreateWalletCommand } from '../../commands/create-wallet.command';
import { CreditWalletCommand } from '../../commands/credit-wallet.command';
import { DebitWalletCommand } from '../../commands/debit-wallet.command';
import { WalletCreatedEventV1 } from '../../events/wallet-created.event';
import { WalletCreditedEventV1 } from '../../events/wallet-credited.event';
import { WalletDebitedEventV1 } from '../../events/wallet-debited.event';
import { CreateWalletCommandHandler } from '../../handlers/create-wallet.handler';
import { CreditWalletCommandHandler } from '../../handlers/credit-wallet.handler';
import { DebitWalletCommandHandler } from '../../handlers/debit-wallet.handler';
import { WalletEntity } from '../../entities/wallet.entity';
import { WalletType, OwnerType } from '../../dto/wallet.enums';
import { InsufficientFundsException } from '../../exceptions/insufficient-funds.exception';

type WalletEvent = WalletCreatedEventV1 | WalletCreditedEventV1 | WalletDebitedEventV1;

/**
 * Integration Tests: Wallet Commands End-to-End
 */
describe('Wallet Integration Tests', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let eventBus: EventBus;
  let walletRepository: Repository<WalletEntity>;
  let emittedEvents: WalletEvent[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CqrsModule,
        TypeOrmModule.forFeature([WalletEntity]),
      ],
      providers: [
        CreateWalletCommandHandler,
        CreditWalletCommandHandler,
        DebitWalletCommandHandler,
      ],
    }).compile();

    commandBus = module.get<CommandBus>(CommandBus);
    eventBus = module.get<EventBus>(EventBus);
    walletRepository = module.get<Repository<WalletEntity>>(
      getRepositoryToken(WalletEntity),
    );

    eventBus.subscribe((event) => {
      if (
        event instanceof WalletCreatedEventV1 ||
        event instanceof WalletCreditedEventV1 ||
        event instanceof WalletDebitedEventV1
      ) {
        emittedEvents.push(event);
      }
    });

    commandBus.register([
      CreateWalletCommandHandler,
      CreditWalletCommandHandler,
      DebitWalletCommandHandler,
    ]);
  });

  afterEach(async () => {
    emittedEvents = [];
    await walletRepository.delete({});
  });

  afterAll(async () => {
    await module.close();
  });

  describe('CreateWalletCommand', () => {
    it('should create wallet with zero balance', async () => {
      const command = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Organization,
        type: WalletType.Escrow,
        currency: 'USD',
      });

      const walletId = await commandBus.execute(command);

      expect(walletId).toBeDefined();
      expect(typeof walletId).toBe('string');

      const savedWallet = await walletRepository.findOne({
        where: { id: walletId },
      });
      expect(savedWallet).toBeDefined();
      expect(savedWallet?.ownerId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(savedWallet?.ownerType).toBe(OwnerType.Organization);
      expect(savedWallet?.type).toBe(WalletType.Escrow);
      expect(savedWallet?.currency).toBe('USD');
      expect(parseFloat(savedWallet?.balance || '0')).toBe(0);

      expect(emittedEvents.length).toBe(1);
      const event = emittedEvents[0] as WalletCreatedEventV1;
      expect(event.eventType).toBe('WalletCreatedEvent-V1');
      expect(event.walletId).toBe(walletId);
    });

    it('should create wallets for all owner types', async () => {
      const ownerTypes = [OwnerType.Actor, OwnerType.Workspace, OwnerType.Organization];

      for (const ownerType of ownerTypes) {
        const command = new CreateWalletCommand({
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType,
          type: WalletType.Incentive,
          currency: 'KES',
        });

        const walletId = await commandBus.execute(command);
        const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
        expect(savedWallet?.ownerType).toBe(ownerType);
      }
    });

    it('should create wallets for all wallet types', async () => {
      const walletTypes = [WalletType.Escrow, WalletType.Incentive, WalletType.Settlement];

      for (const type of walletTypes) {
        const command = new CreateWalletCommand({
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          type,
          currency: 'EUR',
        });

        const walletId = await commandBus.execute(command);
        const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
        expect(savedWallet?.type).toBe(type);
      }
    });
  });

  describe('CreditWalletCommand', () => {
    let walletId: string;

    beforeEach(async () => {
      const createCommand = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Organization,
        type: WalletType.Escrow,
        currency: 'USD',
      });
      walletId = await commandBus.execute(createCommand);
      emittedEvents = [];
    });

    it('should credit wallet and update balance', async () => {
      const command = new CreditWalletCommand({
        walletId,
        amount: 100.50,
        reference: 'DEPOSIT-001',
      });

      const newBalance = await commandBus.execute(command);

      expect(newBalance).toBe(100.50);

      const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
      expect(parseFloat(savedWallet?.balance || '0')).toBe(100.50);

      expect(emittedEvents.length).toBe(1);
      const event = emittedEvents[0] as WalletCreditedEventV1;
      expect(event.eventType).toBe('WalletCreditedEvent-V1');
      expect(event.walletId).toBe(walletId);
      expect(event.amount).toBe(100.50);
      expect(event.newBalance).toBe(100.50);
      expect(event.reference).toBe('DEPOSIT-001');
    });

    it('should accumulate multiple credits', async () => {
      await commandBus.execute(new CreditWalletCommand({ walletId, amount: 50 }));
      await commandBus.execute(new CreditWalletCommand({ walletId, amount: 30 }));
      const finalBalance = await commandBus.execute(
        new CreditWalletCommand({ walletId, amount: 20 }),
      );

      expect(finalBalance).toBe(100);

      const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
      expect(parseFloat(savedWallet?.balance || '0')).toBe(100);
    });

    it('should throw NotFoundException for non-existent wallet', async () => {
      const command = new CreditWalletCommand({
        walletId: '550e8400-e29b-41d4-a716-446655440999',
        amount: 100,
      });

      await expect(commandBus.execute(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('DebitWalletCommand', () => {
    let walletId: string;

    beforeEach(async () => {
      const createCommand = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Actor,
        type: WalletType.Settlement,
        currency: 'KES',
      });
      walletId = await commandBus.execute(createCommand);

      await commandBus.execute(new CreditWalletCommand({ walletId, amount: 200 }));
      emittedEvents = [];
    });

    it('should debit wallet and update balance', async () => {
      const command = new DebitWalletCommand({
        walletId,
        amount: 75.50,
        reference: 'WITHDRAWAL-001',
      });

      const newBalance = await commandBus.execute(command);

      expect(newBalance).toBe(124.50);

      const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
      expect(parseFloat(savedWallet?.balance || '0')).toBe(124.50);

      expect(emittedEvents.length).toBe(1);
      const event = emittedEvents[0] as WalletDebitedEventV1;
      expect(event.eventType).toBe('WalletDebitedEvent-V1');
      expect(event.walletId).toBe(walletId);
      expect(event.amount).toBe(75.50);
      expect(event.newBalance).toBe(124.50);
      expect(event.reference).toBe('WITHDRAWAL-001');
    });

    it('should allow debit of exact balance', async () => {
      const newBalance = await commandBus.execute(
        new DebitWalletCommand({ walletId, amount: 200 }),
      );

      expect(newBalance).toBe(0);

      const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
      expect(parseFloat(savedWallet?.balance || '0')).toBe(0);
    });

    it('should throw InsufficientFundsException when amount exceeds balance', async () => {
      const command = new DebitWalletCommand({
        walletId,
        amount: 250,
        reference: 'OVERDRAFT-ATTEMPT',
      });

      await expect(commandBus.execute(command)).rejects.toThrow(InsufficientFundsException);

      const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
      expect(parseFloat(savedWallet?.balance || '0')).toBe(200);

      expect(emittedEvents.length).toBe(0);
    });

    it('should throw NotFoundException for non-existent wallet', async () => {
      const command = new DebitWalletCommand({
        walletId: '550e8400-e29b-41d4-a716-446655440999',
        amount: 50,
      });

      await expect(commandBus.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should handle multiple debits correctly', async () => {
      await commandBus.execute(new DebitWalletCommand({ walletId, amount: 50 }));
      await commandBus.execute(new DebitWalletCommand({ walletId, amount: 30 }));
      const finalBalance = await commandBus.execute(
        new DebitWalletCommand({ walletId, amount: 20 }),
      );

      expect(finalBalance).toBe(100);
    });
  });

  describe('Complete Wallet Flow', () => {
    it('should handle create -> credit -> debit flow', async () => {
      const createCommand = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Workspace,
        type: WalletType.Incentive,
        currency: 'NGN',
      });

      const walletId = await commandBus.execute(createCommand);
      emittedEvents = [];

      await commandBus.execute(new CreditWalletCommand({ walletId, amount: 1000 }));
      await commandBus.execute(new DebitWalletCommand({ walletId, amount: 250 }));
      await commandBus.execute(new CreditWalletCommand({ walletId, amount: 500 }));
      const finalBalance = await commandBus.execute(
        new DebitWalletCommand({ walletId, amount: 300 }),
      );

      expect(finalBalance).toBe(950);

      const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
      expect(parseFloat(savedWallet?.balance || '0')).toBe(950);

      expect(emittedEvents.length).toBe(4);
    });

    it('should reject overdraft after multiple operations', async () => {
      const createCommand = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'USD',
      });

      const walletId = await commandBus.execute(createCommand);

      await commandBus.execute(new CreditWalletCommand({ walletId, amount: 100 }));
      await commandBus.execute(new DebitWalletCommand({ walletId, amount: 60 }));

      await expect(
        commandBus.execute(new DebitWalletCommand({ walletId, amount: 50 })),
      ).rejects.toThrow(InsufficientFundsException);

      const savedWallet = await walletRepository.findOne({ where: { id: walletId } });
      expect(parseFloat(savedWallet?.balance || '0')).toBe(40);
    });
  });

  describe('Event Serialization', () => {
    it('should serialize and deserialize WalletCreatedEvent correctly', async () => {
      const command = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Organization,
        type: WalletType.Escrow,
        currency: 'USD',
      });

      await commandBus.execute(command);
      const originalEvent = emittedEvents[0] as WalletCreatedEventV1;
      const serialized = originalEvent.toJSON();
      const deserialized = WalletCreatedEventV1.fromJSON(serialized);

      expect(deserialized.walletId).toBe(originalEvent.walletId);
      expect(deserialized.ownerId).toBe(originalEvent.ownerId);
      expect(deserialized.ownerType).toBe(originalEvent.ownerType);
      expect(deserialized.type).toBe(originalEvent.type);
      expect(deserialized.currency).toBe(originalEvent.currency);
    });

    it('should serialize and deserialize WalletCreditedEvent correctly', async () => {
      const createCommand = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Actor,
        type: WalletType.Incentive,
        currency: 'KES',
      });
      const walletId = await commandBus.execute(createCommand);
      emittedEvents = [];

      await commandBus.execute(
        new CreditWalletCommand({ walletId, amount: 100, reference: 'TEST' }),
      );
      const originalEvent = emittedEvents[0] as WalletCreditedEventV1;
      const serialized = originalEvent.toJSON();
      const deserialized = WalletCreditedEventV1.fromJSON(serialized);

      expect(deserialized.walletId).toBe(originalEvent.walletId);
      expect(deserialized.amount).toBe(originalEvent.amount);
      expect(deserialized.newBalance).toBe(originalEvent.newBalance);
      expect(deserialized.reference).toBe(originalEvent.reference);
    });

    it('should serialize and deserialize WalletDebitedEvent correctly', async () => {
      const createCommand = new CreateWalletCommand({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerType: OwnerType.Workspace,
        type: WalletType.Settlement,
        currency: 'EUR',
      });
      const walletId = await commandBus.execute(createCommand);
      await commandBus.execute(new CreditWalletCommand({ walletId, amount: 500 }));
      emittedEvents = [];

      await commandBus.execute(
        new DebitWalletCommand({ walletId, amount: 150, reference: 'WITHDRAW' }),
      );
      const originalEvent = emittedEvents[0] as WalletDebitedEventV1;
      const serialized = originalEvent.toJSON();
      const deserialized = WalletDebitedEventV1.fromJSON(serialized);

      expect(deserialized.walletId).toBe(originalEvent.walletId);
      expect(deserialized.amount).toBe(originalEvent.amount);
      expect(deserialized.newBalance).toBe(originalEvent.newBalance);
      expect(deserialized.reference).toBe(originalEvent.reference);
    });
  });
});
