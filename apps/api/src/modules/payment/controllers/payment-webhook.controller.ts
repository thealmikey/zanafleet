import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PaymentProviderRegistry } from '../providers/payment-provider-registry.service';

/**
 * PaymentWebhookController
 * Generic webhook endpoint that routes to the correct provider based on path parameter
 */
@Controller('payment/webhooks')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly providerRegistry: PaymentProviderRegistry) {}

  @Post(':providerId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('providerId') providerId: string,
    @Body() payload: unknown,
    @Headers('x-webhook-signature') signature?: string
  ): Promise<{ received: boolean }> {
    const provider = this.providerRegistry.get(providerId);

    if (!provider) {
      this.logger.warn(`Webhook received for unknown provider: ${providerId}`);
      throw new NotFoundException(`Payment provider not found: ${providerId}`);
    }

    if (!provider.verifyWebhook(payload, signature ?? '')) {
      this.logger.warn(`Invalid webhook signature for provider: ${providerId}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      const result = await provider.handleWebhook(payload);
      this.logger.log(
        `Webhook processed for provider ${providerId}: ${result.eventType}, acknowledged: ${result.acknowledged}`
      );

      return { received: result.acknowledged };
    } catch (error) {
      this.logger.error(
        `Error processing webhook for provider ${providerId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }
}
