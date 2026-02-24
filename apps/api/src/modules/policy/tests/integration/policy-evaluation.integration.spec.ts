import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import {
  PolicyScope,
  PolicyEffect,
  PolicyStatus,
  PolicyTrigger,
  EvaluationContext,
} from '../../dto';
import { PolicyDecisionLogEntity } from '../../entities/policy-decision-log.entity';
import { PolicyEntity } from '../../entities/policy.entity';
import { PolicyDecisionLogRepository } from '../../repositories/policy-decision-log.repository';
import { PolicyRepository } from '../../repositories/policy.repository';
import { JsonLogicEvaluatorService } from '../../services/json-logic-evaluator.service';
import { PolicyEvaluationEngineService } from '../../services/policy-evaluation-engine.service';

describe('PolicyEvaluationEngineService (Integration)', () => {
  let module: TestingModule | undefined;
  let service: PolicyEvaluationEngineService;
  let policyRepo: Repository<PolicyEntity>;
  let decisionLogRepo: Repository<PolicyDecisionLogEntity>;
  let dataSource: DataSource | undefined;
  let eventBus: jest.Mocked<EventBusService>;
  let isDatabaseAvailable = false;

  const createTestPolicy = async (
    overrides: Partial<{
      policyId: string;
      name: string;
      scope: PolicyScope;
      priority: number;
      effect: PolicyEffect;
      trigger: PolicyTrigger;
      conditions: unknown;
      createdAt: Date;
    }> = {}
  ): Promise<PolicyEntity> => {
    const entity = PolicyEntity.fromDomain({
      policyId: overrides.policyId ?? `policy-${Date.now()}-${Math.random()}`,
      name: overrides.name ?? `Test Policy ${Date.now()}`,
      scope: overrides.scope ?? PolicyScope.GLOBAL,
      scopeTargetId: null,
      trigger: overrides.trigger ?? PolicyTrigger.DELIVERY_CREATION,
      priority: overrides.priority ?? 0,
      conditions: (overrides.conditions as never) ?? {
        field: 'trigger',
        operator: '==',
        value: 'DELIVERY_CREATION',
      },
      effect: overrides.effect ?? PolicyEffect.ALLOW,
      status: PolicyStatus.ACTIVE,
      createdAt: overrides.createdAt ?? new Date(),
    });

    return policyRepo.save(entity);
  };

  const createContext = (overrides: Partial<EvaluationContext> = {}): EvaluationContext => ({
    trigger: PolicyTrigger.DELIVERY_CREATION,
    workspaceId: 'workspace-integration-test',
    timestamp: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    eventBus = {
      publishEvent: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn(),
      serializeEvent: jest.fn(),
      deserializeEvent: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
      onModuleInit: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    try {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.POSTGRES_HOST ?? 'localhost',
            port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
            username: process.env.POSTGRES_USER ?? 'postgres',
            password: process.env.POSTGRES_PASSWORD ?? 'postgres',
            database: process.env.POSTGRES_DB ?? 'zanafleet_test',
            entities: [PolicyEntity, PolicyDecisionLogEntity],
            synchronize: true,
            dropSchema: true,
            connectTimeoutMS: 5000,
          }),
          TypeOrmModule.forFeature([PolicyEntity, PolicyDecisionLogEntity]),
        ],
        providers: [
          PolicyEvaluationEngineService,
          PolicyRepository,
          PolicyDecisionLogRepository,
          JsonLogicEvaluatorService,
          {
            provide: EventBusService,
            useValue: eventBus,
          },
        ],
      }).compile();

      service = module.get<PolicyEvaluationEngineService>(PolicyEvaluationEngineService);
      policyRepo = module.get<Repository<PolicyEntity>>(getRepositoryToken(PolicyEntity));
      decisionLogRepo = module.get<Repository<PolicyDecisionLogEntity>>(
        getRepositoryToken(PolicyDecisionLogEntity)
      );
      dataSource = module.get<DataSource>(DataSource);
      isDatabaseAvailable = true;
    } catch {
      console.warn(
        'Skipping integration tests: PostgreSQL database is not available. ' +
          'Run `docker-compose -f docker-compose.test.yml up -d` to start required services.'
      );
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (module) {
      await module.close();
    }
  }, 10000);

  beforeEach(async () => {
    if (!isDatabaseAvailable) {
      return;
    }
    await decisionLogRepo.delete({});
    await policyRepo.delete({});
    jest.clearAllMocks();
  });

  describe('full evaluation flow', () => {
    it('should load policies, evaluate, log decision, and publish event', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await createTestPolicy({
        name: 'Integration Test Policy',
        effect: PolicyEffect.ALLOW,
        priority: 100,
      });

      const context = createContext({ deliveryId: 'delivery-integration-001' });

      const result = await service.evaluate(context);

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.finalDecision.policyName).toBe('Integration Test Policy');
      expect(result.evaluatedPolicies).toHaveLength(1);
      expect(result.evaluationFailed).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const logs = await decisionLogRepo.find();
      expect(logs).toHaveLength(1);
      expect(logs[0].finalEffect).toBe(PolicyEffect.ALLOW);
      expect(logs[0].subjectType).toBe('Delivery');
      expect(logs[0].subjectId).toBe('delivery-integration-001');

      expect(eventBus.publishEvent).toHaveBeenCalledTimes(1);
      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyEvaluatedEvent-V1',
          finalEffect: PolicyEffect.ALLOW,
          subjectId: 'delivery-integration-001',
        })
      );
    });

    it('should handle multiple policies with correct conflict resolution', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await createTestPolicy({
        name: 'Global Allow',
        scope: PolicyScope.GLOBAL,
        effect: PolicyEffect.ALLOW,
        priority: 100,
        createdAt: new Date('2024-01-01'),
      });

      await createTestPolicy({
        name: 'Business Block',
        scope: PolicyScope.BUSINESS,
        effect: PolicyEffect.BLOCK,
        priority: 50,
        createdAt: new Date('2024-01-15'),
      });

      const result = await service.evaluate(createContext());

      expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      expect(result.finalDecision.policyName).toBe('Business Block');
      expect(result.evaluatedPolicies).toHaveLength(2);
    });

    it('should return default ALLOW when no policies match', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await createTestPolicy({
        name: 'Non-Matching Policy',
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        effect: PolicyEffect.BLOCK,
      });

      const context = createContext({ trigger: PolicyTrigger.DELIVERY_CREATION });

      const result = await service.evaluate(context);

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.finalDecision.policyId).toBe('');
      expect(result.finalDecision.reason).toContain('No applicable policies matched');
    });
  });

  describe('time-based policy filtering', () => {
    it('should only evaluate active policies within effective date range', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const futurePolicy = PolicyEntity.fromDomain({
        policyId: 'future-policy',
        name: 'Future Policy',
        scope: PolicyScope.GLOBAL,
        trigger: PolicyTrigger.DELIVERY_CREATION,
        conditions: { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
        effect: PolicyEffect.BLOCK,
        status: PolicyStatus.ACTIVE,
        effectiveFrom: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });
      await policyRepo.save(futurePolicy);

      const activePolicy = PolicyEntity.fromDomain({
        policyId: 'active-policy',
        name: 'Active Policy',
        scope: PolicyScope.GLOBAL,
        trigger: PolicyTrigger.DELIVERY_CREATION,
        conditions: { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
        effect: PolicyEffect.ALLOW,
        status: PolicyStatus.ACTIVE,
        effectiveFrom: new Date(Date.now() - 86400000),
        createdAt: new Date(),
      });
      await policyRepo.save(activePolicy);

      const result = await service.evaluate(createContext());

      expect(result.evaluatedPolicies).toHaveLength(1);
      expect(result.finalDecision.policyName).toBe('Active Policy');
      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
    });
  });

  describe('audit trail persistence', () => {
    it('should persist complete decision log with all evaluated policies', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await createTestPolicy({ name: 'Policy A', priority: 10, effect: PolicyEffect.ALLOW });
      await createTestPolicy({ name: 'Policy B', priority: 20, effect: PolicyEffect.BLOCK });

      const context = createContext({
        actorId: 'actor-audit-test',
        deliveryId: 'delivery-audit-test',
      });

      await service.evaluate(context);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const logs = await decisionLogRepo.find();
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.actorId).toBe('actor-audit-test');
      expect(log.evaluatedPolicies).toHaveLength(2);
      expect(log.contextSnapshot.trigger).toBe(PolicyTrigger.DELIVERY_CREATION);
      expect(log.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should track failedOpen flag in decision log', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const corruptPolicy = PolicyEntity.fromDomain({
        policyId: 'corrupt-policy',
        name: 'Corrupt Policy',
        scope: PolicyScope.GLOBAL,
        trigger: PolicyTrigger.DELIVERY_CREATION,
        conditions: { field: 'nonexistent.deep.path', operator: '==', value: 'impossible' },
        effect: PolicyEffect.ALLOW,
        status: PolicyStatus.ACTIVE,
        createdAt: new Date(),
      });
      await policyRepo.save(corruptPolicy);

      await service.evaluate(createContext());
      await new Promise((resolve) => setTimeout(resolve, 100));

      const logs = await decisionLogRepo.find();
      expect(logs).toHaveLength(1);
      expect(logs[0].evaluationFailed).toBe(false);
    });
  });

  describe('complex condition evaluation', () => {
    it('should evaluate nested AND/OR conditions correctly', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await createTestPolicy({
        name: 'Complex Condition Policy',
        effect: PolicyEffect.BLOCK,
        conditions: {
          field: '',
          operator: 'AND',
          value: null,
          children: [
            { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
            {
              field: '',
              operator: 'OR',
              value: null,
              children: [
                { field: 'metadata.priority', operator: '==', value: 'high' },
                { field: 'metadata.priority', operator: '==', value: 'urgent' },
              ],
            },
          ],
        },
      });

      const matchingContext = createContext({
        metadata: { priority: 'high' },
      });

      const matchResult = await service.evaluate(matchingContext);
      expect(matchResult.finalDecision.effect).toBe(PolicyEffect.BLOCK);

      const nonMatchingContext = createContext({
        metadata: { priority: 'low' },
      });

      const noMatchResult = await service.evaluate(nonMatchingContext);
      expect(noMatchResult.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(noMatchResult.finalDecision.policyId).toBe('');
    });
  });

  describe('performance', () => {
    it('should evaluate multiple policies efficiently', async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      for (let i = 0; i < 10; i++) {
        await createTestPolicy({
          name: `Bulk Policy ${i}`,
          priority: i,
          effect: i % 2 === 0 ? PolicyEffect.ALLOW : PolicyEffect.BLOCK,
        });
      }

      const context = createContext();
      const startTime = Date.now();

      const result = await service.evaluate(context);

      const duration = Date.now() - startTime;

      expect(result.evaluatedPolicies).toHaveLength(10);
      expect(result.processingTimeMs).toBeLessThan(1000);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('concurrent evaluations', () => {
    it('should return consistent results when evaluating the same context concurrently', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      await createTestPolicy({
        name: 'Concurrent Test Policy',
        effect: PolicyEffect.BLOCK,
        priority: 100,
        conditions: { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
      });

      const context = createContext({ deliveryId: 'delivery-concurrent-001' });

      const evaluationPromises = Array.from({ length: 10 }, () => service.evaluate(context));

      const results = await Promise.all(evaluationPromises);

      const firstResult = results[0];
      for (const result of results) {
        expect(result.finalDecision.effect).toBe(firstResult.finalDecision.effect);
        expect(result.finalDecision.policyId).toBe(firstResult.finalDecision.policyId);
        expect(result.finalDecision.policyName).toBe(firstResult.finalDecision.policyName);
        expect(result.evaluatedPolicies.length).toBe(firstResult.evaluatedPolicies.length);
      }

      expect(firstResult.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      expect(firstResult.finalDecision.policyName).toBe('Concurrent Test Policy');
    });

    it('should handle concurrent evaluations with different triggers correctly', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      await createTestPolicy({
        name: 'Delivery Creation Policy',
        trigger: PolicyTrigger.DELIVERY_CREATION,
        effect: PolicyEffect.ALLOW,
        priority: 100,
        conditions: { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
      });

      await createTestPolicy({
        name: 'Rider Assignment Policy',
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        effect: PolicyEffect.BLOCK,
        priority: 100,
        conditions: { field: 'trigger', operator: '==', value: 'RIDER_ASSIGNMENT' },
      });

      const deliveryContexts = Array.from({ length: 5 }, (_, i) =>
        createContext({
          deliveryId: `delivery-concurrent-${i}`,
          trigger: PolicyTrigger.DELIVERY_CREATION,
        })
      );

      const riderContexts = Array.from({ length: 5 }, (_, i) =>
        createContext({
          riderId: `rider-concurrent-${i}`,
          trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        })
      );

      const allPromises = [
        ...deliveryContexts.map((ctx) => service.evaluate(ctx)),
        ...riderContexts.map((ctx) => service.evaluate(ctx)),
      ];

      const results = await Promise.all(allPromises);

      for (let i = 0; i < 5; i++) {
        expect(results[i].finalDecision.effect).toBe(PolicyEffect.ALLOW);
        expect(results[i].finalDecision.policyName).toBe('Delivery Creation Policy');
      }

      for (let i = 5; i < 10; i++) {
        expect(results[i].finalDecision.effect).toBe(PolicyEffect.BLOCK);
        expect(results[i].finalDecision.policyName).toBe('Rider Assignment Policy');
      }
    });

    it('should produce consistent decision logs for concurrent evaluations', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      await createTestPolicy({
        name: 'Logging Test Policy',
        effect: PolicyEffect.ALLOW,
        priority: 50,
      });

      const contexts = Array.from({ length: 5 }, (_, i) =>
        createContext({ deliveryId: `delivery-log-concurrent-${i}` })
      );

      await Promise.all(contexts.map((ctx) => service.evaluate(ctx)));

      await new Promise((resolve) => setTimeout(resolve, 200));

      const logs = await decisionLogRepo.find();
      expect(logs.length).toBe(5);

      for (const log of logs) {
        expect(log.finalEffect).toBe(PolicyEffect.ALLOW);
        expect(log.evaluatedPolicies.length).toBe(1);
        expect(log.evaluatedPolicies[0].policyName).toBe('Logging Test Policy');
      }
    });

    it('should handle high concurrency without data corruption', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      for (let i = 0; i < 5; i++) {
        await createTestPolicy({
          name: `High Concurrency Policy ${i}`,
          priority: i * 10,
          effect: i === 4 ? PolicyEffect.BLOCK : PolicyEffect.ALLOW,
          scope: i === 4 ? PolicyScope.BUSINESS : PolicyScope.GLOBAL,
        });
      }

      const evaluationPromises = Array.from({ length: 50 }, (_, i) =>
        service.evaluate(createContext({ deliveryId: `delivery-high-concurrency-${i}` }))
      );

      const results = await Promise.all(evaluationPromises);

      for (const result of results) {
        expect(result.evaluationFailed).toBe(false);
        expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
        expect(result.finalDecision.policyName).toBe('High Concurrency Policy 4');
        expect(result.evaluatedPolicies.length).toBe(5);
      }
    });
  });

  describe('policy modification during evaluation', () => {
    it('should not crash when policies are modified during concurrent evaluation', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      const initialPolicy = await createTestPolicy({
        name: 'Race Condition Test Policy',
        effect: PolicyEffect.ALLOW,
        priority: 100,
      });

      const evaluationPromises: Promise<unknown>[] = [];

      for (let i = 0; i < 10; i++) {
        evaluationPromises.push(
          service.evaluate(createContext({ deliveryId: `delivery-race-${i}` }))
        );

        if (i === 5) {
          initialPolicy.effect = PolicyEffect.BLOCK;
          await policyRepo.save(initialPolicy);
        }
      }

      const results = (await Promise.all(evaluationPromises)) as Array<{
        evaluationFailed: boolean;
        finalDecision: { effect: PolicyEffect };
      }>;

      for (const result of results) {
        expect(result.evaluationFailed).toBe(false);
        expect([PolicyEffect.ALLOW, PolicyEffect.BLOCK]).toContain(result.finalDecision.effect);
      }
    });

    it('should handle policy deletion during concurrent evaluations gracefully', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      const policy = await createTestPolicy({
        name: 'Delete During Eval Policy',
        effect: PolicyEffect.BLOCK,
        priority: 100,
      });

      const evaluationPromises: Promise<unknown>[] = [];

      for (let i = 0; i < 10; i++) {
        evaluationPromises.push(
          service.evaluate(createContext({ deliveryId: `delivery-delete-${i}` }))
        );

        if (i === 5) {
          await policyRepo.delete({ id: policy.id });
        }
      }

      const results = (await Promise.all(evaluationPromises)) as Array<{
        evaluationFailed: boolean;
        finalDecision: { effect: PolicyEffect };
      }>;

      for (const result of results) {
        expect(result.evaluationFailed).toBe(false);
        expect([PolicyEffect.ALLOW, PolicyEffect.BLOCK]).toContain(result.finalDecision.effect);
      }
    });

    it('should handle new policy insertion during concurrent evaluations', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      await createTestPolicy({
        name: 'Initial Low Priority Policy',
        effect: PolicyEffect.ALLOW,
        priority: 10,
      });

      const evaluationPromises: Promise<unknown>[] = [];

      for (let i = 0; i < 10; i++) {
        evaluationPromises.push(
          service.evaluate(createContext({ deliveryId: `delivery-add-${i}` }))
        );

        if (i === 5) {
          await createTestPolicy({
            name: 'New High Priority Block Policy',
            effect: PolicyEffect.BLOCK,
            priority: 100,
          });
        }
      }

      const results = (await Promise.all(evaluationPromises)) as Array<{
        evaluationFailed: boolean;
        finalDecision: { effect: PolicyEffect };
      }>;

      for (const result of results) {
        expect(result.evaluationFailed).toBe(false);
        expect([PolicyEffect.ALLOW, PolicyEffect.BLOCK]).toContain(result.finalDecision.effect);
      }
    });

    it('should maintain evaluation integrity with rapid policy updates', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      const policy = await createTestPolicy({
        name: 'Rapid Update Policy',
        effect: PolicyEffect.ALLOW,
        priority: 100,
      });

      const evaluationPromises: Promise<unknown>[] = [];
      const updatePromises: Promise<unknown>[] = [];

      for (let i = 0; i < 20; i++) {
        evaluationPromises.push(
          service.evaluate(createContext({ deliveryId: `delivery-rapid-${i}` }))
        );

        updatePromises.push(
          (async () => {
            policy.effect = i % 2 === 0 ? PolicyEffect.ALLOW : PolicyEffect.BLOCK;
            policy.priority = 100 + i;
            await policyRepo.save(policy);
          })()
        );
      }

      await Promise.all(updatePromises);
      const results = (await Promise.all(evaluationPromises)) as Array<{
        evaluationFailed: boolean;
        finalDecision: { effect: PolicyEffect };
        processingTimeMs: number;
      }>;

      for (const result of results) {
        expect(result.evaluationFailed).toBe(false);
        expect([PolicyEffect.ALLOW, PolicyEffect.BLOCK]).toContain(result.finalDecision.effect);
        expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle concurrent policy scope changes without corruption', async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      const globalPolicy = await createTestPolicy({
        name: 'Scope Change Policy',
        scope: PolicyScope.GLOBAL,
        effect: PolicyEffect.ALLOW,
        priority: 50,
      });

      const businessPolicy = await createTestPolicy({
        name: 'Business Scope Policy',
        scope: PolicyScope.BUSINESS,
        effect: PolicyEffect.BLOCK,
        priority: 100,
      });

      const evaluationPromises: Promise<unknown>[] = [];

      for (let i = 0; i < 15; i++) {
        evaluationPromises.push(
          service.evaluate(createContext({ deliveryId: `delivery-scope-${i}` }))
        );

        if (i === 5) {
          globalPolicy.scope = PolicyScope.RIDER;
          globalPolicy.priority = 200;
          await policyRepo.save(globalPolicy);
        }

        if (i === 10) {
          await policyRepo.delete({ id: businessPolicy.id });
        }
      }

      const results = (await Promise.all(evaluationPromises)) as Array<{
        evaluationFailed: boolean;
        finalDecision: { effect: PolicyEffect; policyName: string };
        evaluatedPolicies: Array<{ matched: boolean }>;
      }>;

      for (const result of results) {
        expect(result.evaluationFailed).toBe(false);
        expect([PolicyEffect.ALLOW, PolicyEffect.BLOCK]).toContain(result.finalDecision.effect);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      const logs = await decisionLogRepo.find();
      expect(logs.length).toBe(15);
    });
  });
});
