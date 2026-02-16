import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    BusinessType,
    DeliveryStatus,
    OrderStatus,
    PaymentStatus,
    VehicleType,
} from '@zanafleet/contracts';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { BusinessEntity } from '../business/entities/business.entity';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { RiderEntity } from '../rider/entities/rider.entity';
import { SaccoEntity } from '../sacco/entities/sacco.entity';
import { ISearchProvider, SEARCH_PROVIDER } from '../search/providers/search-provider.interface';

@Injectable()
export class DashboardSeedService implements OnModuleInit {
    private readonly logger = new Logger(DashboardSeedService.name);

    constructor(
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(DeliveryEntity)
        private readonly deliveryRepository: Repository<DeliveryEntity>,
        @InjectRepository(BusinessEntity)
        private readonly businessRepository: Repository<BusinessEntity>,
        @InjectRepository(SaccoEntity)
        private readonly saccoRepository: Repository<SaccoEntity>,
        @InjectRepository(RiderEntity)
        private readonly riderRepository: Repository<RiderEntity>,
        @Inject(SEARCH_PROVIDER)
        private readonly searchProvider: ISearchProvider,
    ) { }

    async onModuleInit(): Promise<void> {
        if (process.env.NODE_ENV === 'production') {
            return;
        }

        if (process.env.SEED_DASHBOARDS !== 'true') {
            this.logger.log('Dashboard seeding disabled (SEED_DASHBOARDS != true)');
            return;
        }

        // Small delay to ensure DB is fully ready and other migrations/seeds finished
        setTimeout(() => {
            this.runSeeder().catch((error) => {
                this.logger.error('Dashboard seeding failed', error);
            });
        }, 10000);
    }

    private async runSeeder(): Promise<void> {
        this.logger.log('🌱 Starting rich dashboard seeding...');

        // 1. Seed Saccos
        const saccos = await this.seedSaccos();

        // 2. Seed Riders
        const riders = await this.seedRiders(saccos);

        // 3. Seed Businesses
        const businesses = await this.seedBusinesses();

        // 4. Seed Activity (Orders & Deliveries)
        await this.seedActivity(businesses, riders);

        this.logger.log('✅ Dashboard seeding complete!');
    }

    private async seedSaccos(): Promise<SaccoEntity[]> {
        const saccoDefs = [
            { name: 'Nairobi Metro Sacco', phone: '+254711222333', lat: -1.286389, lng: 36.817223 },
            { name: 'Kiambu Riders Sacco', phone: '+254722333444', lat: -1.1714, lng: 36.8356 },
            { name: 'Mombasa Fast Link', phone: '+254733444555', lat: -4.0435, lng: 39.6682 },
        ];

        const entities: SaccoEntity[] = [];
        for (const def of saccoDefs) {
            let sacco = await this.saccoRepository.findOne({ where: { name: def.name } });
            if (!sacco) {
                sacco = SaccoEntity.fromDomain({
                    saccoId: uuidv4(),
                    name: def.name,
                    contactPhone: def.phone,
                    location: {
                        latitude: def.lat,
                        longitude: def.lng,
                        humanReadableName: def.name + ' HQ',
                        administrativeArea: 'Central',
                        country: 'Kenya',
                    },
                    createdAt: new Date(),
                });
                await this.saccoRepository.save(sacco);
                this.logger.debug(`Created Sacco: ${def.name}`);
            }
            entities.push(sacco);
        }
        return entities;
    }

    private async seedRiders(saccos: SaccoEntity[]): Promise<RiderEntity[]> {
        const riderNames = [
            'John Kamau', 'Peter Omondi', 'David Mutua', 'Mary Atieno', 'Sarah Wanjiru',
            'James Kiprotich', 'Francis Mwangi', 'Grace Nyambura', 'Michael Otieno', 'Alice Musyoka'
        ];

        const entities: RiderEntity[] = [];
        for (let i = 0; i < riderNames.length; i++) {
            const phone = `+2547${Math.floor(10000000 + Math.random() * 90000000)}`;
            let rider = await this.riderRepository.findOne({ where: { phone } });
            if (!rider) {
                const sacco = saccos[i % saccos.length];
                rider = RiderEntity.fromDomain({
                    riderId: uuidv4(),
                    fullName: riderNames[i],
                    nationalId: `ID-${100000 + i}`,
                    phone,
                    location: {
                        latitude: sacco.location.latitude + (Math.random() - 0.5) * 0.1,
                        longitude: sacco.location.longitude + (Math.random() - 0.5) * 0.1,
                        humanReadableName: 'Somewhere in ' + sacco.name + ' zone',
                        administrativeArea: 'Nairobi',
                        country: 'Kenya',
                    },
                    vehicleType: i % 3 === 0 ? VehicleType.Car : VehicleType.Bike,
                    saccoId: i % 4 === 0 ? null : sacco.id,
                    createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30),
                });
                await this.riderRepository.save(rider);
                this.logger.debug(`Created Rider: ${riderNames[i]}`);
            }
            entities.push(rider);
        }
        return entities;
    }

    private async seedBusinesses(): Promise<BusinessEntity[]> {
        const bizDefs = [
            { name: 'Mama Fatuma Kitchen', type: BusinessType.Restaurant, lat: -1.281, lng: 36.823 },
            { name: 'Downtown Pharma', type: BusinessType.Retail, lat: -1.285, lng: 36.815 },
            { name: 'Zana Supermarket', type: BusinessType.Wholesale, lat: -1.290, lng: 36.810 },
            { name: 'Kariokor Spare Parts', type: BusinessType.Retail, lat: -1.280, lng: 36.835 },
            { name: 'Westlands Fast Food', type: BusinessType.Restaurant, lat: -1.265, lng: 36.808 },
            { name: 'Global Logistics Hub', type: BusinessType.Logistics, lat: -1.320, lng: 36.850 },
        ];

        const entities: BusinessEntity[] = [];
        for (const def of bizDefs) {
            let biz = await this.businessRepository.findOne({ where: { businessName: def.name } });
            if (!biz) {
                biz = BusinessEntity.fromDomain({
                    businessId: uuidv4(),
                    businessName: def.name,
                    phone: `+2542${Math.floor(10000000 + Math.random() * 90000000)}`,
                    businessType: def.type,
                    location: {
                        latitude: def.lat,
                        longitude: def.lng,
                        humanReadableName: def.name,
                        administrativeArea: 'Nairobi',
                        country: 'Kenya',
                    },
                    createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 60),
                });
                await this.businessRepository.save(biz);

                // Index for search
                await this.searchProvider.index({
                    entityId: biz.id,
                    entityType: 'Business',
                    workspaceId: biz.id,
                    title: biz.businessName,
                    description: `${biz.businessType} Merchant in Nairobi`,
                    location: biz.location,
                    metadata: { type: biz.businessType },
                    createdAt: biz.createdAt,
                });

                this.logger.debug(`Created Business: ${def.name}`);
            }
            entities.push(biz);
        }
        return entities;
    }

    private async seedActivity(businesses: BusinessEntity[], riders: RiderEntity[]): Promise<void> {
        const totalOrders = 80;
        this.logger.log(`Generating ${totalOrders} historical orders/deliveries...`);

        for (let i = 0; i < totalOrders; i++) {
            const biz = businesses[i % businesses.length];
            const rider = riders[i % riders.length];
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days

            const orderId = uuidv4();
            const deliveryId = uuidv4();

            const statusRoll = Math.random();
            let orderStatus: OrderStatus;
            let deliveryStatus: DeliveryStatus;
            let paymentStatus: PaymentStatus;

            if (statusRoll > 0.4) {
                orderStatus = OrderStatus.Fulfilled;
                deliveryStatus = DeliveryStatus.Delivered;
                paymentStatus = PaymentStatus.Succeeded;
            } else if (statusRoll > 0.15) {
                orderStatus = OrderStatus.Confirmed;
                deliveryStatus = DeliveryStatus.InTransit;
                paymentStatus = PaymentStatus.Pending;
            } else {
                orderStatus = OrderStatus.Pending;
                deliveryStatus = DeliveryStatus.Requested;
                paymentStatus = PaymentStatus.Pending;
            }

            // 1. Save Order
            const order = OrderEntity.fromDomain({
                orderId,
                businessId: biz.id,
                deliveryId,
                itemSummary: `Order for items #${Math.floor(Math.random() * 1000)}`,
                customerName: `Customer ${i}`,
                customerPhone: `+2547${Math.floor(10000000 + Math.random() * 90000000)}`,
                status: orderStatus,
                totalAmount: 300 + Math.random() * 2000,
                currency: 'KES',
                paymentStatus,
                createdAt: date,
            });
            await this.orderRepository.save(order);

            // 2. Save Delivery
            const delivery = DeliveryEntity.fromDomain({
                deliveryId,
                businessId: biz.id,
                status: deliveryStatus,
                assignedRiderId: deliveryStatus !== DeliveryStatus.Requested ? rider.id : null,
                createdAt: date,
            });
            await this.deliveryRepository.save(delivery);

            // 3. Index everything for Search demonstration
            await this.searchProvider.index({
                entityId: orderId,
                entityType: 'Order',
                workspaceId: biz.id,
                title: `Order #${orderId.slice(0, 8).toUpperCase()}`,
                description: order.itemSummary ?? 'N/A',
                metadata: {
                    status: order.status,
                    customer: order.customerName,
                    total: order.totalAmount
                },
                createdAt: date,
            });

            if (i % 20 === 0) {
                this.logger.debug(`Seeded ${i + 1} orders...`);
            }
        }
    }
}
