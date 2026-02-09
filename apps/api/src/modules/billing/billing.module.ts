import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentModule } from '../payment/payment.module';
import { ChargeEntity } from './entities/charge.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { CreateInvoiceCommandHandler } from './handlers/create-invoice.handler';
import { IssueInvoiceCommandHandler } from './handlers/issue-invoice.handler';
import { PaymentCompletedListener } from './listeners/payment-completed.listener';
import { BillingCalculatorService } from './services/billing-calculator.service';

const CommandHandlers = [CreateInvoiceCommandHandler, IssueInvoiceCommandHandler];
const EventHandlers = [PaymentCompletedListener];

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity, ChargeEntity]),
    CqrsModule,
    PaymentModule,
  ],
  providers: [BillingCalculatorService, ...CommandHandlers, ...EventHandlers],
  exports: [TypeOrmModule, BillingCalculatorService],
})
export class BillingModule {}
