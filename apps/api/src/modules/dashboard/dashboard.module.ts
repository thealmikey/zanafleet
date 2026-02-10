import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { InvoiceEntity } from '../billing/entities/invoice.entity';
import { SettlementBatchEntity } from '../settlement/entities/settlement-batch.entity';
import { PolicyEntity } from '../policy/entities/policy.entity';
import { DisputeEntity } from '../payment/entities/dispute.entity';
import { RefundEntity } from '../payment/entities/refund.entity';
import { PaymentIntentEntity } from '../payment/entities/payment-intent.entity';
import { LocationIntelligenceModule } from '../location-intelligence/location-intelligence.module';

import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { RiderDashboardController } from './controllers/rider-dashboard.controller';
import { BusinessDashboardController } from './controllers/business-dashboard.controller';
import { SupportDashboardController } from './controllers/support-dashboard.controller';
import { OperatorDashboardController } from './controllers/operator-dashboard.controller';

/**
 * DashboardModule
 *
 * Provides role-specific dashboard endpoints for Admin, Rider, Business,
 * Support, and Operator roles. Each controller is a thin facade that
 * composes read methods from existing services and repositories.
 *
 * Capabilities required:
 * - dashboard.admin.read
 * - dashboard.rider.read
 * - dashboard.business.read
 * - dashboard.support.read
 * - dashboard.operator.read
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryEntity,
      OrderEntity,
      InvoiceEntity,
      SettlementBatchEntity,
      PolicyEntity,
      DisputeEntity,
      RefundEntity,
      PaymentIntentEntity,
    ]),
    LocationIntelligenceModule,
  ],
  controllers: [
    AdminDashboardController,
    RiderDashboardController,
    BusinessDashboardController,
    SupportDashboardController,
    OperatorDashboardController,
  ],
})
export class DashboardModule {}
