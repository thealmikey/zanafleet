import { Module } from '@nestjs/common';

import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { NoOpPaymentProvider } from './providers/noop-payment.provider';
import { PaymentProviderRegistry } from './providers/payment-provider-registry.service';

@Module({
  controllers: [PaymentWebhookController],
  providers: [PaymentProviderRegistry, NoOpPaymentProvider],
  exports: [PaymentProviderRegistry, NoOpPaymentProvider],
})
export class PaymentModule {}
