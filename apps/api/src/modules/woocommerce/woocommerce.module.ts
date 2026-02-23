import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { WooCommerceOnboardingController } from './woocommerce-onboarding.controller';

@Module({
  imports: [CqrsModule],
  controllers: [WooCommerceOnboardingController],
  providers: [],
  exports: [],
})
export class WooCommerceModule {}
