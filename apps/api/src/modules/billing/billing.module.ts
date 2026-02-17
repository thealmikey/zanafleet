import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentModule } from '../payment/payment.module';

import { ChargeEntity } from './entities/charge.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { CreateInvoiceCommandHandler } from './handlers/create-invoice.handler';
import { IssueInvoiceCommandHandler } from './handlers/issue-invoice.handler';
import { PaymentCompletedListener } from './listeners/payment-completed.listener';
import { PolicyEvaluatedListener } from './listeners/policy-evaluated.listener';
import { BillingCalculatorService } from './services/billing-calculator.service';
import { PricingSignalService } from './services/pricing-signal.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] BillingModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([InvoiceEntity, ChargeEntity])];
}

const CommandHandlers = [CreateInvoiceCommandHandler, IssueInvoiceCommandHandler];
const EventHandlers = [PaymentCompletedListener, PolicyEvaluatedListener];

@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    PaymentModule,
  ],
  providers: [BillingCalculatorService, PricingSignalService, ...CommandHandlers, ...EventHandlers],
  exports: [BillingCalculatorService, PricingSignalService],
})
export class BillingModule {}
