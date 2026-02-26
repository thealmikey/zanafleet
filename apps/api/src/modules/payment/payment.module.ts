import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { AccountModule } from '../account/account.module';
import { LedgerModule } from '../ledger/ledger.module';

import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentController } from './controllers/payment.controller';
import { PaymentFlowOrchestrator } from './coordinators/payment-flow.orchestrator';
import { RefundDisputeCoordinator } from './coordinators/refund-dispute.coordinator';
import { DisputeEntity } from './entities/dispute.entity';
import { PaymentIntentEntity } from './entities/payment-intent.entity';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { RefundEntity } from './entities/refund.entity';
import { CreatePaymentIntentCommandHandler } from './handlers/create-payment-intent.handler';
import { ProcessPaymentCommandHandler } from './handlers/process-payment.handler';
import { MpesaDarajaProvider } from './providers/mpesa-daraja/mpesa-daraja.provider';
import { MpesaDarajaService } from './providers/mpesa-daraja/mpesa-daraja.service';
import { NoOpPaymentProvider } from './providers/noop-payment.provider';
import { PaymentProviderRegistry } from './providers/payment-provider-registry.service';
import { FraudCheckService } from './services/fraud-check.service';

const CommandHandlers = [CreatePaymentIntentCommandHandler, ProcessPaymentCommandHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentIntentEntity,
      PaymentTransactionEntity,
      DisputeEntity,
      RefundEntity,
    ]),
    CqrsModule,
    forwardRef(() => EventBusModule),
    forwardRef(() => LedgerModule),
    AccountModule,
  ],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    PaymentProviderRegistry,
    NoOpPaymentProvider,
    MpesaDarajaProvider,
    MpesaDarajaService,
    FraudCheckService,
    PaymentFlowOrchestrator,
    RefundDisputeCoordinator,
    ...CommandHandlers,
  ],
  exports: [
    PaymentProviderRegistry,
    NoOpPaymentProvider,
    MpesaDarajaProvider,
    MpesaDarajaService,
    FraudCheckService,
    PaymentFlowOrchestrator,
    RefundDisputeCoordinator,
    TypeOrmModule,
  ],
})
export class PaymentModule {}
