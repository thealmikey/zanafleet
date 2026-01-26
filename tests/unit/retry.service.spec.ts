import { RetryService } from '../../src/core/event-bus/services/retry.service';
import { RetryDefaults } from '../../src/core/event-bus/event-bus.constants';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(() => {
    service = new RetryService();
  });

  describe('calculateDelay', () => {
    it('should calculate correct delay for attempt 0', () => {
      const delay = service.calculateDelay(0, 1000, 2);
      expect(delay).toBe(1000);
    });

    it('should calculate correct delay for attempt 1', () => {
      const delay = service.calculateDelay(1, 1000, 2);
      expect(delay).toBe(2000);
    });

    it('should calculate correct delay for attempt 2', () => {
      const delay = service.calculateDelay(2, 1000, 2);
      expect(delay).toBe(4000);
    });

    it('should use default values correctly', () => {
      const delay0 = service.calculateDelay(0, RetryDefaults.BASE_DELAY_MS, RetryDefaults.MULTIPLIER);
      const delay1 = service.calculateDelay(1, RetryDefaults.BASE_DELAY_MS, RetryDefaults.MULTIPLIER);
      const delay2 = service.calculateDelay(2, RetryDefaults.BASE_DELAY_MS, RetryDefaults.MULTIPLIER);

      expect(delay0).toBe(1000);
      expect(delay1).toBe(2000);
      expect(delay2).toBe(4000);
    });
  });

  describe('getDelaySequence', () => {
    it('should return correct sequence with defaults', () => {
      const sequence = service.getDelaySequence();

      expect(sequence).toEqual([1000, 2000, 4000]);
    });

    it('should return correct sequence with custom parameters', () => {
      const sequence = service.getDelaySequence(4, 500, 3);

      expect(sequence).toEqual([500, 1500, 4500, 13500]);
    });

    it('should return empty array for zero retries', () => {
      const sequence = service.getDelaySequence(0);

      expect(sequence).toEqual([]);
    });
  });

  describe('executeWithRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return success on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const resultPromise = service.executeWithRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const resultPromise = service.executeWithRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent failure');
      const operation = jest.fn().mockRejectedValue(error);

      const resultPromise = service.executeWithRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should use custom retry options', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      const resultPromise = service.executeWithRetry(operation, {
        maxRetries: 2,
        baseDelayMs: 100,
        multiplier: 2,
      });
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.attempts).toBe(3); // 1 initial + 2 retries
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const error = new Error('Fail');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const resultPromise = service.executeWithRetry(operation, { onRetry });
      await jest.runAllTimersAsync();
      await resultPromise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, error, 1000);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, error, 2000);
    });

    it('should respect exponential backoff delays', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      const resultPromise = service.executeWithRetry(operation);

      expect(operation).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(2000);
      expect(operation).toHaveBeenCalledTimes(3);

      await jest.advanceTimersByTimeAsync(4000);
      expect(operation).toHaveBeenCalledTimes(4);

      await resultPromise;
    });
  });

  describe('real-world scenarios', () => {
    it('should handle intermittent network failures', async () => {
      jest.useFakeTimers();

      let callCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({ data: 'response' });
      });

      const resultPromise = service.executeWithRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ data: 'response' });

      jest.useRealTimers();
    });

    it('should handle synchronous errors', async () => {
      jest.useFakeTimers();

      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      const resultPromise = service.executeWithRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Sync error');

      jest.useRealTimers();
    });
  });
});
