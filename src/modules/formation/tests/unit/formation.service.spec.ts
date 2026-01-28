import { Repository } from 'typeorm';

import { FormationState, RequirementType } from '../../dto/formation.enums';
import { FormationService } from '../../services/formation.service';
import type { FormationStatusEntity } from '../../entities/formation-status.entity';
import type { RequirementEntity } from '../../entities/requirement.entity';

type MockRepository<T> = {
  find: jest.Mock<Promise<T[]>, [unknown?]>;
  save: jest.Mock<Promise<T>, [T]>;
};

const createMockRepository = <T>(): MockRepository<T> =>
  ({
    find: jest.fn(),
    save: jest.fn(),
  } as unknown as MockRepository<T>);

const createRequirement = (overrides: Partial<RequirementEntity> = {}): RequirementEntity =>
  ({
    requirementId: overrides.requirementId ?? 'requirement-id',
    entityType: overrides.entityType ?? 'Workspace',
    entityId: overrides.entityId ?? 'entity-id',
    type: overrides.type ?? RequirementType.FIELD,
    key: overrides.key ?? 'requirement_key',
    description: overrides.description ?? 'Requirement description',
    blocking: overrides.blocking ?? true,
    satisfied: overrides.satisfied ?? false,
    targetEntityId: overrides.targetEntityId ?? null,
    createdAt: overrides.createdAt ?? new Date(),
  }) as RequirementEntity;

describe('FormationService', () => {
  let formationStatusRepository: MockRepository<FormationStatusEntity>;
  let requirementRepository: MockRepository<RequirementEntity>;
  let service: FormationService;

  beforeEach(() => {
    formationStatusRepository = createMockRepository<FormationStatusEntity>();
    requirementRepository = createMockRepository<RequirementEntity>();

    service = new FormationService(
      formationStatusRepository as unknown as Repository<FormationStatusEntity>,
      requirementRepository as unknown as Repository<RequirementEntity>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('evaluateState', () => {
    it('returns BLOCKED when cyclic dependency detected', async () => {
      jest.spyOn(service, 'detectCycle').mockResolvedValue(true);

      const result = await service.evaluateState('Workspace', 'entity-1');

      expect(result).toBe(FormationState.BLOCKED);
      expect(requirementRepository.find).not.toHaveBeenCalled();
    });

    it('returns PENDING when blocking requirements are unsatisfied', async () => {
      jest.spyOn(service, 'detectCycle').mockResolvedValue(false);
      const blockingRequirement = createRequirement({
        requirementId: 'req-blocking',
        entityType: 'Workspace',
        entityId: 'entity-1',
        blocking: true,
        satisfied: false,
      });

      requirementRepository.find.mockImplementation(async (options?: unknown) => {
        const { where } = (options as { where?: Record<string, unknown> }) ?? {};

        if (where?.['blocking'] === true && where?.['satisfied'] === false) {
          return [blockingRequirement];
        }

        if (where?.['satisfied'] === false) {
          return [blockingRequirement];
        }

        return [];
      });

      const result = await service.evaluateState('Workspace', 'entity-1');

      expect(result).toBe(FormationState.PENDING);
    });

    it('returns PARTIAL when only non-blocking requirements are unsatisfied', async () => {
      jest.spyOn(service, 'detectCycle').mockResolvedValue(false);
      const nonBlockingRequirement = createRequirement({
        requirementId: 'req-non-blocking',
        entityType: 'Workspace',
        entityId: 'entity-1',
        blocking: false,
        satisfied: false,
      });

      requirementRepository.find.mockImplementation(async (options?: unknown) => {
        const { where } = (options as { where?: Record<string, unknown> }) ?? {};

        if (where?.['blocking'] === true && where?.['satisfied'] === false) {
          return [];
        }

        if (where?.['satisfied'] === false) {
          return [nonBlockingRequirement];
        }

        return [];
      });

      const result = await service.evaluateState('Workspace', 'entity-1');

      expect(result).toBe(FormationState.PARTIAL);
    });

    it('returns ACTIVE when all requirements are satisfied', async () => {
      jest.spyOn(service, 'detectCycle').mockResolvedValue(false);
      requirementRepository.find.mockResolvedValue([]);

      const result = await service.evaluateState('Workspace', 'entity-1');

      expect(result).toBe(FormationState.ACTIVE);
    });
  });

  describe('detectCycle', () => {
    it('identifies mutual dependencies between entities', async () => {
      requirementRepository.find.mockImplementation(async (options?: unknown) => {
        const { where } = (options as { where?: Record<string, unknown> }) ?? {};
        if (where?.['type'] !== RequirementType.RELATIONSHIP) {
          return [];
        }

        if (where?.['entityType'] === 'Workspace' && where?.['entityId'] === 'entity-a') {
          return [
            createRequirement({
              requirementId: 'req-a-b',
              entityType: 'Workspace',
              entityId: 'entity-a',
              type: RequirementType.RELATIONSHIP,
              targetEntityId: 'entity-b',
            }),
          ];
        }

        if (where?.['entityType'] === 'Workspace' && where?.['entityId'] === 'entity-b') {
          return [
            createRequirement({
              requirementId: 'req-b-a',
              entityType: 'Workspace',
              entityId: 'entity-b',
              type: RequirementType.RELATIONSHIP,
              targetEntityId: 'entity-a',
            }),
          ];
        }

        return [];
      });

      const result = await service.detectCycle('Workspace', 'entity-a');

      expect(result).toBe(true);
    });

    it('identifies transitive dependency cycles', async () => {
      requirementRepository.find.mockImplementation(async (options?: unknown) => {
        const { where } = (options as { where?: Record<string, unknown> }) ?? {};
        if (where?.['type'] !== RequirementType.RELATIONSHIP) {
          return [];
        }

        if (where?.['entityType'] === 'Workspace' && where?.['entityId'] === 'entity-a') {
          return [
            createRequirement({
              requirementId: 'req-a-b',
              entityType: 'Workspace',
              entityId: 'entity-a',
              type: RequirementType.RELATIONSHIP,
              targetEntityId: 'entity-b',
            }),
          ];
        }

        if (where?.['entityType'] === 'Workspace' && where?.['entityId'] === 'entity-b') {
          return [
            createRequirement({
              requirementId: 'req-b-c',
              entityType: 'Workspace',
              entityId: 'entity-b',
              type: RequirementType.RELATIONSHIP,
              targetEntityId: 'entity-c',
            }),
          ];
        }

        if (where?.['entityType'] === 'Workspace' && where?.['entityId'] === 'entity-c') {
          return [
            createRequirement({
              requirementId: 'req-c-a',
              entityType: 'Workspace',
              entityId: 'entity-c',
              type: RequirementType.RELATIONSHIP,
              targetEntityId: 'entity-a',
            }),
          ];
        }

        return [];
      });

      const result = await service.detectCycle('Workspace', 'entity-a');

      expect(result).toBe(true);
    });

    it('returns false when no dependency cycle exists', async () => {
      requirementRepository.find.mockImplementation(async (options?: unknown) => {
        const { where } = (options as { where?: Record<string, unknown> }) ?? {};
        if (where?.['type'] !== RequirementType.RELATIONSHIP) {
          return [];
        }

        if (where?.['entityType'] === 'Workspace' && where?.['entityId'] === 'entity-a') {
          return [
            createRequirement({
              requirementId: 'req-a-b',
              entityType: 'Workspace',
              entityId: 'entity-a',
              type: RequirementType.RELATIONSHIP,
              targetEntityId: 'entity-b',
            }),
          ];
        }

        if (where?.['entityType'] === 'Workspace' && where?.['entityId'] === 'entity-b') {
          return [];
        }

        return [];
      });

      const result = await service.detectCycle('Workspace', 'entity-a');

      expect(result).toBe(false);
    });
  });
});
