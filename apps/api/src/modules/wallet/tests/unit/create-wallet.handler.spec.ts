import { Test, TestingModule } from '@nestjs/testing';
import { EventBus, CqrsModule } from '@nestjs/cqrs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateWalletCommand } from '../../commands/create-wallet.command';
import { CreateWalletCommandHandler } from '../../handlers/create-wallet.handler';
import { WalletEntity } from '../../entities/wallet.entity';
import { WalletType, OwnerType } from '../../dto/wallet.enums';

// Mock EventBusService
const mockEventBusService = {
  publish: jest.fn().mockResolvedValue(undefined),
};

describe('CreateWalletCommandHandler', () => {
  let handler: CreateWalletCommandHandler;
  let repository: Repository<WalletEntity>;
  let eventBus: EventBus;

  const mockRepository = {
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CreateWalletCommandHandler,
        {
          provide: getRepositoryToken(WalletEntity),
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: 'EventBusService',
          useValue: mockEventBusService,
        },
      ],
    }).compile();

    handler = module.get<CreateWalletCommandHandler>(CreateWalletCommandHandler);
    repository = module.get<Repository<WalletEntity>>(getRepositoryToken(WalletEntity));
    eventBus = module.get<EventBus>(EventBus);

    jest.clearAllMocks();
  });

  // ==================== Normal Use Cases ====================

  describe('execute', () => {
    it('should create a new escrow wallet for an actor', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'actor-123',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should create a new workspace wallet', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'workspace-456',
        ownerType: OwnerType.Workspace,
        type: WalletType.Incentive,
        currency: 'USD',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should create a settlement wallet for organization', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'org-789',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);

      expect(result).toBeDefined();
    });

    it('should create an incentive wallet with KES currency', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'workspace-001',
        ownerType: OwnerType.Workspace,
        type: WalletType.Incentive,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      const savedEntity = mockRepository.save.mock.calls[0][0];
      expect(savedEntity.ownerId).toBe('workspace-001');
      expect(savedEntity.type).toBe(WalletType.Incentive);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle database save failure', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'actor-fail',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    });

    it('should handle all supported currencies', async () => {
      const currencies = ['KES', 'USD', 'UGX', 'TZS', 'EUR', 'GBP'];
      
      for (const currency of currencies) {
        const command = new CreateWalletCommand({
          ownerId: `owner-${currency}`,
          ownerType: OwnerType.Actor,
          type: WalletType.Escrow,
          currency,
        });

        mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));
        const result = await handler.execute(command);
        expect(result).toBeDefined();
      }
    });

    it('should handle all owner types', async () => {
      const ownerTypes = [
        OwnerType.Organization,
        OwnerType.Workspace,
        OwnerType.Actor,
      ];

      for (const ownerType of ownerTypes) {
        const command = new CreateWalletCommand({
          ownerId: `owner-${ownerType}`,
          ownerType,
          type: WalletType.Escrow,
          currency: 'KES',
        });

        mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));
        const result = await handler.execute(command);
        expect(result).toBeDefined();
      }
    });

    it('should handle all wallet types', async () => {
      const walletTypes = [WalletType.Escrow, WalletType.Incentive, WalletType.Settlement];

      for (const walletType of walletTypes) {
        const command = new CreateWalletCommand({
          ownerId: 'owner-wallet-type',
          ownerType: OwnerType.Organization,
          type: walletType,
          currency: 'KES',
        });

        mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));
        const result = await handler.execute(command);
        expect(result).toBeDefined();
      }
    });

    it('should generate unique wallet IDs for concurrent requests', async () => {
      const commands = Array.from({ length: 10 }, (_, i) => new CreateWalletCommand({
        ownerId: `owner-concurrent-${i}`,
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      }));

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const results = await Promise.all(commands.map((cmd) => handler.execute(cmd)));

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(10);
    });

    it('should handle empty owner ID edge case', async () => {
      const command = new CreateWalletCommand({
        ownerId: '',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);
      expect(result).toBeDefined();
    });

    it('should handle very long owner IDs', async () => {
      const longId = 'a'.repeat(500);
      const command = new CreateWalletCommand({
        ownerId: longId,
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);
      expect(result).toBeDefined();
    });
  });

  // ==================== Complex Use Cases ====================

  describe('Complex Use Cases', () => {
    it('should handle rapid wallet creation by same owner with different types', async () => {
      const walletTypes = [WalletType.Escrow, WalletType.Incentive, WalletType.Settlement];
      
      for (const type of walletTypes) {
        const command = new CreateWalletCommand({
          ownerId: 'org-complex',
          ownerType: OwnerType.Organization,
          type,
          currency: 'KES',
        });

        mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));
        const result = await handler.execute(command);
        expect(result).toBeDefined();
      }
    });

    it('should handle multi-currency wallet creation for same organization', async () => {
      const currencies = ['KES', 'USD', 'UGX'];
      
      for (const currency of currencies) {
        const command = new CreateWalletCommand({
          ownerId: 'multi-currency-org',
          ownerType: OwnerType.Organization,
          type: WalletType.Settlement,
          currency,
        });

        mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));
        const result = await handler.execute(command);
        expect(result).toBeDefined();
      }
    });

    it('should handle bulk wallet creation', async () => {
      const bulkCommands = Array.from({ length: 50 }, (_, i) => new CreateWalletCommand({
        ownerId: `bulk-owner-${i}`,
        ownerType: i % 2 === 0 ? OwnerType.Actor : OwnerType.Workspace,
        type: WalletType.Escrow,
        currency: 'KES',
      }));

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const results = await Promise.all(bulkCommands.map((cmd) => handler.execute(cmd)));

      expect(results.length).toBe(50);
      expect(mockRepository.save).toHaveBeenCalledTimes(50);
    });

    it('should publish events correctly for settlement wallets', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'settlement-org',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      await handler.execute(command);

      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  // ==================== Tier-Specific Tests ====================

  describe('Tier-Specific Tests (Free/Basic/Pro)', () => {
    // Free Tier - Basic actor wallet
    it('should create Free tier actor escrow wallet', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'free-actor-1',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    // Basic Tier - Workspace wallet
    it('should create Basic tier workspace incentive wallet', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'basic-workspace-1',
        ownerType: OwnerType.Workspace,
        type: WalletType.Incentive,
        currency: 'USD',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);

      expect(result).toBeDefined();
    });

    // Pro Tier - Organization settlement wallet
    it('should create Pro tier organization settlement wallet', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'pro-org-1',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await handler.execute(command);

      expect(result).toBeDefined();
    });

    // Pro Tier - Multi-currency
    it('should support Pro tier multi-currency wallets', async () => {
      const currencies = ['KES', 'USD', 'UGX', 'TZS'];
      
      for (const currency of currencies) {
        const command = new CreateWalletCommand({
          ownerId: 'pro-multi-currency',
          ownerType: OwnerType.Organization,
          type: WalletType.Settlement,
          currency,
        });

        mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));
        const result = await handler.execute(command);
        expect(result).toBeDefined();
      }
    });

    // Pro Tier - High balance wallet
    it('should support Pro tier high balance wallets', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'pro-high-balance',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
      });

      mockRepository.save.mockImplementation((entity) => {
        entity.balance = '10000000.00';
        return Promise.resolve(entity);
      });

      const result = await handler.execute(command);
      expect(result).toBeDefined();
    });
  });

  // ==================== Error Handling ====================

  describe('Error Handling', () => {
    it('should handle duplicate owner ID gracefully', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'duplicate-owner',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save
        .mockRejectedValueOnce(new Error('duplicate key value'))
        .mockImplementationOnce((entity) => Promise.resolve(entity));

      await expect(handler.execute(command)).rejects.toThrow();
    });

    it('should handle network timeout', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'timeout-owner',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save.mockRejectedValue(new Error('Connection timeout'));

      await expect(handler.execute(command)).rejects.toThrow('Connection timeout');
    });

    it('should propagate database constraint errors', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'constraint-owner',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
      });

      mockRepository.save.mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

      await expect(handler.execute(command)).rejects.toThrow('FOREIGN KEY constraint failed');
    });
  });
});
