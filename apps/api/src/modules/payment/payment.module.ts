import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LedgerModule } from '../ledger/ledger.module';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentIntentEntity } from './entities/payment-intent.entity';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { CreatePaymentIntentCommandHandler } from './handlers/create-payment-intent.handler';
import { ProcessPaymentCommandHandler } from './handlers/process-payment.handler';
import { NoOpPaymentProvider } from './providers/noop-payment.provider';
import { PaymentProviderRegistry } from './providers/payment-provider-registry.service';

const CommandHandlers = [CreatePaymentIntentCommandHandler, ProcessPaymentCommandHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentIntentEntity, PaymentTransactionEntity]),
    CqrsModule,
    LedgerModule,
  ],
  controllers: [PaymentWebhookController],
  providers: [PaymentProviderRegistry, NoOpPaymentProvider, ...CommandHandlers],
  exports: [PaymentProviderRegistry, NoOpPaymentProvider, TypeOrmModule],
})
export class PaymentModule {}
