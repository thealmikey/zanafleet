import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CapabilityGuard } from '@api/core/api/guards/capability.guard';
import { BusinessAvailabilityProjection } from './entities/business-availability.projection';
import { CustomerActivityProjection } from './entities/customer-activity.projection';
import { CustomerEntity } from './entities/customer.entity';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
@Controller('customers')
@UseGuards(CapabilityGuard)
export class CustomerController {
    constructor(
        @InjectRepository(CustomerEntity)
        private readonly customerRepository: Repository<CustomerEntity>,
        @InjectRepository(CustomerActivityProjection)
        private readonly activityRepo: Repository<CustomerActivityProjection>,
        @InjectRepository(BusinessAvailabilityProjection)
        private readonly availabilityRepo: Repository<BusinessAvailabilityProjection>,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Search customers', description: 'Search for customers by name or phone number within a business' })
    @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
    @ApiQuery({ name: 'businessId', required: true, description: 'Business ID to search within' })
    @ApiQuery({ name: 'query', required: true, description: 'Search query (name or phone number)' })
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
    @ApiOperation({ summary: 'Get customer activity', description: 'Retrieve activity history for a specific customer' })
    @ApiResponse({ status: 200, description: 'Customer activity retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
    @ApiParam({ name: 'businessId', description: 'Business unique identifier (UUID)', type: String })
    @ApiQuery({ name: 'customerId', required: true, description: 'Customer unique identifier (UUID)' })
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
    @ApiOperation({ summary: 'Get business availability', description: 'Retrieve business availability information for customers' })
    @ApiResponse({ status: 200, description: 'Business availability retrieved successfully' })
    async getBusinessAvailability() {
        const availabilities = await this.availabilityRepo.find();
        return { data: availabilities };
    }
}
