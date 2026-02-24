import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateCampaignCommand } from '../commands/create-campaign.command';
import { CampaignStatus } from '../dto/incentive.enums';
import { CampaignEntity } from '../entities/campaign.entity';
import { CampaignCreatedEventV1 } from '../events/campaign-created.event';

/**
 * CreateCampaignCommandHandler
 * Handles the creation of new incentive campaigns
 */
@Injectable()
@CommandHandler(CreateCampaignCommand)
export class CreateCampaignCommandHandler implements ICommandHandler<CreateCampaignCommand> {
  private readonly logger = new Logger(CreateCampaignCommandHandler.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: CreateCampaignCommand): Promise<string> {
    const campaignId = uuidv4();
    const now = new Date();

    const initialStatus = command.validFrom <= now ? CampaignStatus.ACTIVE : CampaignStatus.DRAFT;

    const entity = CampaignEntity.fromDomain({
      campaignId,
      name: command.name,
      description: command.description,
      incentiveType: command.incentiveType,
      status: initialStatus,
      fundingSource: command.fundingSource,
      sponsorAccountId: command.sponsorAccountId,
      discountValue: command.discountValue,
      maxDiscountAmount: command.maxDiscountAmount,
      budgetTotal: command.budgetTotal,
      budgetUsed: 0,
      usageLimit: command.usageLimit,
      usageCount: 0,
      eligibilityRules: command.eligibilityRules,
      validFrom: command.validFrom,
      validUntil: command.validUntil,
      metadata: command.metadata,
      createdAt: now,
    });

    await this.campaignRepository.save(entity);

    const event = new CampaignCreatedEventV1({
      eventId: uuidv4(),
      campaignId,
      name: command.name,
      incentiveType: command.incentiveType,
      status: initialStatus,
      fundingSource: command.fundingSource,
      sponsorAccountId: command.sponsorAccountId,
      discountValue: command.discountValue,
      budgetTotal: command.budgetTotal,
      validFrom: command.validFrom,
      validUntil: command.validUntil,
    });

    this.eventBus.publish(event);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Incentive.CAMPAIGN_CREATED_V1, event)
        .catch((error) => {
          this.logger.error(`Failed to publish CampaignCreatedEvent to NATS: ${error.message}`);
        });
    }

    this.logger.log(`Campaign created: ${campaignId} (${command.name}), status: ${initialStatus}`);

    return campaignId;
  }
}
