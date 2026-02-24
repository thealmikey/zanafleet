import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ActorType,
  BusinessType,
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  TEST_WORKSPACE_ID,
} from '@zanafleet/contracts';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { BusinessEntity } from '../../business/entities/business.entity';
import { DeliveryEntity } from '../../delivery/entities/delivery.entity';
import { OrderEntity } from '../entities/order.entity';

@Injectable()
export class ActivitySeederService implements OnModuleInit {
  private readonly logger = new Logger(ActivitySeederService.name);

  // Constants for seeding
  private readonly TEST_CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440007';
  private readonly TEST_BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440008';
  private readonly TEST_RIDER_ID = '550e8400-e29b-41d4-a716-446655440003';

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    @InjectRepository(BusinessEntity)
    private readonly businessRepository: Repository<BusinessEntity>
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Small delay to ensure other seeders (like TestAccountSeeder) might have run
    setTimeout(async () => {
      try {
        await this.seedActivity();
      } catch (error) {
        this.logger.error('Failed to seed activity history', error);
      }
    }, 5000);
  }

  async seedActivity(): Promise<void> {
    this.logger.log('Checking for activity seeding...');

    // 1. Ensure test business exists
    const businessExists = await this.businessRepository.findOne({
      where: { id: this.TEST_BUSINESS_ID },
    });
    if (!businessExists) {
      this.logger.log('Seeding test business...');
      const business = BusinessEntity.fromDomain({
        businessId: this.TEST_BUSINESS_ID,
        businessName: 'Zana Fresh Mart',
        phone: '+254700000001',
        location: {
          latitude: -1.286389,
          longitude: 36.817223,
          humanReadableName: 'Nairobi Central',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        businessType: BusinessType.Retail,
        createdAt: new Date(),
      });
      await this.businessRepository.save(business);
    }

    // 2. Check if customer has activity
    const orderCount = await this.orderRepository.count({
      where: { customerPhone: '+254700123456' },
    });
    if (orderCount > 0) {
      this.logger.log('Activity already seeded, skipping.');
      return;
    }

    this.logger.log('Seeding customer activity history...');

    const statuses = [
      { order: OrderStatus.Fulfilled, delivery: DeliveryStatus.Delivered, daysAgo: 10 },
      { order: OrderStatus.Fulfilled, delivery: DeliveryStatus.Delivered, daysAgo: 7 },
      { order: OrderStatus.Fulfilled, delivery: DeliveryStatus.Delivered, daysAgo: 5 },
      { order: OrderStatus.Confirmed, delivery: DeliveryStatus.InTransit, daysAgo: 1 },
      { order: OrderStatus.Pending, delivery: DeliveryStatus.Requested, daysAgo: 0 },
    ];

    for (const item of statuses) {
      const orderId = uuidv4();
      const deliveryId = uuidv4();
      const date = new Date();
      date.setDate(date.getDate() - item.daysAgo);

      // Create Order
      const order = OrderEntity.fromDomain({
        orderId,
        businessId: this.TEST_BUSINESS_ID,
        deliveryId,
        itemSummary: `Seeded Item ${item.daysAgo}`,
        customerName: 'Test Customer',
        customerPhone: '+254700123456',
        status: item.order,
        totalAmount: 500 + Math.random() * 1000,
        currency: 'KES',
        paymentStatus:
          item.order === OrderStatus.Fulfilled ? PaymentStatus.Succeeded : PaymentStatus.Pending,
        createdAt: date,
      });
      await this.orderRepository.save(order);

      // Create Delivery
      const delivery = DeliveryEntity.fromDomain({
        deliveryId,
        businessId: this.TEST_BUSINESS_ID,
        status: item.delivery,
        assignedRiderId: item.delivery !== DeliveryStatus.Requested ? this.TEST_RIDER_ID : null,
        createdAt: date,
      });
      await this.deliveryRepository.save(delivery);
    }

    this.logger.log('Activity history seeding complete.');
  }
}
