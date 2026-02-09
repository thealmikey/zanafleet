import { EventBusService } from '@api/core/event-bus';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateCampaignCommand } from '../../commands/create-campaign.command';
import { IncentiveType, CampaignStatus, FundingSource } from '../../dto/incentive.enums';
import { CampaignEntity } from '../../entities/campaign.entity';
import { CampaignCreatedEventV1 } from '../../events/campaign-created.event';
import { CreateCampaignCommandHandler } from '../../handlers/create-campaign.handler';

describe('CreateCampaignCommandHandler', () => {
  let handler: CreateCampaignCommandHandler;
  let mockRepository: jest.Mocked<Repository<CampaignEntity>>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  const validCommand = new CreateCampaignCommand({
    name: 'Summer Sale',
    description: '20% off all deliveries',
    incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
    fundingSource: FundingSource.PLATFORM,
    discountValue: 20,
    maxDiscountAmount: 50,
    budgetTotal: 10000,
    usageLimit: 500,
    validFrom: new Date('2024-01-01T00:00:00.000Z'),
    validUntil: new Date('2024-12-31T23:59:59.000Z'),
  });

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<CampaignEntity>>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;
  });

  describe('without EventBusService', () => {
    beforeEach(() => {
      handler = new CreateCampaignCommandHandler(mockRepository, mockEventBus, undefined);
    });

    it('should save entity to repository', async () => {
      await handler.execute(validCommand);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedEntity = mockRepository.save.mock.calls[0][0] as CampaignEntity;
      expect(savedEntity.name).toBe(validCommand.name);
      expect(savedEntity.incentiveType).toBe(validCommand.incentiveType);
      expect(savedEntity.discountValue).toBe('20.00');
      expect(savedEntity.budgetTotal).toBe('10000.00');
      expect(savedEntity.budgetUsed).toBe('0.00');
      expect(savedEntity.usageCount).toBe(0);
    });

    it('should set ACTIVE status when validFrom is in the past', async () => {
      const activeCommand = new CreateCampaignCommand({
        ...validCommand,
        validFrom: new Date('2020-01-01T00:00:00.000Z'),
      });

      await handler.execute(activeCommand);

      const savedEntity = mockRepository.save.mock.calls[0][0] as CampaignEntity;
      expect(savedEntity.status).toBe(CampaignStatus.ACTIVE);
    });

    it('should set DRAFT status when validFrom is in the future', async () => {
      const futureCommand = new CreateCampaignCommand({
        ...validCommand,
        validFrom: new Date('2099-01-01T00:00:00.000Z'),
      });

      await handler.execute(futureCommand);

      const savedEntity = mockRepository.save.mock.calls[0][0] as CampaignEntity;
      expect(savedEntity.status).toBe(CampaignStatus.DRAFT);
    });

    it('should publish CampaignCreatedEventV1 to event bus', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as CampaignCreatedEventV1;
      expect(publishedEvent.eventType).toBe('CampaignCreatedEvent-V1');
      expect(publishedEvent.name).toBe(validCommand.name);
      expect(publishedEvent.incentiveType).toBe(validCommand.incentiveType);
    });

    it('should return the generated campaignId', async () => {
      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('with EventBusService', () => {
    beforeEach(() => {
      handler = new CreateCampaignCommandHandler(mockRepository, mockEventBus, mockEventBusService);
    });

    it('should publish to NATS when eventBusService is available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'incentive.events.campaign-created-v1',
        expect.any(CampaignCreatedEventV1),
      );
    });

    it('should handle NATS publish failure gracefully', async () => {
      mockEventBusService.publish.mockRejectedValue(new Error('NATS connection failed'));

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('with sponsor funding', () => {
    beforeEach(() => {
      handler = new CreateCampaignCommandHandler(mockRepository, mockEventBus, undefined);
    });

    it('should save sponsor account ID for business sponsor', async () => {
      const sponsoredCommand = new CreateCampaignCommand({
        ...validCommand,
        fundingSource: FundingSource.BUSINESS_SPONSOR,
        sponsorAccountId: '550e8400-e29b-41d4-a716-446655440001',
      });

      await handler.execute(sponsoredCommand);

      const savedEntity = mockRepository.save.mock.calls[0][0] as CampaignEntity;
      expect(savedEntity.fundingSource).toBe(FundingSource.BUSINESS_SPONSOR);
      expect(savedEntity.sponsorAccountId).toBe(sponsoredCommand.sponsorAccountId);
    });
  });
});
