import { CommandBus } from '@nestjs/cqrs';
import { NatsContext } from '@nestjs/microservices';
import { RiderTelemetryData } from '@zanafleet/contracts';

import { UpdateRiderLocationCommand } from '../../commands/update-rider-location.command';
import {
  RiderTelemetrySubscriber,
  BatchConfig,
} from '../../subscribers/rider-telemetry.subscriber';

describe('RiderTelemetrySubscriber', () => {
  let subscriber: RiderTelemetrySubscriber;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockContext: NatsContext;

  const validPayload = {
    riderId: 'rider-123',
    latitude: -1.2921,
    longitude: 36.8219,
    heading: 90,
    speed: 25,
    accuracy: 10,
    timestamp: '2024-01-15T10:00:00Z',
  };

  beforeEach(() => {
    mockCommandBus = {
      execute: jest.fn().mockResolvedValue({ updated: true, riderId: 'rider-123' }),
    } as unknown as jest.Mocked<CommandBus>;

    mockContext = {} as NatsContext;

    subscriber = new RiderTelemetrySubscriber(mockCommandBus);
  });

  describe('validateAndTransform', () => {
    describe('riderId validation', () => {
      it('should reject missing riderId', () => {
        const payload = { ...validPayload, riderId: undefined };
        expect(() => subscriber.validateAndTransform(payload as Record<string, unknown>)).toThrow(
          'Missing or invalid riderId',
        );
      });

      it('should reject empty riderId', () => {
        const payload = { ...validPayload, riderId: '' };
        expect(() => subscriber.validateAndTransform(payload)).toThrow(
          'Missing or invalid riderId',
        );
      });

      it('should reject whitespace-only riderId', () => {
        const payload = { ...validPayload, riderId: '   ' };
        expect(() => subscriber.validateAndTransform(payload)).toThrow(
          'Missing or invalid riderId',
        );
      });

      it('should reject non-string riderId', () => {
        const payload = { ...validPayload, riderId: 123 };
        expect(() => subscriber.validateAndTransform(payload as Record<string, unknown>)).toThrow(
          'Missing or invalid riderId',
        );
      });

      it('should trim whitespace from riderId', () => {
        const payload = { ...validPayload, riderId: '  rider-123  ' };
        const result = subscriber.validateAndTransform(payload);
        expect(result.riderId).toBe('rider-123');
      });
    });

    describe('latitude validation', () => {
      it('should reject missing latitude', () => {
        const payload = { ...validPayload, latitude: undefined };
        expect(() => subscriber.validateAndTransform(payload as Record<string, unknown>)).toThrow(
          'Missing or invalid latitude',
        );
      });

      it('should reject non-number latitude', () => {
        const payload = { ...validPayload, latitude: 'invalid' };
        expect(() => subscriber.validateAndTransform(payload as Record<string, unknown>)).toThrow(
          'Missing or invalid latitude',
        );
      });

      it('should reject NaN latitude', () => {
        const payload = { ...validPayload, latitude: NaN };
        expect(() => subscriber.validateAndTransform(payload)).toThrow(
          'Missing or invalid latitude',
        );
      });

      it('should reject Infinity latitude', () => {
        const payload = { ...validPayload, latitude: Infinity };
        expect(() => subscriber.validateAndTransform(payload)).toThrow(
          'Missing or invalid latitude',
        );
      });

      it('should reject latitude below -90', () => {
        const payload = { ...validPayload, latitude: -91 };
        expect(() => subscriber.validateAndTransform(payload)).toThrow('Latitude out of range');
      });

      it('should reject latitude above 90', () => {
        const payload = { ...validPayload, latitude: 91 };
        expect(() => subscriber.validateAndTransform(payload)).toThrow('Latitude out of range');
      });

      it('should accept latitude at boundaries', () => {
        expect(() =>
          subscriber.validateAndTransform({ ...validPayload, latitude: -90 }),
        ).not.toThrow();
        expect(() =>
          subscriber.validateAndTransform({ ...validPayload, latitude: 90 }),
        ).not.toThrow();
      });
    });

    describe('longitude validation', () => {
      it('should reject missing longitude', () => {
        const payload = { ...validPayload, longitude: undefined };
        expect(() => subscriber.validateAndTransform(payload as Record<string, unknown>)).toThrow(
          'Missing or invalid longitude',
        );
      });

      it('should reject non-number longitude', () => {
        const payload = { ...validPayload, longitude: 'invalid' };
        expect(() => subscriber.validateAndTransform(payload as Record<string, unknown>)).toThrow(
          'Missing or invalid longitude',
        );
      });

      it('should reject longitude below -180', () => {
        const payload = { ...validPayload, longitude: -181 };
        expect(() => subscriber.validateAndTransform(payload)).toThrow('Longitude out of range');
      });

      it('should reject longitude above 180', () => {
        const payload = { ...validPayload, longitude: 181 };
        expect(() => subscriber.validateAndTransform(payload)).toThrow('Longitude out of range');
      });

      it('should accept longitude at boundaries', () => {
        expect(() =>
          subscriber.validateAndTransform({ ...validPayload, longitude: -180 }),
        ).not.toThrow();
        expect(() =>
          subscriber.validateAndTransform({ ...validPayload, longitude: 180 }),
        ).not.toThrow();
      });
    });

    describe('timestamp validation', () => {
      it('should parse ISO string timestamp', () => {
        const result = subscriber.validateAndTransform(validPayload);
        expect(result.timestamp).toEqual(new Date('2024-01-15T10:00:00Z'));
      });

      it('should parse numeric timestamp', () => {
        const timestamp = Date.now();
        const payload = { ...validPayload, timestamp };
        const result = subscriber.validateAndTransform(payload);
        expect(result.timestamp).toEqual(new Date(timestamp));
      });

      it('should accept Date object', () => {
        const timestamp = new Date('2024-01-15T10:00:00Z');
        const payload = { ...validPayload, timestamp };
        const result = subscriber.validateAndTransform(payload as Record<string, unknown>);
        expect(result.timestamp).toEqual(timestamp);
      });

      it('should default to current time if timestamp is missing', () => {
        const before = Date.now();
        const payload = { ...validPayload, timestamp: undefined };
        const result = subscriber.validateAndTransform(payload as Record<string, unknown>);
        const after = Date.now();
        expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before);
        expect(result.timestamp.getTime()).toBeLessThanOrEqual(after);
      });

      it('should reject invalid timestamp string', () => {
        const payload = { ...validPayload, timestamp: 'not-a-date' };
        expect(() => subscriber.validateAndTransform(payload)).toThrow('Invalid timestamp');
      });
    });

    describe('optional fields', () => {
      it('should parse heading when provided', () => {
        const result = subscriber.validateAndTransform(validPayload);
        expect(result.heading).toBe(90);
      });

      it('should set heading to null when missing', () => {
        const payload = { ...validPayload, heading: undefined };
        const result = subscriber.validateAndTransform(payload as Record<string, unknown>);
        expect(result.heading).toBeNull();
      });

      it('should set heading to null when not a number', () => {
        const payload = { ...validPayload, heading: 'north' };
        const result = subscriber.validateAndTransform(payload as Record<string, unknown>);
        expect(result.heading).toBeNull();
      });

      it('should parse speed when provided', () => {
        const result = subscriber.validateAndTransform(validPayload);
        expect(result.speed).toBe(25);
      });

      it('should set speed to null when missing', () => {
        const payload = { ...validPayload, speed: undefined };
        const result = subscriber.validateAndTransform(payload as Record<string, unknown>);
        expect(result.speed).toBeNull();
      });

      it('should parse accuracy when provided', () => {
        const result = subscriber.validateAndTransform(validPayload);
        expect(result.accuracy).toBe(10);
      });

      it('should set accuracy to null when missing', () => {
        const payload = { ...validPayload, accuracy: undefined };
        const result = subscriber.validateAndTransform(payload as Record<string, unknown>);
        expect(result.accuracy).toBeNull();
      });
    });

    describe('successful transformation', () => {
      it('should return valid RiderTelemetryData', () => {
        const result = subscriber.validateAndTransform(validPayload);

        expect(result).toEqual<RiderTelemetryData>({
          riderId: 'rider-123',
          latitude: -1.2921,
          longitude: 36.8219,
          heading: 90,
          speed: 25,
          accuracy: 10,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        });
      });
    });
  });

  describe('handleRiderTelemetry (immediate mode)', () => {
    it('should dispatch UpdateRiderLocationCommand on valid message', async () => {
      await subscriber.handleRiderTelemetry(validPayload, mockContext);

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const command = mockCommandBus.execute.mock.calls[0][0] as UpdateRiderLocationCommand;
      expect(command).toBeInstanceOf(UpdateRiderLocationCommand);
      expect(command.telemetry.riderId).toBe('rider-123');
    });

    it('should not throw on invalid message', async () => {
      const invalidPayload = { riderId: 123 };

      await expect(
        subscriber.handleRiderTelemetry(invalidPayload as Record<string, unknown>, mockContext),
      ).resolves.not.toThrow();
    });

    it('should not dispatch command on invalid message', async () => {
      const invalidPayload = { riderId: 123 };

      await subscriber.handleRiderTelemetry(
        invalidPayload as Record<string, unknown>,
        mockContext,
      );

      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not throw when command execution fails', async () => {
      mockCommandBus.execute.mockRejectedValue(new Error('Command failed'));

      await expect(
        subscriber.handleRiderTelemetry(validPayload, mockContext),
      ).resolves.not.toThrow();
    });
  });

  describe('batch mode', () => {
    let batchSubscriber: RiderTelemetrySubscriber;
    const batchConfig: BatchConfig = { maxBatchSize: 3, maxWaitMs: 100 };

    beforeEach(() => {
      batchSubscriber = new RiderTelemetrySubscriber(mockCommandBus, batchConfig);
    });

    afterEach(async () => {
      await batchSubscriber.flushBatch();
    });

    it('should enable batch processing when config provided', () => {
      expect(batchSubscriber.isBatchEnabled()).toBe(true);
    });

    it('should not enable batch processing without config', () => {
      expect(subscriber.isBatchEnabled()).toBe(false);
    });

    it('should accumulate messages in buffer', async () => {
      await batchSubscriber.handleRiderTelemetry(validPayload, mockContext);

      expect(batchSubscriber.getBatchSize()).toBe(1);
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should flush when batch size reached', async () => {
      await batchSubscriber.handleRiderTelemetry(
        { ...validPayload, riderId: 'rider-1' },
        mockContext,
      );
      await batchSubscriber.handleRiderTelemetry(
        { ...validPayload, riderId: 'rider-2' },
        mockContext,
      );
      await batchSubscriber.handleRiderTelemetry(
        { ...validPayload, riderId: 'rider-3' },
        mockContext,
      );

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(3);
      expect(batchSubscriber.getBatchSize()).toBe(0);
    });

    it('should flush on timeout', async () => {
      await batchSubscriber.handleRiderTelemetry(validPayload, mockContext);

      expect(mockCommandBus.execute).not.toHaveBeenCalled();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(batchSubscriber.getBatchSize()).toBe(0);
    });

    it('should process all messages in batch even if some fail', async () => {
      mockCommandBus.execute
        .mockResolvedValueOnce({ updated: true })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ updated: true });

      await batchSubscriber.handleRiderTelemetry(
        { ...validPayload, riderId: 'rider-1' },
        mockContext,
      );
      await batchSubscriber.handleRiderTelemetry(
        { ...validPayload, riderId: 'rider-2' },
        mockContext,
      );
      await batchSubscriber.handleRiderTelemetry(
        { ...validPayload, riderId: 'rider-3' },
        mockContext,
      );

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(3);
    });

    it('should allow manual flush', async () => {
      await batchSubscriber.handleRiderTelemetry(validPayload, mockContext);

      expect(mockCommandBus.execute).not.toHaveBeenCalled();

      await batchSubscriber.flushBatch();

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(batchSubscriber.getBatchSize()).toBe(0);
    });

    it('should handle empty flush gracefully', async () => {
      await expect(batchSubscriber.flushBatch()).resolves.not.toThrow();
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });
  });
});
