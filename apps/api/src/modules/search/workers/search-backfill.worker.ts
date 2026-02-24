import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BusinessEntity } from '../../business/entities/business.entity';
import { DeliveryEntity } from '../../delivery/entities/delivery.entity';
import { OrderEntity } from '../../order/entities/order.entity';
import { ISearchProvider, SEARCH_PROVIDER } from '../providers/search-provider.interface';

@Injectable()
export class SearchBackfillWorker implements OnModuleInit {
  private readonly logger = new Logger(SearchBackfillWorker.name);

  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(BusinessEntity)
    private readonly businessRepository: Repository<BusinessEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>
  ) {}

  async onModuleInit(): Promise<void> {
    // Only run backfill if environment variable is set
    if (process.env.RUN_SEARCH_BACKFILL === 'true') {
      this.logger.log('Starting search index backfill...');
      await this.backfill();
      this.logger.log('Search index backfill complete.');
    }
  }

  async backfill(): Promise<void> {
    try {
      // 1. Backfill Businesses
      const businesses = await this.businessRepository.find();
      this.logger.log(`Backfilling ${businesses.length} businesses...`);
      for (const b of businesses) {
        await this.searchProvider.index({
          entityId: b.id,
          entityType: 'Business',
          workspaceId: b.id, // Using id as partition for now
          title: b.businessName,
          description: `${b.businessType} Merchant`,
          metadata: {
            phone: b.phone,
            email: b.email,
            businessType: b.businessType,
          },
          location: {
            latitude: b.location.latitude,
            longitude: b.location.longitude,
          },
          createdAt: b.createdAt,
        });
      }

      // 2. Backfill Orders
      const orders = await this.orderRepository.find();
      this.logger.log(`Backfilling ${orders.length} orders...`);
      for (const o of orders) {
        await this.searchProvider.index({
          entityId: o.id,
          entityType: 'Order',
          workspaceId: o.businessId,
          title: `Order #${o.id.slice(0, 8).toUpperCase()}`,
          description: o.itemSummary || 'No items',
          metadata: {
            status: o.status,
            totalAmount: o.totalAmount,
            currency: o.currency,
          },
          createdAt: o.createdAt,
        });
      }

      // 3. Backfill Deliveries
      const deliveries = await this.deliveryRepository.find();
      this.logger.log(`Backfilling ${deliveries.length} deliveries...`);
      for (const d of deliveries) {
        await this.searchProvider.index({
          entityId: d.id,
          entityType: 'Delivery',
          workspaceId: d.businessId,
          title: `Delivery #${d.id.slice(0, 8).toUpperCase()}`,
          description: `To: ${d.recipientName || 'Unknown'}`,
          metadata: {
            status: d.status,
            recipientName: d.recipientName,
          },
          createdAt: d.createdAt,
        });
      }
    } catch (error: any) {
      this.logger.error(`Backfill failed: ${error.message}`, error.stack);
    }
  }
}
