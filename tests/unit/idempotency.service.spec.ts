import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    service = new IdempotencyService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    service.clear();
  });

  describe('isProcessed', () => {
    it('should return false for new event', () => {
      const result = service.isProcessed('event-123');

      expect(result).toBe(false);
    });

    it('should return true for processed event', () => {
      service.markAsProcessed('event-123');

      const result = service.isProcessed('event-123');

      expect(result).toBe(true);
    });

    it('should return false for different event IDs', () => {
      service.markAsProcessed('event-123');

      expect(service.isProcessed('event-456')).toBe(false);
    });
  });

  describe('markAsProcessed', () => {
    it('should mark event as processed', () => {
      service.markAsProcessed('event-123');

      expect(service.isProcessed('event-123')).toBe(true);
    });

    it('should handle marking the same event multiple times', () => {
      service.markAsProcessed('event-123');
      service.markAsProcessed('event-123');

      expect(service.isProcessed('event-123')).toBe(true);
      expect(service.getProcessedCount()).toBe(1);
    });
  });

  describe('checkAndMark', () => {
    it('should return false and mark for new event', () => {
      const isDuplicate = service.checkAndMark('event-123');

      expect(isDuplicate).toBe(false);
      expect(service.isProcessed('event-123')).toBe(true);
    });

    it('should return true for duplicate event', () => {
      service.markAsProcessed('event-123');

      const isDuplicate = service.checkAndMark('event-123');

      expect(isDuplicate).toBe(true);
    });

    it('should correctly detect duplicates in sequence', () => {
      expect(service.checkAndMark('event-1')).toBe(false);
      expect(service.checkAndMark('event-2')).toBe(false);
      expect(service.checkAndMark('event-1')).toBe(true);
      expect(service.checkAndMark('event-3')).toBe(false);
      expect(service.checkAndMark('event-2')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove processed event', () => {
      service.markAsProcessed('event-123');
      expect(service.isProcessed('event-123')).toBe(true);

      service.remove('event-123');

      expect(service.isProcessed('event-123')).toBe(false);
    });

    it('should handle removing non-existent event', () => {
      expect(() => service.remove('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all processed events', () => {
      service.markAsProcessed('event-1');
      service.markAsProcessed('event-2');
      service.markAsProcessed('event-3');

      service.clear();

      expect(service.getProcessedCount()).toBe(0);
      expect(service.isProcessed('event-1')).toBe(false);
    });
  });

  describe('getProcessedCount', () => {
    it('should return correct count', () => {
      expect(service.getProcessedCount()).toBe(0);

      service.markAsProcessed('event-1');
      expect(service.getProcessedCount()).toBe(1);

      service.markAsProcessed('event-2');
      expect(service.getProcessedCount()).toBe(2);

      service.remove('event-1');
      expect(service.getProcessedCount()).toBe(1);
    });
  });

  describe('duplicate detection scenarios', () => {
    it('should detect duplicate within the same batch', () => {
      const eventIds = ['evt-1', 'evt-2', 'evt-3', 'evt-1', 'evt-4', 'evt-2'];
      const duplicates: string[] = [];

      for (const eventId of eventIds) {
        if (service.checkAndMark(eventId)) {
          duplicates.push(eventId);
        }
      }

      expect(duplicates).toEqual(['evt-1', 'evt-2']);
    });

    it('should handle high volume of unique events', () => {
      const eventCount = 1000;

      for (let i = 0; i < eventCount; i++) {
        service.markAsProcessed(`event-${i}`);
      }

      expect(service.getProcessedCount()).toBe(eventCount);

      for (let i = 0; i < eventCount; i++) {
        expect(service.isProcessed(`event-${i}`)).toBe(true);
      }
    });
  });
});
