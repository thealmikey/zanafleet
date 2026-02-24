import { EventBusService } from '@api/core/event-bus';
import { RecordLedgerEntryCommand } from '@api/modules/ledger';
import { NotFoundException } from '@nestjs/common';
import { EventBus, CommandBus } from '@nestjs/cqrs';

import { ApplyIncentiveCommand } from '../../commands/apply-incentive.command';
import { IncentiveType, CampaignStatus, FundingSource } from '../../dto/incentive.enums';
import { CampaignEntity } from '../../entities/campaign.entity';
import { BudgetExhaustedEventV1 } from '../../events/budget-exhausted.event';
import { IncentiveAppliedEventV1 } from '../../events/incentive-applied.event';
import { SponsorshipConsumedEventV1 } from '../../events/sponsorship-consumed.event';
import { ApplyIncentiveCommandHandler } from '../../handlers/apply-incentive.handler';
import { IncentiveEngineService } from '../../services/incentive-engine.service';

describe('ApplyIncentiveCommandHandler', () => {
  let handler: ApplyIncentiveCommandHandler;
  let mockIncentiveEngine: jest.Mocked<IncentiveEngineService>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  const createCampaign = (
    overrides?: Partial<ReturnType<CampaignEntity['toDomain']>>
  ): CampaignEntity => {
    const entity = CampaignEntity.fromDomain({
      campaignId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Campaign',
      incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
      status: CampaignStatus.ACTIVE,
      fundingSource: FundingSource.PLATFORM,
      discountValue: 20,
      budgetTotal: 1000,
      budgetUsed: 100,
      usageCount: 10,
      validFrom: new Date('2024-01-01T00:00:00.000Z'),
      validUntil: new Date('2024-12-31T23:59:59.000Z'),
      createdAt: new Date(),
      ...overrides,
    });
    entity.updatedAt = new Date();
    return entity;
  };

  const validCommand = new ApplyIncentiveCommand({
    campaignId: '550e8400-e29b-41d4-a716-446655440000',
    invoiceId: '660e8400-e29b-41d4-a716-446655440001',
    beneficiaryAccountId: '770e8400-e29b-41d4-a716-446655440002',
    baseAmount: 100,
    currency: 'USD',
    correlationId: '880e8400-e29b-41d4-a716-446655440003',
  });

  beforeEach(() => {
    mockIncentiveEngine = {
      getCampaign: jest.fn(),
      calculateDiscountAmount: jest.fn().mockReturnValue(20),
      createIncentiveCharge: jest.fn().mockReturnValue({
        chargeId: 'charge-123',
        chargeType: 'DISCOUNT',
        description: 'Test discount',
        amount: -20,
        currency: 'USD',
        quantity: 1,
        unitPrice: -20,
        metadata: {
          campaignId: '550e8400-e29b-41d4-a716-446655440000',
          applicationId: 'app-123',
          incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
          fundingSource: FundingSource.PLATFORM,
        },
      }),
      applyToInvoice: jest.fn().mockResolvedValue({
        applicationId: 'app-123',
        campaignId: '550e8400-e29b-41d4-a716-446655440000',
        chargeId: 'charge-123',
        discountAmount: 20,
        budgetExhausted: false,
      }),
    } as unknown as jest.Mocked<IncentiveEngineService>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(['entry-1', 'entry-2']),
    } as unknown as jest.Mocked<CommandBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;
  });

  describe('platform-funded incentive', () => {
    beforeEach(() => {
      handler = new ApplyIncentiveCommandHandler(
        mockIncentiveEngine,
        mockEventBus,
        mockCommandBus,
        mockEventBusService
      );

      mockIncentiveEngine.getCampaign.mockResolvedValue(createCampaign());
    });

    it('should apply incentive to invoice', async () => {
      const result = await handler.execute(validCommand);

      expect(result.applicationId).toBe('app-123');
      expect(result.discountAmount).toBe(20);
      expect(mockIncentiveEngine.applyToInvoice).toHaveBeenCalled();
    });

    it('should publish IncentiveAppliedEventV1', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalled();
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as IncentiveAppliedEventV1;
      expect(publishedEvent.eventType).toBe('IncentiveAppliedEvent-V1');
      expect(publishedEvent.discountAmount).toBe(20);
    });

    it('should NOT record ledger entries for platform funding', async () => {
      await handler.execute(validCommand);

      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should NOT publish SponsorshipConsumedEvent for platform funding', async () => {
      await handler.execute(validCommand);

      const events = mockEventBus.publish.mock.calls.map((call) => call[0]);
      const sponsorshipEvent = events.find(
        (e) => (e as SponsorshipConsumedEventV1).eventType === 'SponsorshipConsumedEvent-V1'
      );
      expect(sponsorshipEvent).toBeUndefined();
    });
  });

  describe('sponsor-funded incentive', () => {
    const sponsoredCampaign = createCampaign({
      fundingSource: FundingSource.BUSINESS_SPONSOR,
      sponsorAccountId: '990e8400-e29b-41d4-a716-446655440004',
    });

    beforeEach(() => {
      handler = new ApplyIncentiveCommandHandler(
        mockIncentiveEngine,
        mockEventBus,
        mockCommandBus,
        mockEventBusService
      );

      mockIncentiveEngine.getCampaign.mockResolvedValue(sponsoredCampaign);
    });

    it('should record ledger entries for sponsor funding', async () => {
      await handler.execute(validCommand);

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const ledgerCommand = mockCommandBus.execute.mock.calls[0][0] as RecordLedgerEntryCommand;
      expect(ledgerCommand.entries).toHaveLength(2);

      const debitEntry = ledgerCommand.entries.find((e) => e.entryType === 'DEBIT');
      expect(debitEntry?.accountId).toBe('990e8400-e29b-41d4-a716-446655440004');
    });

    it('should publish SponsorshipConsumedEventV1', async () => {
      await handler.execute(validCommand);

      const events = mockEventBus.publish.mock.calls.map((call) => call[0]);
      const sponsorshipEvent = events.find(
        (e) => (e as SponsorshipConsumedEventV1).eventType === 'SponsorshipConsumedEvent-V1'
      ) as SponsorshipConsumedEventV1;

      expect(sponsorshipEvent).toBeDefined();
      expect(sponsorshipEvent.sponsorAccountId).toBe('990e8400-e29b-41d4-a716-446655440004');
      expect(sponsorshipEvent.amountConsumed).toBe(20);
    });
  });

  describe('budget exhaustion', () => {
    beforeEach(() => {
      handler = new ApplyIncentiveCommandHandler(
        mockIncentiveEngine,
        mockEventBus,
        mockCommandBus,
        mockEventBusService
      );

      mockIncentiveEngine.getCampaign.mockResolvedValue(createCampaign());
      mockIncentiveEngine.applyToInvoice.mockResolvedValue({
        applicationId: 'app-123',
        campaignId: '550e8400-e29b-41d4-a716-446655440000',
        chargeId: 'charge-123',
        discountAmount: 20,
        budgetExhausted: true,
      });
    });

    it('should publish BudgetExhaustedEventV1 when budget depleted', async () => {
      await handler.execute(validCommand);

      const events = mockEventBus.publish.mock.calls.map((call) => call[0]);
      const exhaustedEvent = events.find(
        (e) => (e as BudgetExhaustedEventV1).eventType === 'BudgetExhaustedEvent-V1'
      ) as BudgetExhaustedEventV1;

      expect(exhaustedEvent).toBeDefined();
      expect(exhaustedEvent.campaignId).toBe(validCommand.campaignId);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      handler = new ApplyIncentiveCommandHandler(
        mockIncentiveEngine,
        mockEventBus,
        mockCommandBus,
        undefined
      );
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockIncentiveEngine.getCampaign.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when discount amount is zero', async () => {
      mockIncentiveEngine.getCampaign.mockResolvedValue(createCampaign());
      mockIncentiveEngine.calculateDiscountAmount.mockReturnValue(0);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Calculated discount amount is zero or negative'
      );
    });
  });
});
