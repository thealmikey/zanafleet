import { TransactionEntity } from '../../entities/transaction.entity';
import { TransactionType, TransactionStatus } from '../../dto/transaction.enums';

describe('TransactionEntity', () => {
  // ==================== Normal Use Cases ====================

  describe('toDomain', () => {
    it('should convert entity to domain object correctly', () => {
      const entity = new TransactionEntity();
      entity.id = 'tx-123';
      entity.sourceWalletId = 'wallet-source';
      entity.destinationWalletId = 'wallet-dest';
      entity.amount = '1500.50';
      entity.type = TransactionType.Settlement;
      entity.status = TransactionStatus.Completed;
      entity.linkedEventId = 'event-456';
      entity.createdAt = new Date('2024-01-01');
      entity.updatedAt = new Date('2024-01-02');

      const result = entity.toDomain();

      expect(result.transactionId).toBe('tx-123');
      expect(result.sourceWalletId).toBe('wallet-source');
      expect(result.destinationWalletId).toBe('wallet-dest');
      expect(result.amount).toBe(1500.50);
      expect(result.type).toBe(TransactionType.Settlement);
      expect(result.status).toBe(TransactionStatus.Completed);
      expect(result.linkedEventId).toBe('event-456');
    });

    it('should handle pending transaction', () => {
      const entity = new TransactionEntity();
      entity.id = 'tx-pending';
      entity.sourceWalletId = 'wallet-a';
      entity.destinationWalletId = 'wallet-b';
      entity.amount = '100.00';
      entity.type = TransactionType.Reward;
      entity.status = TransactionStatus.Pending;
      entity.linkedEventId = null;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const result = entity.toDomain();

      expect(result.status).toBe(TransactionStatus.Pending);
      expect(result.linkedEventId).toBeNull();
    });

    it('should handle failed transaction', () => {
      const entity = new TransactionEntity();
      entity.id = 'tx-failed';
      entity.sourceWalletId = 'wallet-x';
      entity.destinationWalletId = 'wallet-y';
      entity.amount = '500.00';
      entity.type = TransactionType.Fee;
      entity.status = TransactionStatus.Failed;
      entity.linkedEventId = null;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const result = entity.toDomain();

      expect(result.status).toBe(TransactionStatus.Failed);
      expect(result.type).toBe(TransactionType.Fee);
    });

    it('should handle all transaction types', () => {
      const types = [
        TransactionType.Settlement,
        TransactionType.Reward,
        TransactionType.Fee,
        TransactionType.Penalty,
      ];

      types.forEach((type) => {
        const entity = new TransactionEntity();
        entity.id = `tx-${type}`;
        entity.sourceWalletId = 'wallet-a';
        entity.destinationWalletId = 'wallet-b';
        entity.amount = '100.00';
        entity.type = type;
        entity.status = TransactionStatus.Completed;
        entity.linkedEventId = null;
        entity.createdAt = new Date();
        entity.updatedAt = new Date();

        const result = entity.toDomain();
        expect(result.type).toBe(type);
      });
    });
  });

  describe('fromDomain', () => {
    it('should create entity from domain data correctly', () => {
      const domainData = {
        transactionId: 'tx-new',
        sourceWalletId: 'wallet-source-new',
        destinationWalletId: 'wallet-dest-new',
        amount: 2500.00,
        type: TransactionType.Settlement,
        status: TransactionStatus.Completed,
        linkedEventId: 'event-789',
        createdAt: new Date('2024-06-15'),
      };

      const result = TransactionEntity.fromDomain(domainData);

      expect(result.id).toBe('tx-new');
      expect(result.sourceWalletId).toBe('wallet-source-new');
      expect(result.destinationWalletId).toBe('wallet-dest-new');
      expect(result.amount).toBe('2500.00');
      expect(result.type).toBe(TransactionType.Settlement);
      expect(result.status).toBe(TransactionStatus.Completed);
      expect(result.linkedEventId).toBe('event-789');
    });

    it('should format amount to 2 decimal places', () => {
      const domainData = {
        transactionId: 'tx-decimal',
        sourceWalletId: 'wallet-a',
        destinationWalletId: 'wallet-b',
        amount: 100,
        type: TransactionType.Reward,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      };

      const result = TransactionEntity.fromDomain(domainData);

      expect(result.amount).toBe('100.00');
    });

    it('should handle null linkedEventId', () => {
      const domainData = {
        transactionId: 'tx-no-event',
        sourceWalletId: 'wallet-a',
        destinationWalletId: 'wallet-b',
        amount: 50,
        type: TransactionType.Fee,
        status: TransactionStatus.Pending,
        linkedEventId: null,
        createdAt: new Date(),
      };

      const result = TransactionEntity.fromDomain(domainData);

      expect(result.linkedEventId).toBeNull();
    });

    it('should handle undefined linkedEventId', () => {
      const domainData = {
        transactionId: 'tx-undefined-event',
        sourceWalletId: 'wallet-a',
        destinationWalletId: 'wallet-b',
        amount: 75,
        type: TransactionType.Penalty,
        status: TransactionStatus.Failed,
        createdAt: new Date(),
      };

      const result = TransactionEntity.fromDomain(domainData);

      expect(result.linkedEventId).toBeNull();
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle zero amount transactions', () => {
      const domainData = {
        transactionId: 'tx-zero',
        sourceWalletId: 'wallet-a',
        destinationWalletId: 'wallet-b',
        amount: 0,
        type: TransactionType.Fee,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      };

      const result = TransactionEntity.fromDomain(domainData);
      expect(result.amount).toBe('0.00');
    });

    it('should handle very large amounts', () => {
      const domainData = {
        transactionId: 'tx-large',
        sourceWalletId: 'wallet-a',
        destinationWalletId: 'wallet-b',
        amount: 999999999.99,
        type: TransactionType.Settlement,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      };

      const result = TransactionEntity.fromDomain(domainData);
      expect(result.amount).toBe('999999999.99');
    });

    it('should handle very small amounts', () => {
      const domainData = {
        transactionId: 'tx-small',
        sourceWalletId: 'wallet-a',
        destinationWalletId: 'wallet-b',
        amount: 0.01,
        type: TransactionType.Reward,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      };

      const result = TransactionEntity.fromDomain(domainData);
      expect(result.amount).toBe('0.01');
    });

    it('should handle negative amounts for penalties', () => {
      const domainData = {
        transactionId: 'tx-negative',
        sourceWalletId: 'wallet-a',
        destinationWalletId: 'wallet-b',
        amount: -100.50,
        type: TransactionType.Penalty,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      };

      const result = TransactionEntity.fromDomain(domainData);
      expect(result.amount).toBe('-100.50');
    });

    it('should preserve amount precision through conversions', () => {
      const entity = new TransactionEntity();
      entity.id = 'tx-precision';
      entity.sourceWalletId = 'wallet-a';
      entity.destinationWalletId = 'wallet-b';
      entity.amount = '123.456789';
      entity.type = TransactionType.Settlement;
      entity.status = TransactionStatus.Completed;
      entity.linkedEventId = null;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const domain = entity.toDomain();
      expect(domain.amount).toBe(123.456789);
    });

    it('should handle all status values', () => {
      const statuses = [
        TransactionStatus.Pending,
        TransactionStatus.Completed,
        TransactionStatus.Failed,
      ];

      statuses.forEach((status) => {
        const domainData = {
          transactionId: `tx-${status}`,
          sourceWalletId: 'wallet-a',
          destinationWalletId: 'wallet-b',
          amount: 100,
          type: TransactionType.Settlement,
          status,
          createdAt: new Date(),
        };

        const result = TransactionEntity.fromDomain(domainData);
        expect(result.status).toBe(status);
      });
    });
  });

  // ==================== Complex Use Cases ====================

  describe('Complex Use Cases', () => {
    it('should handle full transaction lifecycle', () => {
      // Pending transaction
      const pendingData = {
        transactionId: 'tx-lifecycle',
        sourceWalletId: 'wallet-customer',
        destinationWalletId: 'wallet-business',
        amount: 5000,
        type: TransactionType.Settlement,
        status: TransactionStatus.Pending,
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      const pendingEntity = TransactionEntity.fromDomain(pendingData);
      expect(pendingEntity.status).toBe(TransactionStatus.Pending);

      // Complete the transaction
      pendingEntity.status = TransactionStatus.Completed;
      const completedDomain = pendingEntity.toDomain();
      expect(completedDomain.status).toBe(TransactionStatus.Completed);
    });

    it('should handle bulk transaction processing', () => {
      const transactions: TransactionEntity[] = [];

      for (let i = 0; i < 100; i++) {
        transactions.push(TransactionEntity.fromDomain({
          transactionId: `tx-bulk-${i}`,
          sourceWalletId: `wallet-${i % 10}`,
          destinationWalletId: `wallet-${(i + 1) % 10}`,
          amount: (i + 1) * 10,
          type: [TransactionType.Settlement, TransactionType.Reward, TransactionType.Fee][i % 3] as TransactionType,
          status: [TransactionStatus.Pending, TransactionStatus.Completed, TransactionStatus.Failed][i % 3] as TransactionStatus,
          createdAt: new Date(),
        }));
      }

      expect(transactions.length).toBe(100);

      // Verify distribution
      const statusCounts = transactions.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(statusCounts[TransactionStatus.Pending]).toBe(34);
      expect(statusCounts[TransactionStatus.Completed]).toBe(33);
      expect(statusCounts[TransactionStatus.Failed]).toBe(33);
    });

    it('should handle reward transaction chain', () => {
      const rewardTx = TransactionEntity.fromDomain({
        transactionId: 'tx-reward-1',
        sourceWalletId: 'wallet-org',
        destinationWalletId: 'wallet-rider',
        amount: 500,
        type: TransactionType.Reward,
        status: TransactionStatus.Completed,
        linkedEventId: 'delivery-complete-123',
        createdAt: new Date(),
      });

      expect(rewardTx.type).toBe(TransactionType.Reward);
      expect(rewardTx.linkedEventId).toBe('delivery-complete-123');

      const domain = rewardTx.toDomain();
      expect(domain.type).toBe(TransactionType.Reward);
      expect(domain.linkedEventId).toBe('delivery-complete-123');
    });

    it('should handle fee deduction transactions', () => {
      const feeTx = TransactionEntity.fromDomain({
        transactionId: 'tx-fee-1',
        sourceWalletId: 'wallet-customer',
        destinationWalletId: 'wallet-platform',
        amount: 50,
        type: TransactionType.Fee,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      });

      expect(feeTx.type).toBe(TransactionType.Fee);
      expect(parseFloat(feeTx.amount)).toBe(50);
    });
  });

  // ==================== Tier-Specific Tests ====================

  describe('Tier-Specific Functionality', () => {
    // Free Tier - Basic settlement transactions
    it('should support Free tier basic settlement transactions', () => {
      const tx = TransactionEntity.fromDomain({
        transactionId: 'free-tx-1',
        sourceWalletId: 'free-customer-wallet',
        destinationWalletId: 'free-business-wallet',
        amount: 1000,
        type: TransactionType.Settlement,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      });

      expect(tx.type).toBe(TransactionType.Settlement);
      expect(tx.status).toBe(TransactionStatus.Completed);
    });

    // Basic Tier - Reward transactions
    it('should support Basic tier reward transactions', () => {
      const tx = TransactionEntity.fromDomain({
        transactionId: 'basic-tx-1',
        sourceWalletId: 'basic-org-wallet',
        destinationWalletId: 'basic-rider-wallet',
        amount: 500,
        type: TransactionType.Reward,
        status: TransactionStatus.Completed,
        linkedEventId: 'delivery-123',
        createdAt: new Date(),
      });

      expect(tx.type).toBe(TransactionType.Reward);
      expect(tx.linkedEventId).toBe('delivery-123');
    });

    // Pro Tier - All transaction types
    it('should support Pro tier fee transactions', () => {
      const tx = TransactionEntity.fromDomain({
        transactionId: 'pro-tx-fee-1',
        sourceWalletId: 'pro-customer-wallet',
        destinationWalletId: 'pro-platform-wallet',
        amount: 100,
        type: TransactionType.Fee,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      });

      expect(tx.type).toBe(TransactionType.Fee);
    });

    it('should support Pro tier penalty transactions', () => {
      const tx = TransactionEntity.fromDomain({
        transactionId: 'pro-tx-penalty-1',
        sourceWalletId: 'pro-rider-wallet',
        destinationWalletId: 'pro-platform-wallet',
        amount: -200,
        type: TransactionType.Penalty,
        status: TransactionStatus.Completed,
        createdAt: new Date(),
      });

      expect(tx.type).toBe(TransactionType.Penalty);
      expect(parseFloat(tx.amount)).toBeLessThan(0);
    });

    // Pro Tier - High volume
    it('should support Pro tier high volume transactions', () => {
      const txs = Array.from({ length: 1000 }, (_, i) =>
        TransactionEntity.fromDomain({
          transactionId: `pro-high-volume-${i}`,
          sourceWalletId: 'pro-customer-wallet',
          destinationWalletId: 'pro-business-wallet',
          amount: i + 1,
          type: TransactionType.Settlement,
          status: TransactionStatus.Completed,
          createdAt: new Date(),
        })
      );

      expect(txs.length).toBe(1000);
      const total = txs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      expect(total).toBe(500500); // Sum of 1 to 1000
    });

    // Enterprise - Multi-wallet transactions
    it('should support Enterprise tier complex transaction graphs', () => {
      const transactions: TransactionEntity[] = [];
      const wallets = ['wallet-1', 'wallet-2', 'wallet-3', 'wallet-4', 'wallet-5'];

      for (let i = 0; i < 50; i++) {
        const src = wallets[i % wallets.length];
        const dst = wallets[(i + 1) % wallets.length];
        
        transactions.push(TransactionEntity.fromDomain({
          transactionId: `enterprise-tx-${i}`,
          sourceWalletId: src,
          destinationWalletId: dst,
          amount: (i + 1) * 100,
          type: TransactionType.Settlement,
          status: TransactionStatus.Completed,
          createdAt: new Date(),
        }));
      }

      expect(transactions.length).toBe(50);
    });
  });
});
