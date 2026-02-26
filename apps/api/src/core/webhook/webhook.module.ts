import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MetricsModule } from '../metrics/metrics.module';
import { JobQueueModule } from '../job-queue/job-queue.module';
import { WebhookController } from './controllers';
import { WebhookDeliveryLog, WebhookSubscription } from './entities';
import { WebhookRetryService, WebhookService, WebhookSignatureService } from './services';
import { WebhookSubscriber } from './webhook.subscriber';

/**
 * WebhookModule
 *
 * Core module for webhook subscription management and event dispatch.
 * Provides:
 * - WebhookSubscription and WebhookDeliveryLog entities
 * - WebhookService for subscription CRUD and event dispatch
 * - WebhookSignatureService for HMAC-SHA256 signing
 * - WebhookRetryService for retry logic with exponential backoff
 * - WebhookController for REST API
 * - WebhookSubscriber for NATS event consumption
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookDeliveryLog]),
    MetricsModule,
    JobQueueModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookSignatureService, WebhookRetryService, WebhookSubscriber],
  exports: [WebhookService, WebhookSignatureService, WebhookRetryService],
})
export class WebhookModule {}
