import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  BatchCreateAssetsDto,
  WebhookSubscriptionDto,
  AvailabilityRequestDto,
  AvailabilityResponseDto,
} from '../dto/asset-platform.dto';
import { AssetEntity } from '../entities/asset.entity';
import { BundleEntity } from '../entities/bundle.entity';
import { TripEntity } from '../entities/trip.entity';

@Controller('integrations')
export class IntegrationController {
  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    @InjectRepository(BundleEntity)
    private readonly bundleRepository: Repository<BundleEntity>,
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>
  ) {}

  /**
   * Health check endpoint for 3rd party systems
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        assets: 'operational',
        bundles: 'operational',
        trips: 'operational',
      },
    };
  }

  /**
   * Batch create assets
   */
  @Post('batch/assets')
  @HttpCode(HttpStatus.CREATED)
  async batchCreateAssets(@Body() dto: BatchCreateAssetsDto) {
    const results = [];
    const errors = [];

    for (let i = 0; i < dto.assets.length; i++) {
      try {
        const assetData = dto.assets[i];
        const asset = this.assetRepository.create({
          id: require('uuid').v4(),
          ...assetData,
        });
        await this.assetRepository.save(asset);
        results.push({ index: i, assetId: asset.id, success: true });
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      totalSubmitted: dto.assets.length,
      successCount: results.length,
      failureCount: errors.length,
      results,
      errors,
    };
  }

  /**
   * Get analytics for a specific owner
   */
  @Get('analytics/owner/:ownerId')
  async getOwnerAnalytics(@Param('ownerId') ownerId: string) {
    const assets = await this.assetRepository.find({ where: { ownerId } });
    const bundles = await this.bundleRepository.find({ where: { ownerId } });

    const bundleIds = bundles.map((b) => b.id);
    const trips = await this.tripRepository.find({
      where: bundleIds.map((id) => ({ bundleId: id })),
    });

    return {
      ownerId,
      summary: {
        totalAssets: assets.length,
        totalBundles: bundles.length,
        totalTrips: trips.length,
        assetsByType: this.groupByType(assets),
      },
      period: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    };
  }

  /**
   * Export bundle data in JSON format
   */
  @Get('export/bundle/:bundleId')
  async exportBundle(@Param('bundleId') bundleId: string, @Query('format') format = 'json') {
    const bundle = await this.bundleRepository.findOne({
      where: { id: bundleId },
      relations: ['trips', 'trips.asset'],
    });

    if (!bundle) {
      return { error: 'Bundle not found' };
    }

    const exportData = {
      bundle: bundle.toDomain(),
      trips: bundle.trips?.map((t) => t.toDomain()) || [],
      exportedAt: new Date().toISOString(),
      format,
    };

    return exportData;
  }

  /**
   * Webhook subscription endpoint (placeholder)
   */
  @Post('webhooks/subscribe')
  async subscribeWebhook(@Body() dto: WebhookSubscriptionDto) {
    // In production, this would register the webhook in a database
    return {
      subscriptionId: require('uuid').v4(),
      url: dto.url,
      events: dto.events,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get API usage statistics
   */
  @Get('usage/stats')
  async getUsageStats(@Query('apiKey') apiKey: string) {
    // Mock usage stats
    return {
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'unknown',
      period: 'last_30_days',
      requests: {
        total: 15420,
        successful: 15200,
        failed: 220,
      },
      endpoints: {
        '/assets': 5000,
        '/bundles': 3500,
        '/trips': 4200,
        '/integrations': 2720,
      },
      rateLimit: {
        limit: 10000,
        remaining: 7500,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  /**
   * Validate asset availability for date range
   */
  @Post('validate/availability')
  async validateAvailability(@Body() dto: { assetId: string; startDate: Date; endDate: Date }) {
    const trips = await this.tripRepository.find({
      where: { assetId: dto.assetId },
    });

    const conflicts = trips.filter((trip) => {
      const tripStart = new Date(trip.startTime);
      const tripEnd = trip.endTime ? new Date(trip.endTime) : new Date();
      const requestStart = new Date(dto.startDate);
      const requestEnd = new Date(dto.endDate);

      return (
        (requestStart >= tripStart && requestStart <= tripEnd) ||
        (requestEnd >= tripStart && requestEnd <= tripEnd) ||
        (requestStart <= tripStart && requestEnd >= tripEnd)
      );
    });

    return {
      assetId: dto.assetId,
      available: conflicts.length === 0,
      conflicts: conflicts.map((t) => ({
        tripId: t.id,
        startTime: t.startTime,
        endTime: t.endTime,
      })),
    };
  }

  private groupByType(assets: AssetEntity[]) {
    const grouped: Record<string, number> = {};
    assets.forEach((asset) => {
      grouped[asset.type] = (grouped[asset.type] || 0) + 1;
    });
    return grouped;
  }
}
