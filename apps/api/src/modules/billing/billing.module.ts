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

const CommandHandlers = [CreateInvoiceCommandHandler, IssueInvoiceCommandHandler];
const EventHandlers = [PaymentCompletedListener, PolicyEvaluatedListener];

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity, ChargeEntity]), CqrsModule, PaymentModule],
  providers: [BillingCalculatorService, PricingSignalService, ...CommandHandlers, ...EventHandlers],
  exports: [TypeOrmModule, BillingCalculatorService, PricingSignalService],
})
export class BillingModule {}
