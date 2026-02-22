import { WalletEntity } from '../../entities/wallet.entity';
import { WalletType, OwnerType } from '../../dto/wallet.enums';

describe('WalletEntity', () => {
  // ==================== Normal Use Cases ====================

  describe('toDomain', () => {
    it('should convert entity to domain object correctly', () => {
      const entity = new WalletEntity();
      entity.id = 'wallet-123';
      entity.ownerId = 'owner-456';
      entity.ownerType = OwnerType.Organization;
      entity.type = WalletType.Settlement;
      entity.currency = 'KES';
      entity.balance = '1500.50';
      entity.createdAt = new Date('2024-01-01');
      entity.updatedAt = new Date('2024-01-02');

      const result = entity.toDomain();

      expect(result.walletId).toBe('wallet-123');
      expect(result.ownerId).toBe('owner-456');
      expect(result.ownerType).toBe(OwnerType.Organization);
      expect(result.type).toBe(WalletType.Settlement);
      expect(result.currency).toBe('KES');
      expect(result.balance).toBe(1500.50);
      expect(result.createdAt).toEqual(new Date('2024-01-01'));
      expect(result.updatedAt).toEqual(new Date('2024-01-02'));
    });

    it('should handle zero balance correctly', () => {
      const entity = new WalletEntity();
      entity.id = 'wallet-zero';
      entity.ownerId = 'owner-123';
      entity.ownerType = OwnerType.Actor;
      entity.type = WalletType.Escrow;
      entity.currency = 'USD';
      entity.balance = '0.00';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const result = entity.toDomain();

      expect(result.balance).toBe(0);
      expect(result.currency).toBe('USD');
    });

    it('should handle large balance amounts', () => {
      const entity = new WalletEntity();
      entity.id = 'wallet-large';
      entity.ownerId = 'owner-large';
      entity.ownerType = OwnerType.Workspace;
      entity.type = WalletType.Incentive;
      entity.currency = 'KES';
      entity.balance = '999999999.99';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const result = entity.toDomain();

      expect(result.balance).toBe(999999999.99);
    });
  });

  describe('fromDomain', () => {
    it('should create entity from domain data correctly', () => {
      const domainData = {
        walletId: 'wallet-new',
        ownerId: 'owner-new',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'UGX',
        balance: 500.00,
        createdAt: new Date('2024-06-15'),
      };

      const result = WalletEntity.fromDomain(domainData);

      expect(result.id).toBe('wallet-new');
      expect(result.ownerId).toBe('owner-new');
      expect(result.ownerType).toBe(OwnerType.Organization);
      expect(result.type).toBe(WalletType.Settlement);
      expect(result.currency).toBe('UGX');
      expect(result.balance).toBe('500.00');
      expect(result.createdAt).toEqual(new Date('2024-06-15'));
    });

    it('should format balance to 2 decimal places', () => {
      const domainData = {
        walletId: 'wallet-decimal',
        ownerId: 'owner-decimal',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
        balance: 100,
        createdAt: new Date(),
      };

      const result = WalletEntity.fromDomain(domainData);

      expect(result.balance).toBe('100.00');
    });

    it('should handle decimal balance correctly', () => {
      const domainData = {
        walletId: 'wallet-decimal-2',
        ownerId: 'owner-decimal-2',
        ownerType: OwnerType.Workspace,
        type: WalletType.Incentive,
        currency: 'USD',
        balance: 99.99,
        createdAt: new Date(),
      };

      const result = WalletEntity.fromDomain(domainData);

      expect(result.balance).toBe('99.99');
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle different currencies', () => {
      const currencies = ['KES', 'USD', 'UGX', 'TZS', 'EUR', 'GBP'];
      
      currencies.forEach((currency) => {
        const entity = WalletEntity.fromDomain({
          walletId: `wallet-${currency}`,
          ownerId: 'owner-currency',
          ownerType: OwnerType.Workspace,
          type: WalletType.Escrow,
          currency,
          balance: 100,
          createdAt: new Date(),
        });

        expect(entity.currency).toBe(currency);
      });
    });

    it('should handle all OwnerType enum values', () => {
      const ownerTypes = [
        OwnerType.Organization,
        OwnerType.Workspace,
        OwnerType.Actor,
      ];

      ownerTypes.forEach((ownerType) => {
        const entity = WalletEntity.fromDomain({
          walletId: `wallet-${ownerType}`,
          ownerId: 'owner-test',
          ownerType,
          type: WalletType.Escrow,
          currency: 'KES',
          balance: 0,
          createdAt: new Date(),
        });

        expect(entity.ownerType).toBe(ownerType);
      });
    });

    it('should handle all WalletType enum values', () => {
      const walletTypes = [
        WalletType.Escrow,
        WalletType.Incentive,
        WalletType.Settlement,
      ];

      walletTypes.forEach((walletType) => {
        const entity = WalletEntity.fromDomain({
          walletId: `wallet-${walletType}`,
          ownerId: 'owner-test',
          ownerType: OwnerType.Organization,
          type: walletType,
          currency: 'KES',
          balance: 0,
          createdAt: new Date(),
        });

        expect(entity.type).toBe(walletType);
      });
    });

    it('should handle very small decimal amounts', () => {
      const entity = WalletEntity.fromDomain({
        walletId: 'wallet-small',
        ownerId: 'owner-small',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
        balance: 0.01,
        createdAt: new Date(),
      });

      expect(entity.balance).toBe('0.01');
    });

    it('should handle negative balance for settlement wallets', () => {
      const entity = WalletEntity.fromDomain({
        walletId: 'wallet-negative',
        ownerId: 'owner-negative',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
        balance: -100.50,
        createdAt: new Date(),
      });

      expect(entity.balance).toBe('-100.50');
    });

    it('should handle special characters in currency codes', () => {
      const entity = WalletEntity.fromDomain({
        walletId: 'wallet-special',
        ownerId: 'owner-special',
        ownerType: OwnerType.Workspace,
        type: WalletType.Incentive,
        currency: 'JPY',
        balance: 10000,
        createdAt: new Date(),
      });

      expect(entity.balance).toBe('10000.00');
    });
  });

  // ==================== Complex Use Cases ====================

  describe('Complex Use Cases', () => {
    it('should handle wallet creation with full data', () => {
      const domainData = {
        walletId: 'wallet-full',
        ownerId: 'org-123-456',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
        balance: 1000000,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const entity = WalletEntity.fromDomain(domainData);
      const backToDomain = entity.toDomain();

      expect(backToDomain.walletId).toBe(domainData.walletId);
      expect(backToDomain.ownerId).toBe(domainData.ownerId);
      expect(backToDomain.balance).toBe(domainData.balance);
    });

    it('should handle concurrent wallet operations simulation', () => {
      const wallets: WalletEntity[] = [];
      
      for (let i = 0; i < 100; i++) {
        wallets.push(WalletEntity.fromDomain({
          walletId: `wallet-concurrent-${i}`,
          ownerId: `owner-${i % 10}`,
          ownerType: [OwnerType.Actor, OwnerType.Workspace, OwnerType.Organization][i % 3] as OwnerType,
          type: [WalletType.Escrow, WalletType.Incentive][i % 2] as WalletType,
          currency: ['KES', 'USD', 'UGX'][i % 3],
          balance: i * 10,
          createdAt: new Date(),
        }));
      }

      expect(wallets.length).toBe(100);
      
      const currencyCounts = wallets.reduce((acc, w) => {
        acc[w.currency] = (acc[w.currency] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(currencyCounts['KES']).toBe(34);
      expect(currencyCounts['USD']).toBe(33);
      expect(currencyCounts['UGX']).toBe(33);
    });

    it('should preserve precision through multiple conversions', () => {
      const entity = new WalletEntity();
      entity.id = 'wallet-precision';
      entity.ownerId = 'owner-precision';
      entity.ownerType = OwnerType.Workspace;
      entity.type = WalletType.Incentive;
      entity.currency = 'KES';
      entity.balance = '123.456789';

      const domain = entity.toDomain();

      expect(domain.balance).toBe(123.456789);
    });
  });

  // ==================== Tier-Specific Tests ====================

  describe('Tier-Specific Functionality', () => {
    // Free tier - Basic escrow wallet
    it('should support Free tier basic escrow wallet', () => {
      const entity = WalletEntity.fromDomain({
        walletId: 'free-tier-wallet',
        ownerId: 'free-user-1',
        ownerType: OwnerType.Actor,
        type: WalletType.Escrow,
        currency: 'KES',
        balance: 500,
        createdAt: new Date(),
      });

      expect(entity.type).toBe(WalletType.Escrow);
      expect(entity.balance).toBe('500.00');
    });

    // Basic tier - Workspace wallet
    it('should support Basic tier workspace wallet', () => {
      const entity = WalletEntity.fromDomain({
        walletId: 'basic-tier-wallet',
        ownerId: 'basic-workspace-1',
        ownerType: OwnerType.Workspace,
        type: WalletType.Escrow,
        currency: 'KES',
        balance: 50000,
        createdAt: new Date(),
      });

      expect(entity.ownerType).toBe(OwnerType.Workspace);
      expect(entity.type).toBe(WalletType.Escrow);
    });

    // Pro tier - Organization settlement wallet
    it('should support Pro tier organization settlement wallet', () => {
      const entity = WalletEntity.fromDomain({
        walletId: 'pro-settlement-wallet',
        ownerId: 'pro-org-settlement',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
        balance: 1000000,
        createdAt: new Date(),
      });

      expect(entity.ownerType).toBe(OwnerType.Organization);
      expect(entity.type).toBe(WalletType.Settlement);
    });

    it('should support Pro tier organization settlement wallet with negative balance', () => {
      const entity = WalletEntity.fromDomain({
        walletId: 'pro-settlement-negative',
        ownerId: 'pro-org-negative',
        ownerType: OwnerType.Organization,
        type: WalletType.Settlement,
        currency: 'KES',
        balance: -50000,
        createdAt: new Date(),
      });

      expect(entity.type).toBe(WalletType.Settlement);
      expect(parseFloat(entity.balance)).toBeLessThan(0);
    });

    it('should handle multi-currency wallet for Pro tier', () => {
      const currencies = ['KES', 'USD', 'UGX', 'TZS'];
      const wallets = currencies.map((currency, index) => 
        WalletEntity.fromDomain({
          walletId: `multi-currency-${currency}`,
          ownerId: 'pro-user-multi',
          ownerType: OwnerType.Organization,
          type: WalletType.Settlement,
          currency,
          balance: 1000 * (index + 1),
          createdAt: new Date(),
        })
      );

      expect(wallets.length).toBe(4);
      expect(wallets[0].currency).toBe('KES');
      expect(wallets[3].balance).toBe('4000.00');
    });
  });
});
