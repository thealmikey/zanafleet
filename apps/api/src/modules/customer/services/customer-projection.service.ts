import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerActivityProjection } from '../entities/customer-activity.projection';
import { MarketDensityProjection } from '../entities/market-density.projection';
import { OrderStatus } from '@zanafleet/contracts';

@Injectable()
export class CustomerProjectionService {
    private readonly logger = new Logger(CustomerProjectionService.name);

    constructor(
        @InjectRepository(CustomerActivityProjection)
        private readonly projectionRepo: Repository<CustomerActivityProjection>,
        @InjectRepository(MarketDensityProjection)
        private readonly densityRepo: Repository<MarketDensityProjection>,
    ) { }

    async handleOrderEvent(data: {
        orderId: string;
        businessId: string;
        customerId: string;
        status: OrderStatus;
        totalAmount: number;
        items: any[];
        location?: { lat: number; lng: number };
    }) {
        // 1. Update Customer Activity
        let projection = await this.projectionRepo.findOne({
            where: { customerId: data.customerId, businessId: data.businessId }
        });

        if (!projection) {
            projection = this.projectionRepo.create({
                customerId: data.customerId,
                businessId: data.businessId,
                totalOrders: 0,
                totalCancellations: 0,
                totalSpent: 0,
                frequentItems: {},
            });
        }

        if (data.status === OrderStatus.Confirmed || data.status === OrderStatus.Fulfilled) {
            projection.totalOrders += 1;
            projection.totalSpent = Number(projection.totalSpent) + data.totalAmount;
            projection.lastOrderAt = new Date();

            // Update frequent items
            const items = (projection.frequentItems as Record<string, number>) || {};
            data.items.forEach(item => {
                const desc = item.description || 'Unknown Item';
                items[desc] = (items[desc] || 0) + 1;
            });
            projection.frequentItems = items;
        } else if (data.status === OrderStatus.Cancelled) {
            projection.totalCancellations += 1;
        }

        await this.projectionRepo.save(projection);

        // 2. Update Market Density (Spatial Analytics)
        if (data.location) {
            // Simplified H3 mock: using truncated lat/lng as cell key
            const h3Index = `cell_${data.location.lat.toFixed(2)}_${data.location.lng.toFixed(2)}`;
            let density = await this.densityRepo.findOne({ where: { h3Index } });

            if (!density) {
                density = this.densityRepo.create({ h3Index, activeOrderCount: 0, totalOrderCount: 0, totalRevenue: 0 });
            }

            if (data.status === OrderStatus.Confirmed) {
                density.activeOrderCount += 1;
                density.totalOrderCount += 1;
                density.totalRevenue = Number(density.totalRevenue) + data.totalAmount;
            } else if (data.status === OrderStatus.Fulfilled || data.status === OrderStatus.Cancelled) {
                density.activeOrderCount = Math.max(0, density.activeOrderCount - 1);
            }

            await this.densityRepo.save(density);
        }

        this.logger.debug(`Updated projections for customer ${data.customerId}`);
    }
}
