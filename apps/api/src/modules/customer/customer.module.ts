import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CalendarModule } from '../calendar/calendar.module';
import { PolicyModule } from '../policy/policy.module';

import { CustomerController } from './customer.controller';
import { BusinessAvailabilityProjection } from './entities/business-availability.projection';
import { CustomerActivityProjection } from './entities/customer-activity.projection';
import { CustomerEntity } from './entities/customer.entity';
import { MarketDensityProjection } from './entities/market-density.projection';
import { CommerceContextEngine } from './services/commerce-context-engine.service';
import { CustomerProjectionService } from './services/customer-projection.service';


@Module({
    imports: [
        TypeOrmModule.forFeature([
            CustomerEntity,
            CustomerActivityProjection,
            BusinessAvailabilityProjection,
            MarketDensityProjection,
        ]),
        CalendarModule,
        PolicyModule,
    ],
    controllers: [CustomerController],
    providers: [
        CommerceContextEngine,
        CustomerProjectionService,
    ],
    exports: [
        TypeOrmModule,
        CommerceContextEngine,
        CustomerProjectionService,
    ],
})
export class CustomerModule { }
