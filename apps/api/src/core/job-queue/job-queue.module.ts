// =============================================================================
// Job Queue Module - NestJS Integration
// =============================================================================

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { JobQueueService } from './job-queue.service';

/**
 * Job Queue Module
 *
 * Provides BullMQ-based background job processing with:
 * - Multi-tenant workspace isolation
 * - Distributed locking for cron jobs
 * - Dead letter queue support
 * - Flow orchestration for job chains
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [JobQueueService],
  exports: [JobQueueService],
})
export class JobQueueModule {}
