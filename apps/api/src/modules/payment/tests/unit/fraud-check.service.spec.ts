import { AccountEntity, AccountStatus, AccountType } from '@api/modules/account';
import { PolicyEvaluationEngineService } from '@api/modules/policy/services/policy-evaluation-engine.service';
import { Repository } from 'typeorm';

import { PaymentIntentStatus, PaymentFlowType, PaymentMethod } from '../../dto/payment.enums';
import { PaymentIntentEntity } from '../../entities/payment-intent.entity';
import {
  FraudCheckService,
  FraudDecision,
  RiskLevel,
} from '../../services/fraud-check.service';

describe('FraudCheckService', () => {
  let service: FraudCheckService;
  let mockPaymentIntentRepo: jest.Mocked<Repository<PaymentIntentEntity>>;
  let mockAccountRepo: jest.Mocked<Repository<AccountEntity>>;
  let mockPolicyEngine: jest.Mocked<PolicyEvaluationEngineService>;

  const createPaymentIntent = (overrides?: Partial<ReturnType<PaymentIntentEntity['toDomain']>>): PaymentIntentEntity => {
    const entity = new PaymentIntentEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440000';
    entity.payerAccountId = '660e8400-e29b-41d4-a716-446655440001';
    entity.payeeAccountId = '770e8400-e29b-41d4-a716-446655440002';
    entity.flowType = PaymentFlowType.C2B;
    entity.amount = '100.00';
    entity.currency = 'USD';
    entity.status = PaymentIntentStatus.CREATED;
    entity.paymentMethod = PaymentMethod.CARD;
    entity.providerId = 'stripe';
    entity.invoiceId = null;
    entity.idempotencyKey = 'idem-key-123';
    entity.metadata = null;
    entity.expiresAt = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    if (overrides) {
      if (overrides.amount !== undefined) entity.amount = overrides.amount.toFixed(2);
    }

    return entity;
  };

  const createAccount = (status: AccountStatus): AccountEntity => {
    const entity = new AccountEntity();
    entity.id = '660e8400-e29b-41d4-a716-446655440001';
    entity.externalId = 'ext-123';
    entity.accountType = AccountType.BUSINESS;
    entity.status = status;
    entity.currency = 'USD';
    entity.metadata = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  };

  beforeEach(() => {
    mockPaymentIntentRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<PaymentIntentEntity>>;

    mockAccountRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<AccountEntity>>;

    mockPolicyEngine = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<PolicyEvaluationEngineService>;
  });

  describe('without optional services', () => {
    beforeEach(() => {
      service = new FraudCheckService(mockPaymentIntentRepo, undefined, undefined);
    });

    it('should perform basic checks without policy engine', async () => {
      const intent = createPaymentIntent();

      const result = await service.checkPaymentIntent(intent);

      expect(result.decision).toBe(FraudDecision.ALLOW);
      expect(result.policyEvaluated).toBe(false);
      expect(result.checks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('velocity checks', () => {
    beforeEach(() => {
      service = new FraudCheckService(mockPaymentIntentRepo, undefined, undefined);
    });

    it('should allow when few recent payments', async () => {
      mockPaymentIntentRepo.count.mockResolvedValue(2);

      const result = await service.checkPaymentIntent(createPaymentIntent());

      const velocityCheck = result.checks.find((c) => c.checkName === 'velocity');
      expect(velocityCheck?.passed).toBe(true);
      expect(velocityCheck?.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should block when too many recent payments', async () => {
      mockPaymentIntentRepo.count.mockResolvedValue(15);

      const result = await service.checkPaymentIntent(createPaymentIntent());

      expect(result.decision).toBe(FraudDecision.BLOCK);
      const velocityCheck = result.checks.find((c) => c.checkName === 'velocity');
      expect(velocityCheck?.passed).toBe(false);
      expect(velocityCheck?.riskLevel).toBe(RiskLevel.CRITICAL);
    });
  });

  describe('amount checks', () => {
    beforeEach(() => {
      service = new FraudCheckService(mockPaymentIntentRepo, undefined, undefined);
    });

    it('should allow low amounts with low risk', async () => {
      const intent = createPaymentIntent({ amount: 50 });

      const result = await service.checkPaymentIntent(intent);

      const amountCheck = result.checks.find((c) => c.checkName === 'amount_threshold');
      expect(amountCheck?.passed).toBe(true);
      expect(amountCheck?.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should flag high amounts', async () => {
      const intent = createPaymentIntent({ amount: 1500 });

      const result = await service.checkPaymentIntent(intent);

      const amountCheck = result.checks.find((c) => c.checkName === 'amount_threshold');
      expect(amountCheck?.passed).toBe(true);
      expect(amountCheck?.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should block critical amounts', async () => {
      const intent = createPaymentIntent({ amount: 6000 });

      const result = await service.checkPaymentIntent(intent);

      expect(result.decision).toBe(FraudDecision.BLOCK);
      const amountCheck = result.checks.find((c) => c.checkName === 'amount_threshold');
      expect(amountCheck?.passed).toBe(false);
      expect(amountCheck?.riskLevel).toBe(RiskLevel.CRITICAL);
    });
  });

  describe('account status checks', () => {
    beforeEach(() => {
      service = new FraudCheckService(mockPaymentIntentRepo, mockAccountRepo, undefined);
    });

    it('should allow active accounts', async () => {
      mockAccountRepo.findOne.mockResolvedValue(createAccount(AccountStatus.ACTIVE));

      const result = await service.checkPaymentIntent(createPaymentIntent());

      const accountCheck = result.checks.find((c) => c.checkName === 'account_status');
      expect(accountCheck?.passed).toBe(true);
      expect(accountCheck?.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should block suspended accounts', async () => {
      mockAccountRepo.findOne.mockResolvedValue(createAccount(AccountStatus.SUSPENDED));

      const result = await service.checkPaymentIntent(createPaymentIntent());

      expect(result.decision).toBe(FraudDecision.BLOCK);
      const accountCheck = result.checks.find((c) => c.checkName === 'account_status');
      expect(accountCheck?.passed).toBe(false);
      expect(accountCheck?.riskLevel).toBe(RiskLevel.CRITICAL);
    });

    it('should block when account not found', async () => {
      mockAccountRepo.findOne.mockResolvedValue(null);

      const result = await service.checkPaymentIntent(createPaymentIntent());

      expect(result.decision).toBe(FraudDecision.BLOCK);
      const accountCheck = result.checks.find((c) => c.checkName === 'account_status');
      expect(accountCheck?.passed).toBe(false);
    });
  });

  describe('policy evaluation', () => {
    beforeEach(() => {
      service = new FraudCheckService(mockPaymentIntentRepo, undefined, mockPolicyEngine);
    });

    it('should allow when policy returns ALLOW', async () => {
      mockPolicyEngine.evaluate.mockResolvedValue({
        decision: { effect: 'ALLOW' },
        outputs: {},
      } as never);

      const result = await service.checkPaymentIntent(createPaymentIntent());

      expect(result.policyEvaluated).toBe(true);
      const policyCheck = result.checks.find((c) => c.checkName === 'policy_evaluation');
      expect(policyCheck?.passed).toBe(true);
    });

    it('should block when policy returns DENY', async () => {
      mockPolicyEngine.evaluate.mockResolvedValue({
        decision: { effect: 'DENY' },
        outputs: {},
      } as never);

      const result = await service.checkPaymentIntent(createPaymentIntent());

      expect(result.decision).toBe(FraudDecision.BLOCK);
      const policyCheck = result.checks.find((c) => c.checkName === 'policy_evaluation');
      expect(policyCheck?.passed).toBe(false);
    });

    it('should handle policy evaluation errors gracefully', async () => {
      mockPolicyEngine.evaluate.mockRejectedValue(new Error('Policy error'));

      const result = await service.checkPaymentIntent(createPaymentIntent());

      expect(result.decision).toBe(FraudDecision.ALLOW);
      const policyCheck = result.checks.find((c) => c.checkName === 'policy_evaluation');
      expect(policyCheck?.passed).toBe(true);
      expect(policyCheck?.riskLevel).toBe(RiskLevel.MEDIUM);
    });
  });

  describe('result aggregation', () => {
    beforeEach(() => {
      service = new FraudCheckService(mockPaymentIntentRepo, mockAccountRepo, mockPolicyEngine);
      mockAccountRepo.findOne.mockResolvedValue(createAccount(AccountStatus.ACTIVE));
      mockPolicyEngine.evaluate.mockResolvedValue({ decision: 'ALLOW', outputs: {} } as never);
    });

    it('should return ALLOW with LOW risk when all checks pass', async () => {
      mockPaymentIntentRepo.count.mockResolvedValue(1);

      const intent = createPaymentIntent({ amount: 50 });
      const result = await service.checkPaymentIntent(intent);

      expect(result.decision).toBe(FraudDecision.ALLOW);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should return REVIEW when multiple high risk checks', async () => {
      mockPaymentIntentRepo.count.mockResolvedValue(8);

      const intent = createPaymentIntent({ amount: 1200 });
      const result = await service.checkPaymentIntent(intent);

      expect(result.decision).toBe(FraudDecision.REVIEW);
      expect(result.riskLevel).toBe(RiskLevel.HIGH);
    });
  });

  describe('configuration', () => {
    beforeEach(() => {
      service = new FraudCheckService(mockPaymentIntentRepo, undefined, undefined);
    });

    it('should update config', () => {
      service.updateConfig({ maxPaymentsInWindow: 5 });

      const config = service.getConfig();
      expect(config.maxPaymentsInWindow).toBe(5);
    });

    it('should return copy of config', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
