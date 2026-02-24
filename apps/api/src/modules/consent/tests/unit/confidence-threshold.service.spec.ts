import { ConfidenceThresholdService } from '../../services/confidence-threshold.service';

describe('ConfidenceThresholdService', () => {
  let service: ConfidenceThresholdService;

  beforeEach(() => {
    service = new ConfidenceThresholdService();
  });

  describe('getThreshold', () => {
    it('should return 0.95 for Payment capabilities', () => {
      expect(service.getThreshold('Payment')).toBe(0.95);
      expect(service.getThreshold('ProcessPayment')).toBe(0.95);
      expect(service.getThreshold('Refund')).toBe(0.95);
    });

    it('should return 0.90 for Order capabilities', () => {
      expect(service.getThreshold('CreateOrder')).toBe(0.9);
      expect(service.getThreshold('UpdateOrder')).toBe(0.9);
      expect(service.getThreshold('CancelOrder')).toBe(0.9);
    });

    it('should return 0.85 for MoveEstimate capabilities', () => {
      expect(service.getThreshold('RequestMoveEstimate')).toBe(0.85);
      expect(service.getThreshold('MoveEstimate')).toBe(0.85);
    });

    it('should return 0.85 for Delivery capabilities', () => {
      expect(service.getThreshold('CreateDelivery')).toBe(0.85);
      expect(service.getThreshold('UpdateDelivery')).toBe(0.85);
    });

    it('should return 0.70 for unknown capabilities', () => {
      expect(service.getThreshold('UnknownCapability')).toBe(0.7);
      expect(service.getThreshold('DoSomething')).toBe(0.7);
    });

    it('should return 0.60 for Search capabilities', () => {
      expect(service.getThreshold('Search')).toBe(0.6);
    });

    it('should return 0.50 for View and List capabilities', () => {
      expect(service.getThreshold('View')).toBe(0.5);
      expect(service.getThreshold('List')).toBe(0.5);
    });

    it('should match case-insensitively', () => {
      expect(service.getThreshold('payment')).toBe(0.95);
      expect(service.getThreshold('CREATEORDER')).toBe(0.9);
    });
  });

  describe('shouldPropose', () => {
    it('should return true when confidence meets threshold', () => {
      expect(service.shouldPropose(0.95, 'Payment')).toBe(true);
      expect(service.shouldPropose(0.9, 'CreateOrder')).toBe(true);
      expect(service.shouldPropose(0.85, 'RequestMoveEstimate')).toBe(true);
    });

    it('should return false when confidence is below threshold', () => {
      expect(service.shouldPropose(0.94, 'Payment')).toBe(false);
      expect(service.shouldPropose(0.89, 'CreateOrder')).toBe(false);
      expect(service.shouldPropose(0.84, 'RequestMoveEstimate')).toBe(false);
    });

    it('should use default threshold for unknown capabilities', () => {
      expect(service.shouldPropose(0.7, 'Unknown')).toBe(true);
      expect(service.shouldPropose(0.69, 'Unknown')).toBe(false);
    });
  });

  describe('shouldClarify', () => {
    it('should return true when confidence is below threshold but above minimum bar', () => {
      // Payment: threshold 0.95, minimum bar ~0.665 (70% of 0.95)
      // 0.80 is below 0.95 but above 0.665
      expect(service.shouldClarify(0.8, 'Payment')).toBe(true);

      // Order: threshold 0.90, minimum bar ~0.63
      expect(service.shouldClarify(0.7, 'CreateOrder')).toBe(true);
    });

    it('should return false when confidence meets threshold', () => {
      expect(service.shouldClarify(0.96, 'Payment')).toBe(false);
      expect(service.shouldClarify(0.91, 'CreateOrder')).toBe(false);
    });

    it('should return false when confidence is too low (below minimum bar)', () => {
      // Payment: threshold 0.95, minimum bar ~0.665
      expect(service.shouldClarify(0.6, 'Payment')).toBe(false);
    });
  });

  describe('shouldReject', () => {
    it('should return true when confidence is below minimum bar', () => {
      // Payment: threshold 0.95, minimum bar ~0.665
      expect(service.shouldReject(0.6, 'Payment')).toBe(true);
      expect(service.shouldReject(0.5, 'Payment')).toBe(true);
    });

    it('should return false when confidence meets or exceeds minimum bar', () => {
      // Payment: threshold 0.95, minimum bar ~0.665
      expect(service.shouldReject(0.7, 'Payment')).toBe(false);
      expect(service.shouldReject(0.95, 'Payment')).toBe(false);
    });
  });

  describe('getRecommendedAction', () => {
    it('should return "propose" when confidence meets threshold', () => {
      expect(service.getRecommendedAction(0.95, 'Payment')).toBe('propose');
      expect(service.getRecommendedAction(0.9, 'CreateOrder')).toBe('propose');
    });

    it('should return "clarify" when confidence is between minimum bar and threshold', () => {
      expect(service.getRecommendedAction(0.8, 'Payment')).toBe('clarify');
      expect(service.getRecommendedAction(0.7, 'CreateOrder')).toBe('clarify');
    });

    it('should return "reject" when confidence is below minimum bar', () => {
      expect(service.getRecommendedAction(0.6, 'Payment')).toBe('reject');
      expect(service.getRecommendedAction(0.5, 'CreateOrder')).toBe('reject');
    });
  });

  describe('setThreshold', () => {
    it('should set a custom threshold', () => {
      service.setThreshold('CustomCapability', 0.8);
      expect(service.getThreshold('CustomCapability')).toBe(0.8);
    });

    it('should throw error for invalid threshold', () => {
      expect(() => service.setThreshold('Test', 1.5)).toThrow('between 0 and 1');
      expect(() => service.setThreshold('Test', -0.5)).toThrow('between 0 and 1');
    });
  });

  describe('resetThreshold', () => {
    it('should reset threshold to default', () => {
      service.setThreshold('Payment', 0.5);
      service.resetThreshold('Payment');
      expect(service.getThreshold('Payment')).toBe(0.95);
    });

    it('should use default for unknown capabilities', () => {
      service.setThreshold('UnknownCap', 0.5);
      service.resetThreshold('UnknownCap');
      expect(service.getThreshold('UnknownCap')).toBe(0.7);
    });
  });

  describe('getAllThresholds', () => {
    it('should return all configured thresholds', () => {
      const thresholds = service.getAllThresholds();
      expect(thresholds).toHaveProperty('Payment');
      expect(thresholds).toHaveProperty('CreateOrder');
      expect(thresholds).toHaveProperty('RequestMoveEstimate');
    });
  });
});
