import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DeliveriesController, RequestDeliveryDto } from '../controllers/deliveries.controller';
import { DeliveryExecutionCoordinator } from '../coordinators/delivery-execution.coordinator';
import { DeliveryLifecycleCoordinator } from '../coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from '../coordinators/delivery-matching.coordinator';
import { DeliveryRequestCoordinator } from '../coordinators/delivery-request.coordinator';
import { DeliveryEntity } from '../entities/delivery.entity';

describe('DeliveriesController', () => {
    let controller: DeliveriesController;
    let requestCoordinator: DeliveryRequestCoordinator;

    const mockRequestCoordinator = {
        requestDelivery: jest.fn(),
    };

    const mockRepo = {
        findOne: jest.fn(),
        findAndCount: jest.fn(),
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
                }
            ],
        }).compile();

        controller = module.get<DeliveriesController>(DeliveriesController);
        requestCoordinator = module.get<DeliveryRequestCoordinator>(DeliveryRequestCoordinator);
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
});
