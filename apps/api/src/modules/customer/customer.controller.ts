import { Controller, Get, Query, Param, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';

import { CUSTOMER_REPOSITORY_TOKEN } from './customer.module';
import { BusinessAvailabilityProjection } from './entities/business-availability.projection';
import { CustomerActivityProjection } from './entities/customer-activity.projection';
import { CustomerEntity } from './entities/customer.entity';
import { CustomerRepositoryInMemory } from './repositories/customer.repository.in-memory';

@Controller('customers')
export class CustomerController {
    constructor(
        @Inject(CUSTOMER_REPOSITORY_TOKEN)
        private readonly customerRepository: Repository<CustomerEntity> | CustomerRepositoryInMemory,
        @InjectRepository(CustomerActivityProjection)
        private readonly activityRepo: Repository<CustomerActivityProjection>,
        @InjectRepository(BusinessAvailabilityProjection)
        private readonly availabilityRepo: Repository<BusinessAvailabilityProjection>,
    ) { }

    @Get()
    async search(
        @Query('businessId') businessId: string,
        @Query('query') query: string,
    ) {
        if (!businessId) {
            return { data: [] };
        }

        const customers = await this.customerRepository.find({
            where: [
                { businessId, name: Like(`%${query}%`) },
                { businessId, phoneNumber: Like(`%${query}%`) },
            ],
            take: 10,
        });

        return { data: customers };
    }

    @Get('me/activity/:businessId')
    async getMyActivity(
        @Param('businessId') businessId: string,
        @Query('customerId') customerId: string, // In real app, get from Auth user
    ) {
        const activity = await this.activityRepo.findOne({
            where: { businessId, customerId }
        });
        return { data: activity };
    }

    @Get('businesses/availability')
    async getBusinessAvailability() {
        const availabilities = await this.availabilityRepo.find();
        return { data: availabilities };
    }
}
