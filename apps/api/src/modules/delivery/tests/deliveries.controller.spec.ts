import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandBus } from '@nestjs/cqrs';

import { DeliveriesController, RequestDeliveryDto, CreateQuoteDto, CancelDeliveryDto } from '../controllers/deliveries.controller';
import { DeliveryExecutionCoordinator } from '../coordinators/delivery-execution.coordinator';
import { DeliveryLifecycleCoordinator } from '../coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from '../coordinators/delivery-matching.coordinator';
import { DeliveryRequestCoordinator } from '../coordinators/delivery-request.coordinator';
import { DeliveryEntity } from '../entities/delivery.entity';
import { BillingCalculatorService } from '@api/modules/billing/services/billing-calculator.service';
import { CancelDeliveryCommand } from '../commands/cancel-delivery.command';

describe('DeliveriesController', () => {
    let controller: DeliveriesController;
    let requestCoordinator: DeliveryRequestCoordinator;
    let billingCalculator: BillingCalculatorService;
    let commandBus: CommandBus;

    const mockRequestCoordinator = {
        requestDelivery: jest.fn(),
    };

    const mockBillingCalculator = {
        calculateDeliveryCharges: jest.fn(),
    };

    const mockCommandBus = {
        execute: jest.fn(),
    };

    const mockRepo = {
        findOne: jest.fn(),
        findAndCount: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DeliveriesController],
            providers: [
                {
                    provide: DeliveryRequestCoordinator,
                    useValue: mockRequestCoordinator,
                },
                {
                    provide: DeliveryMatchingCoordinator,
                    useValue: {},
                },
                {
                    provide: DeliveryLifecycleCoordinator,
                    useValue: {},
                },
                {
                    provide: DeliveryExecutionCoordinator,
                    useValue: {},
                },
                {
                    provide: getRepositoryToken(DeliveryEntity),
                    useValue: mockRepo,
                },
                {
                    provide: BillingCalculatorService,
                    useValue: mockBillingCalculator,
                },
                {
                    provide: CommandBus,
                    useValue: mockCommandBus,
                },
            ],
        }).compile();

        controller = module.get<DeliveriesController>(DeliveriesController);
        requestCoordinator = module.get<DeliveryRequestCoordinator>(DeliveryRequestCoordinator);
        billingCalculator = module.get<BillingCalculatorService>(BillingCalculatorService);
        commandBus = module.get<CommandBus>(CommandBus);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('request', () => {
        it('should call requestCoordinator.requestDelivery and return result', async () => {
            const dto: RequestDeliveryDto = {
                businessId: 'biz-123',
                workspaceId: 'ws-123',
                actorId: 'user-123',
                pickup: { label: 'Pickup' },
                dropoff: { label: 'Dropoff' },
                recipientName: 'John',
                recipientPhone: '1234567890',
                itemDescription: 'Box',
            };

            const expectedResult = {
                deliveryId: 'del-123',
                orderId: 'ord-123',
                estimatedCharges: 100,
                currency: 'KES',
                matchingTriggered: true,
                assignedRiderId: null,
            };

            mockRequestCoordinator.requestDelivery.mockResolvedValue(expectedResult);

            const result = await controller.request(dto);

            expect(requestCoordinator.requestDelivery).toHaveBeenCalledWith({
                businessId: dto.businessId,
                workspaceId: dto.workspaceId,
                actorId: dto.actorId,
                pickup: dto.pickup,
                dropoff: dto.dropoff,
                recipientName: dto.recipientName,
                recipientPhone: dto.recipientPhone,
                itemId: undefined,
                itemDescription: dto.itemDescription,
                scheduledPickupTime: undefined,
                declaredItemValue: undefined,
                specialInstructions: undefined,
                distanceKm: undefined,
            });

            expect(result).toEqual({
                deliveryId: 'del-123',
                orderId: 'ord-123',
                estimatedCharges: 100,
                assignedRiderId: null,
            });
        });
    });

    describe('createQuote', () => {
        it('should create a delivery quote and return pricing', async () => {
            const dto: CreateQuoteDto = {
                businessId: 'biz-123',
                workspaceId: 'ws-123',
                pickup: { label: 'Pickup', latitude: -1.2921, longitude: 36.8219 },
                dropoff: { label: 'Dropoff', latitude: -1.2921, longitude: 36.8219 },
                distanceKm: 5.5,
            };

            mockBillingCalculator.calculateDeliveryCharges.mockReturnValue({
                charges: [
                    { chargeType: 'BASE_DELIVERY_FEE', amount: 200, description: 'Base fee' },
                    { chargeType: 'DISTANCE_FEE', amount: 275, description: 'Distance fee' },
                ],
                grandTotal: 475,
                currency: 'KES',
            });

            const result = await controller.createQuote(dto);

            expect(billingCalculator.calculateDeliveryCharges).toHaveBeenCalledWith({
                distanceKm: 5.5,
                currency: 'KES',
                baseDeliveryFee: 200,
                pricePerKm: 50,
            });
            expect(result.quoteId).toBeDefined();
            expect(result.basePrice).toBe(200);
            expect(result.distancePrice).toBe(275);
            expect(result.totalPrice).toBe(475);
            expect(result.distanceKm).toBe(5.5);
        });

        it('should handle quote creation without distance', async () => {
            const dto: CreateQuoteDto = {
                businessId: 'biz-123',
                workspaceId: 'ws-123',
                pickup: { label: 'Pickup', latitude: -1.2921, longitude: 36.8219 },
                dropoff: { label: 'Dropoff', latitude: -1.2921, longitude: 36.8219 },
            };

            mockBillingCalculator.calculateDeliveryCharges.mockReturnValue({
                charges: [
                    { chargeType: 'BASE_DELIVERY_FEE', amount: 200, description: 'Base fee' },
                ],
                grandTotal: 200,
                currency: 'KES',
            });

            const result = await controller.createQuote(dto);

            expect(result.totalPrice).toBe(200);
        });
    });

    describe('findByExternalOrderId', () => {
        it('should find deliveries by external order ID', async () => {
            const mockDelivery = {
                id: 'del-123',
                externalOrderId: 'woo-123',
                toDomain: () => ({ id: 'del-123', externalOrderId: 'woo-123' }),
            };

            mockRepo.find.mockResolvedValue([mockDelivery]);

            const result = await controller.findByExternalOrderId('woo-123');

            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { externalOrderId: 'woo-123' },
            });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].externalOrderId).toBe('woo-123');
        });

        it('should return empty array when no deliveries found', async () => {
            mockRepo.find.mockResolvedValue([]);

            const result = await controller.findByExternalOrderId('nonexistent');

            expect(result.data).toHaveLength(0);
        });
    });

    describe('cancel', () => {
        it('should cancel a delivery successfully', async () => {
            mockRepo.findOne.mockResolvedValue({ id: 'del-123', status: 'pending' });
            mockCommandBus.execute.mockResolvedValue(undefined);

            const dto: CancelDeliveryDto = { reason: 'Customer requested' };
            const result = await controller.cancel('del-123', dto);

            expect(mockCommandBus.execute).toHaveBeenCalledWith(
                new CancelDeliveryCommand('del-123', 'Customer requested')
            );
            expect(result.success).toBe(true);
            expect(result.deliveryId).toBe('del-123');
        });

        it('should throw NotFoundException when delivery not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            const dto: CancelDeliveryDto = { reason: 'Customer requested' };

            await expect(controller.cancel('nonexistent', dto)).rejects.toThrow('not found');
        });
    });
});
