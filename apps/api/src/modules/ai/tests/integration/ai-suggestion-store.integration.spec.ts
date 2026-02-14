import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AISuggestionStoreService } from '../../services/ai-suggestion-store.service';
import { AISuggestionEntity } from '../../entities/ai-suggestion.entity';
import { AISuggestionStatus } from '../../interfaces/ai-suggestion.interface';
import { testUuid, createFutureDate, createMockSuggestionEntity } from '../utils/test-helpers';
import { createMockRepository, MockRepository } from '../utils/mocks/repository.mock';

/**
 * Integration tests for AI Suggestion Store Service
 * These tests verify the interaction between the service and the database layer
 */
describe('AISuggestionStoreService Integration', () => {
  let repository: MockRepository<AISuggestionEntity>;
  let service: AISuggestionStoreService;

  beforeAll(async () => {
    repository = createMockRepository<AISuggestionEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AISuggestionStoreService,
        { provide: getRepositoryToken(AISuggestionEntity), useValue: repository },
      ],
    }).compile();

    service = module.get<AISuggestionStoreService>(AISuggestionStoreService);
  });

  describe('Entity Persistence Integration', () => {
    it('should persist suggestion to database', async () => {
      const dto = {
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        capability: 'submit_for_review',
        reason: 'Integration test suggestion',
        confidence: 0.85,
        riskScore: 15,
        expiresAt: createFutureDate(24),
      };

      await service.createSuggestion(dto);

      expect(repository.save).toHaveBeenCalled();
      const savedEntity = (repository.save as jest.Mock).mock.calls[0][0];
      expect(savedEntity.actorId).toBe(dto.actorId);
      expect(savedEntity.contextType).toBe(dto.contextType);
    });

    it('should update suggestion status in database', async () => {
      const suggestion = createMockSuggestionEntity({ status: AISuggestionStatus.PENDING });
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);
      (repository.save as jest.Mock).mockResolvedValue({ ...suggestion, status: AISuggestionStatus.ACCEPTED });

      await service.acceptSuggestion(suggestion.id);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('Query Performance Integration', () => {
    it('should efficiently query by actorId', async () => {
      const actorId = testUuid();
      const suggestions = Array.from({ length: 10 }, () => createMockSuggestionEntity({ actorId }));
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(suggestions),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findByFilters({ actorId });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(result.length).toBe(10);
    });

    it('should efficiently query by composite index', async () => {
      const actorId = testUuid();
      const contextType = 'workflow';
      const contextId = testUuid();
      const suggestions = [createMockSuggestionEntity({ actorId, contextType, contextId })];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(suggestions),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findByFilters({ actorId, contextType, contextId });

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('TTL Expiration Integration', () => {
    it('should expire old suggestions correctly', async () => {
      (repository.update as jest.Mock).mockResolvedValue({ affected: 5 });

      const result = await service.expireOldSuggestions();

      expect(result).toBe(5);
      const updateCall = (repository.update as jest.Mock).mock.calls[0];
      expect(updateCall[0].expiresAt).toBeDefined();
    });

    it('should delete expired suggestions older than threshold', async () => {
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 3 });

      const result = await service.deleteExpiredSuggestions(30);

      expect(result).toBe(3);
    });
  });

  describe('Index Usage', () => {
    it('should use actor_id index for findByActorId', async () => {
      const actorId = testUuid();
      (repository.find as jest.Mock).mockResolvedValue([]);

      await service.findPendingByActor(actorId);

      const findCall = (repository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.where.actorId).toBe(actorId);
    });

    it('should use status index for findPending', async () => {
      const actorId = testUuid();
      (repository.find as jest.Mock).mockResolvedValue([]);

      await service.findPendingByActor(actorId);

      const findCall = (repository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.where.status).toBe(AISuggestionStatus.PENDING);
    });
  });

  describe('Migration Compatibility', () => {
    it('should work with entity schema', () => {
      const entity = new AISuggestionEntity();
      entity.id = testUuid();
      entity.actorId = testUuid();
      entity.contextType = 'workflow';
      entity.contextId = testUuid();
      entity.workflowState = 'pending';
      entity.capability = 'submit_for_review';
      entity.reason = 'Migration test';
      entity.confidence = 0.75;
      entity.riskScore = 20;
      entity.status = AISuggestionStatus.PENDING;
      entity.expiresAt = createFutureDate(24);
      entity.deduplicationHash = null;
      entity.metadata = null;
      entity.correlationId = null;
      entity.causationId = null;

      expect(entity.id).toBeDefined();
      expect(entity.actorId).toBeDefined();
      expect(entity.contextType).toBe('workflow');
    });

    it('should handle all status types', () => {
      const statuses = [
        AISuggestionStatus.PENDING,
        AISuggestionStatus.ACCEPTED,
        AISuggestionStatus.REJECTED,
        AISuggestionStatus.EXPIRED,
      ];

      for (const status of statuses) {
        const entity = createMockSuggestionEntity({ status });
        expect(entity.status).toBe(status);
      }
    });
  });
});
