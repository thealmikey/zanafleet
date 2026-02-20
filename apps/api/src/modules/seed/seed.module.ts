import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createTypeOrmFallbackProviders } from '@api/core/sandbox';

import { BusinessEntity } from '../business/entities/business.entity';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { RiderEntity } from '../rider/entities/rider.entity';
import { SaccoEntity } from '../sacco/entities/sacco.entity';
import { SearchModule } from '../search/search.module';

import { DashboardSeedService } from './dashboard-seed.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] SeedModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([
    OrderEntity,
    DeliveryEntity,
    BusinessEntity,
    SaccoEntity,
    RiderEntity,
  ])];
}

@Module({
    imports: [
        ...getTypeOrmImports(),
        SearchModule,
    ],
    providers: [
        DashboardSeedService,
        ...createTypeOrmFallbackProviders(OrderEntity, DeliveryEntity, BusinessEntity, SaccoEntity, RiderEntity),
    ],
    exports: [DashboardSeedService],
})
export class SeedModule { }
