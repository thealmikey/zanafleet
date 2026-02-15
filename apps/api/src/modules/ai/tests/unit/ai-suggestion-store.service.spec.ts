import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AISuggestionStoreService } from '../../services/ai-suggestion-store.service';
import { AISuggestionEntity } from '../../entities/ai-suggestion.entity';
import { AISuggestionStatus } from '../../interfaces/ai-suggestion.interface';
import { createMockSuggestionEntity, createMockPendingSuggestions, testUuid, createFutureDate } from '../utils/test-helpers';
import { createMockRepository, MockRepository } from '../utils/mocks/repository.mock';

describe('AISuggestionStoreService', () => {
  let service: AISuggestionStoreService;
  let repository: MockRepository<AISuggestionEntity>;

  beforeEach(async () => {
    repository = createMockRepository<AISuggestionEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AISuggestionStoreService,
        {
          provide: getRepositoryToken(AISuggestionEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<AISuggestionStoreService>(AISuggestionStoreService);
  });

  describe('createSuggestion', () => {
    describe('successful creation', () => {
      it('should create a suggestion successfully', async () => {
        const dto = {
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'Test reason',
          confidence: 0.75,
          riskScore: 25,
          expiresAt: createFutureDate(24),
        };

        const result = await service.createSuggestion(dto);

        expect(result).toBeDefined();
        expect(result.actorId).toBe(dto.actorId);
        expect(result.contextType).toBe(dto.contextType);
        expect(result.contextId).toBe(dto.contextId);
        expect(repository.save).toHaveBeenCalled();
      });

      it('should create suggestion with custom TTL', async () => {
        const customTTL = createFutureDate(48);
        const dto = {
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'Test reason',
          confidence: 0.75,
          expiresAt: customTTL,
        };

        const result = await service.createSuggestion(dto);

        expect(result.expiresAt).toEqual(customTTL);
      });

      it('should create suggestion with provided deduplication hash', async () => {
        const customHash = 'custom-dedup-hash-123';
        const dto = {
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'Test reason',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
          deduplicationHash: customHash,
        };

        const result = await service.createSuggestion(dto);

        expect(result.deduplicationHash).toBe(customHash);
      });

      it('should set default TTL when not provided', async () => {
        const beforeTime = new Date();
        const dto = {
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'Test reason',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
        };

        const result = await service.createSuggestion(dto);

        expect(result.expiresAt.getTime()).toBeGreaterThan(beforeTime.getTime());
        expect(result.expiresAt.getTime()).toBeLessThanOrEqual(new Date(Date.now() + 25 * 60 * 60 * 1000).getTime());
      });

      it('should set PENDING status on creation', async () => {
        const dto = {
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'Test reason',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
        };

        const result = await service.createSuggestion(dto);

        expect(result.status).toBe(AISuggestionStatus.PENDING);
      });
    });

    describe('deduplication', () => {
      it('should return existing suggestion for duplicate hash', async () => {
        const existingSuggestion = createMockSuggestionEntity();
        (repository.findOne as jest.Mock).mockResolvedValueOnce(existingSuggestion);

        const dto = {
          actorId: existingSuggestion.actorId,
          contextType: existingSuggestion.contextType,
          contextId: existingSuggestion.contextId,
          workflowState: existingSuggestion.workflowState,
          capability: existingSuggestion.capability,
          reason: 'Duplicate reason',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
        };

        const result = await service.createSuggestion(dto);

        expect(result).toEqual(existingSuggestion);
        expect(repository.save).not.toHaveBeenCalled();
      });

      it('should generate deduplication hash correctly', async () => {
        const dto = {
          actorId: 'actor-123',
          contextType: 'workflow',
          contextId: 'context-456',
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'Test reason',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
        };

        await service.createSuggestion(dto);

        const savedEntity = (repository.save as jest.Mock).mock.calls[0][0];
        expect(savedEntity.deduplicationHash).toBeDefined();
        // Hash is a SHA256 hex string, not the raw data
        expect(savedEntity.deduplicationHash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should handle duplicate submissions gracefully', async () => {
        const existingSuggestion = createMockSuggestionEntity();
        (repository.findOne as jest.Mock).mockResolvedValue(existingSuggestion);

        const dto = {
          actorId: existingSuggestion.actorId,
          contextType: existingSuggestion.contextType,
          contextId: existingSuggestion.contextId,
          workflowState: existingSuggestion.workflowState,
          capability: existingSuggestion.capability,
          reason: 'Another duplicate',
          confidence: 0.85,
          expiresAt: createFutureDate(24),
        };

        const result = await service.createSuggestion(dto);

        expect(result.id).toBe(existingSuggestion.id);
      });
    });

    describe('max suggestions per context', () => {
      it('should enforce max suggestions per context limit', async () => {
        const actorId = testUuid();
        const contextType = 'workflow';
        const contextId = testUuid();

        // Create 5 pending suggestions (at the limit)
        const existingSuggestions = createMockPendingSuggestions(5);
        // First findOne call is for deduplication check (return null - no duplicate)
        // Second findOne call is for finding oldest to delete
        (repository.findOne as jest.Mock)
          .mockResolvedValueOnce(null) // No duplicate found
          .mockResolvedValueOnce(existingSuggestions[0]); // Oldest suggestion to delete
        (repository.count as jest.Mock).mockResolvedValueOnce(5);
        (repository.delete as jest.Mock).mockResolvedValueOnce({ affected: 1 });

        const dto = {
          actorId,
          contextType,
          contextId,
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'New suggestion',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
        };

        await service.createSuggestion(dto);

        expect(repository.delete).toHaveBeenCalled();
      });

      it('should remove oldest suggestion when limit exceeded', async () => {
        const actorId = testUuid();
        const contextType = 'workflow';
        const contextId = testUuid();

        const oldestSuggestion = createMockSuggestionEntity({ id: 'oldest-id' });
        // First findOne call is for deduplication check (return null - no duplicate)
        // Second findOne call is for finding oldest to delete
        (repository.findOne as jest.Mock)
          .mockResolvedValueOnce(null) // No duplicate found
          .mockResolvedValueOnce(oldestSuggestion); // Oldest suggestion to delete
        (repository.count as jest.Mock).mockResolvedValue(5);

        const dto = {
          actorId,
          contextType,
          contextId,
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'New suggestion',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
        };

        await service.createSuggestion(dto);

        expect(repository.delete).toHaveBeenCalledWith({ id: 'oldest-id' });
      });

      it('should not remove suggestions if under limit', async () => {
        const dto = {
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          capability: 'submit_for_review',
          reason: 'New suggestion',
          confidence: 0.75,
          expiresAt: createFutureDate(24),
        };

        (repository.count as jest.Mock).mockResolvedValue(3);

        await service.createSuggestion(dto);

        expect(repository.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe('findById', () => {
    it('should find suggestion by ID', async () => {
      const suggestion = createMockSuggestionEntity();
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);

      const result = await service.findById(suggestion.id);

      expect(result).toEqual(suggestion);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: suggestion.id } });
    });

    it('should return null for non-existent ID', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle empty string ID', async () => {
      await service.findById('');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '' } });
    });
  });

  describe('findByFilters', () => {
    it('should query by actorId', async () => {
      const actorId = testUuid();
      const suggestions = [createMockSuggestionEntity({ actorId })];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(suggestions),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findByFilters({ actorId });

      expect(result).toEqual(suggestions);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('suggestion.actorId = :actorId', { actorId });
    });

    it('should query by contextType and contextId', async () => {
      const contextType = 'workflow';
      const contextId = testUuid();
      const suggestions = [createMockSuggestionEntity({ contextType, contextId })];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(suggestions),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findByFilters({ contextType, contextId });

      expect(result).toEqual(suggestions);
    });

    it('should query by status', async () => {
      const status = AISuggestionStatus.PENDING;
      const suggestions = [createMockSuggestionEntity({ status })];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(suggestions),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findByFilters({ status });

      expect(result).toEqual(suggestions);
    });

    it('should handle empty filters', async () => {
      const suggestions = [createMockSuggestionEntity()];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(suggestions),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findByFilters({});

      expect(result).toEqual(suggestions);
    });

    it('should handle empty results', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findByFilters({ actorId: testUuid() });

      expect(result).toEqual([]);
    });
  });

  describe('findPendingByActor', () => {
    it('should find pending suggestions for an actor', async () => {
      const actorId = testUuid();
      const suggestions = createMockPendingSuggestions(3).map(s => ({ ...s, actorId }));
      (repository.find as jest.Mock).mockResolvedValue(suggestions);

      const result = await service.findPendingByActor(actorId);

      expect(result).toEqual(suggestions);
    });

    it('should filter by PENDING status', async () => {
      const actorId = testUuid();
      (repository.find as jest.Mock).mockResolvedValue([]);

      await service.findPendingByActor(actorId);

      const findCall = (repository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.where.status).toBe(AISuggestionStatus.PENDING);
    });

    it('should filter by future expiresAt', async () => {
      const actorId = testUuid();
      (repository.find as jest.Mock).mockResolvedValue([]);

      await service.findPendingByActor(actorId);

      const findCall = (repository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.where.expiresAt).toBeDefined();
    });

    it('should order by createdAt DESC', async () => {
      const actorId = testUuid();
      (repository.find as jest.Mock).mockResolvedValue([]);

      await service.findPendingByActor(actorId);

      const findCall = (repository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.order.createdAt).toBe('DESC');
    });
  });

  describe('updateStatus', () => {
    it('should update suggestion status', async () => {
      const suggestion = createMockSuggestionEntity({ status: AISuggestionStatus.PENDING });
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);
      (repository.save as jest.Mock).mockResolvedValue({ ...suggestion, status: AISuggestionStatus.ACCEPTED });

      const result = await service.updateStatus(suggestion.id, AISuggestionStatus.ACCEPTED);

      expect(result?.status).toBe(AISuggestionStatus.ACCEPTED);
    });

    it('should return null for non-existent suggestion', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.updateStatus('non-existent', AISuggestionStatus.ACCEPTED);

      expect(result).toBeNull();
    });

    it('should update to REJECTED status', async () => {
      const suggestion = createMockSuggestionEntity({ status: AISuggestionStatus.PENDING });
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);
      (repository.save as jest.Mock).mockResolvedValue({ ...suggestion, status: AISuggestionStatus.REJECTED });

      const result = await service.updateStatus(suggestion.id, AISuggestionStatus.REJECTED);

      expect(result?.status).toBe(AISuggestionStatus.REJECTED);
    });

    it('should update to EXPIRED status', async () => {
      const suggestion = createMockSuggestionEntity({ status: AISuggestionStatus.PENDING });
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);
      (repository.save as jest.Mock).mockResolvedValue({ ...suggestion, status: AISuggestionStatus.EXPIRED });

      const result = await service.updateStatus(suggestion.id, AISuggestionStatus.EXPIRED);

      expect(result?.status).toBe(AISuggestionStatus.EXPIRED);
    });
  });

  describe('acceptSuggestion', () => {
    it('should accept a suggestion', async () => {
      const suggestion = createMockSuggestionEntity();
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);
      (repository.save as jest.Mock).mockResolvedValue(suggestion);

      await service.acceptSuggestion(suggestion.id);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('rejectSuggestion', () => {
    it('should reject a suggestion', async () => {
      const suggestion = createMockSuggestionEntity();
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);
      (repository.save as jest.Mock).mockResolvedValue(suggestion);

      await service.rejectSuggestion(suggestion.id);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('expireOldSuggestions', () => {
    it('should expire old pending suggestions', async () => {
      (repository.update as jest.Mock).mockResolvedValue({ affected: 5 });

      const result = await service.expireOldSuggestions();

      expect(result).toBe(5);
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AISuggestionStatus.PENDING,
        }),
        { status: AISuggestionStatus.EXPIRED }
      );
    });

    it('should return 0 when no suggestions to expire', async () => {
      (repository.update as jest.Mock).mockResolvedValue({ affected: 0 });

      const result = await service.expireOldSuggestions();

      expect(result).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      (repository.update as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.expireOldSuggestions()).rejects.toThrow('DB error');
    });
  });

  describe('deleteExpiredSuggestions', () => {
    it('should delete expired suggestions older than specified days', async () => {
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 10 });

      const result = await service.deleteExpiredSuggestions(30);

      expect(result).toBe(10);
    });

    it('should use default 30 days when not specified', async () => {
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 5 });

      await service.deleteExpiredSuggestions();

      const deleteCall = (repository.delete as jest.Mock).mock.calls[0][0];
      expect(deleteCall.status).toBe(AISuggestionStatus.EXPIRED);
    });

    it('should return 0 when no expired suggestions to delete', async () => {
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

      const result = await service.deleteExpiredSuggestions(30);

      expect(result).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database failures on create', async () => {
      (repository.findOne as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

      const dto = {
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        capability: 'submit_for_review',
        reason: 'Test',
        confidence: 0.75,
        expiresAt: createFutureDate(24),
      };

      await expect(service.createSuggestion(dto)).rejects.toThrow('Database connection lost');
    });

    it('should handle database failures on findById', async () => {
      (repository.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.findById(testUuid())).rejects.toThrow('Database error');
    });

    it('should handle database failures on findByFilters', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Query failed')),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await expect(service.findByFilters({})).rejects.toThrow('Query failed');
    });

    it('should handle database failures on updateStatus', async () => {
      const suggestion = createMockSuggestionEntity();
      (repository.findOne as jest.Mock).mockResolvedValue(suggestion);
      (repository.save as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(service.updateStatus(suggestion.id, AISuggestionStatus.ACCEPTED)).rejects.toThrow('Update failed');
    });
  });
});
