import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity } from './entities/customer.entity';
import { CustomerController } from './customer.controller';
import { CustomerActivityProjection } from './entities/customer-activity.projection';
import { BusinessAvailabilityProjection } from './entities/business-availability.projection';
import { MarketDensityProjection } from './entities/market-density.projection';
import { CommerceContextEngine } from './services/commerce-context-engine.service';
import { CustomerProjectionService } from './services/customer-projection.service';
import { CalendarModule } from '../calendar/calendar.module';
import { PolicyModule } from '../policy/policy.module';

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
