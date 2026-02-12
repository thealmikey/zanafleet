import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../order/entities/order.entity';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { BusinessEntity } from '../business/entities/business.entity';
import { SaccoEntity } from '../sacco/entities/sacco.entity';
import { RiderEntity } from '../rider/entities/rider.entity';
import { SearchModule } from '../search/search.module';
import { DashboardSeedService } from './dashboard-seed.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OrderEntity,
            DeliveryEntity,
            BusinessEntity,
            SaccoEntity,
            RiderEntity,
        ]),
        SearchModule,
    ],
    providers: [DashboardSeedService],
    exports: [DashboardSeedService],
})
export class SeedModule { }
