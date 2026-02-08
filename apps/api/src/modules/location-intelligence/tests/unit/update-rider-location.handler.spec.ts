import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UpdateRiderLocationHandler } from '../../handlers/update-rider-location.handler';
import { UpdateRiderLocationCommand } from '../../commands/update-rider-location.command';
import { RiderLocationRepository } from '../../repositories/rider-location.repository';
import { H3Service } from '../../services/h3.service';
import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { RedisService } from '../../../../core/redis/redis.service';
import { RiderTelemetryData, RiderLocationUpdatedEventV1 } from '@zanafleet/contracts';

describe('UpdateRiderLocationHandler', () => {
  let handler: UpdateRiderLocationHandler;
  let mockRepository: jest.Mocked<RiderLocationRepository>;
  let mockH3Service: jest.Mocked<H3Service>;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const validTelemetry: RiderTelemetryData = {
    riderId: 'rider-123',
    latitude: -1.2921,
    longitude: 36.8219,
    heading: 90,
    speed: 25,
    accuracy: 10,
    timestamp: new Date('2024-01-15T10:00:00Z'),
  };

  const mockH3Indices = {
    fine: '8928342a93fffff',
    medium: '8728342a9ffffff',
    coarse: '8528342bfffffff',
  };

  beforeEach(() => {
    mockRepository = {
      upsertSnapshot: jest.fn().mockResolvedValue(undefined),
      appendHistory: jest.fn().mockResolvedValue(undefined),
      findNearbyRiders: jest.fn(),
      findRidersInH3Cells: jest.fn(),
      findRidersInPolygon: jest.fn(),
      getRiderPath: jest.fn(),
    } as unknown as jest.Mocked<RiderLocationRepository>;

    mockH3Service = {
      pointToMultiResolution: jest.fn().mockReturnValue(mockH3Indices),
      pointToH3: jest.fn(),
      h3ToPoint: jest.fn(),
      getNeighbors: jest.fn(),
      h3ToPolygon: jest.fn(),
    } as unknown as jest.Mocked<H3Service>;

    mockEventBus = {
      publishEvent: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn(),
      serializeEvent: jest.fn(),
      deserializeEvent: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<EventBusService>;

    mockRedisService = {
      setRateLimitKey: jest.fn().mockResolvedValue(true),
      getClient: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        return cb({} as any);
      }),
    } as unknown as jest.Mocked<DataSource>;

    mockConfigService = {
      get: jest.fn().mockReturnValue(100), // 100ms rate limit for faster tests
    } as unknown as jest.Mocked<ConfigService>;

    handler = new UpdateRiderLocationHandler(
      mockRepository,
      mockH3Service,
      mockEventBus,
      mockRedisService,
      mockDataSource,
      mockConfigService,
    );
  });

  describe('coordinate validation', () => {
    it('should reject latitude below -90', async () => {
      const command = new UpdateRiderLocationCommand({
        ...validTelemetry,
        latitude: -91,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid latitude');
    });

    it('should reject latitude above 90', async () => {
      const command = new UpdateRiderLocationCommand({
        ...validTelemetry,
        latitude: 91,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid latitude');
    });

    it('should reject longitude below -180', async () => {
      const command = new UpdateRiderLocationCommand({
        ...validTelemetry,
        longitude: -181,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid longitude');
    });

    it('should reject longitude above 180', async () => {
      const command = new UpdateRiderLocationCommand({
        ...validTelemetry,
        longitude: 181,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid longitude');
    });

    it('should accept valid coordinates at boundaries', async () => {
      const command = new UpdateRiderLocationCommand({
        ...validTelemetry,
        latitude: 90,
        longitude: 180,
      });

      const result = await handler.execute(command);
      expect(result.updated).toBe(true);
    });

    it('should accept valid negative coordinates at boundaries', async () => {
      const command = new UpdateRiderLocationCommand({
        ...validTelemetry,
        latitude: -90,
        longitude: -180,
      });

      const result = await handler.execute(command);
      expect(result.updated).toBe(true);
    });
  });

  describe('successful update flow', () => {
    it('should compute H3 indices', async () => {
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await handler.execute(command);

      expect(mockH3Service.pointToMultiResolution).toHaveBeenCalledWith({
        latitude: validTelemetry.latitude,
        longitude: validTelemetry.longitude,
      });
    });

    it('should upsert snapshot via repository within transaction', async () => {
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await handler.execute(command);

      expect(mockRepository.upsertSnapshot).toHaveBeenCalledWith(
        {
          riderId: validTelemetry.riderId,
          latitude: validTelemetry.latitude,
          longitude: validTelemetry.longitude,
          heading: validTelemetry.heading,
          speed: validTelemetry.speed,
          accuracy: validTelemetry.accuracy,
          recordedAt: validTelemetry.timestamp,
        },
        expect.anything(),
      );
    });

    it('should append to history via repository within transaction', async () => {
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await handler.execute(command);

      expect(mockRepository.appendHistory).toHaveBeenCalledWith(
        {
          riderId: validTelemetry.riderId,
          latitude: validTelemetry.latitude,
          longitude: validTelemetry.longitude,
          heading: validTelemetry.heading,
          speed: validTelemetry.speed,
          accuracy: validTelemetry.accuracy,
          recordedAt: validTelemetry.timestamp,
        },
        expect.anything(),
      );
    });

    it('should publish RiderLocationUpdatedEventV1 after successful update', async () => {
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await handler.execute(command);

      expect(mockEventBus.publishEvent).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publishEvent.mock
        .calls[0][0] as RiderLocationUpdatedEventV1;

      expect(publishedEvent.eventType).toBe('Location.RiderLocation.UpdatedV1');
      expect(publishedEvent.eventVersion).toBe('1');
      expect(publishedEvent.aggregateId).toBe(validTelemetry.riderId);
      expect(publishedEvent.aggregateType).toBe('RiderLocation');
      expect(publishedEvent.payload).toEqual({
        riderId: validTelemetry.riderId,
        latitude: validTelemetry.latitude,
        longitude: validTelemetry.longitude,
        h3IndexFine: mockH3Indices.fine,
        h3IndexMedium: mockH3Indices.medium,
        h3IndexCoarse: mockH3Indices.coarse,
        heading: validTelemetry.heading,
        speed: validTelemetry.speed,
        accuracy: validTelemetry.accuracy,
        timestamp: validTelemetry.timestamp,
      });
    });

    it('should return updated: true on successful update', async () => {
      const command = new UpdateRiderLocationCommand(validTelemetry);

      const result = await handler.execute(command);

      expect(result.updated).toBe(true);
      expect(result.riderId).toBe(validTelemetry.riderId);
      expect(result.reason).toBeUndefined();
    });

    it('should handle null optional fields', async () => {
      const telemetryWithNulls: RiderTelemetryData = {
        riderId: 'rider-456',
        latitude: 0,
        longitude: 0,
        heading: null,
        speed: null,
        accuracy: null,
        timestamp: new Date(),
      };
      const command = new UpdateRiderLocationCommand(telemetryWithNulls);

      const result = await handler.execute(command);

      expect(result.updated).toBe(true);
      expect(mockRepository.upsertSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          heading: null,
          speed: null,
          accuracy: null,
        }),
        expect.anything(),
      );
    });
  });

  describe('rate limiting', () => {
    it('should skip update if last update was too recent', async () => {
      const command = new UpdateRiderLocationCommand(validTelemetry);

      mockRedisService.setRateLimitKey.mockResolvedValueOnce(true);
      const result1 = await handler.execute(command);
      expect(result1.updated).toBe(true);

      mockRedisService.setRateLimitKey.mockResolvedValueOnce(false);
      const result2 = await handler.execute(command);
      expect(result2.updated).toBe(false);
      expect(result2.reason).toContain('Rate limited');
    });

    it('should not call repository when rate-limited', async () => {
      mockRedisService.setRateLimitKey.mockResolvedValue(false);
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await handler.execute(command);

      expect(mockRepository.upsertSnapshot).not.toHaveBeenCalled();
      expect(mockRepository.appendHistory).not.toHaveBeenCalled();
    });

    it('should not publish event when rate-limited', async () => {
      mockRedisService.setRateLimitKey.mockResolvedValue(false);
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await handler.execute(command);

      expect(mockEventBus.publishEvent).not.toHaveBeenCalled();
    });

    it('should rate limit per rider independently', async () => {
      const command1 = new UpdateRiderLocationCommand(validTelemetry);
      const command2 = new UpdateRiderLocationCommand({
        ...validTelemetry,
        riderId: 'rider-different',
      });

      mockRedisService.setRateLimitKey.mockResolvedValue(true);

      await handler.execute(command1);
      const result = await handler.execute(command2);

      expect(result.updated).toBe(true);
      expect(mockRedisService.setRateLimitKey).toHaveBeenCalledWith(
        'rate_limit:rider:rider-123',
        expect.any(Number),
      );
      expect(mockRedisService.setRateLimitKey).toHaveBeenCalledWith(
        'rate_limit:rider:rider-different',
        expect.any(Number),
      );
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors', async () => {
      mockRepository.upsertSnapshot.mockRejectedValue(new Error('DB error'));
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await expect(handler.execute(command)).rejects.toThrow('DB error');
    });

    it('should not publish event if repository fails', async () => {
      mockRepository.upsertSnapshot.mockRejectedValue(new Error('DB error'));
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await expect(handler.execute(command)).rejects.toThrow();
      expect(mockEventBus.publishEvent).not.toHaveBeenCalled();
    });
  });

  describe('transactional behavior', () => {
    it('should execute upsertSnapshot and appendHistory within a transaction', async () => {
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await handler.execute(command);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockRepository.upsertSnapshot).toHaveBeenCalled();
      expect(mockRepository.appendHistory).toHaveBeenCalled();
    });

    it('should not publish event if transaction fails', async () => {
      mockDataSource.transaction.mockRejectedValue(new Error('Transaction failed'));
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await expect(handler.execute(command)).rejects.toThrow('Transaction failed');
      expect(mockEventBus.publishEvent).not.toHaveBeenCalled();
    });

    it('should rollback upsertSnapshot if appendHistory fails within transaction', async () => {
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        await cb({} as any);
        throw new Error('appendHistory failed');
      });
      const command = new UpdateRiderLocationCommand(validTelemetry);

      await expect(handler.execute(command)).rejects.toThrow('appendHistory failed');
      expect(mockEventBus.publishEvent).not.toHaveBeenCalled();
    });
  });
});
