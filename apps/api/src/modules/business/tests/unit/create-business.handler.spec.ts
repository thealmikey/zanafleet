import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessType } from '@zanafleet/contracts';

import { CreateBusinessCommand } from '../../commands/create-business.command';
import { BusinessEntity } from '../../entities/business.entity';
import { BusinessOnboardedEventV1 } from '../../events/business-onboarded.event';
import { CreateBusinessCommandHandler } from '../../handlers/create-business.handler';

describe('CreateBusinessCommandHandler', () => {
  let handler: CreateBusinessCommandHandler;
  let businessRepository: any;
  let eventBus: any;

  const testLocation = {
    latitude: -1.29,
    longitude: 36.82,
    humanReadableName: 'Westlands',
    administrativeArea: 'Nairobi',
    country: 'Kenya',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBusinessCommandHandler,
        {
          provide: getRepositoryToken(BusinessEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CreateBusinessCommandHandler>(CreateBusinessCommandHandler);
    businessRepository = module.get(getRepositoryToken(BusinessEntity));
    eventBus = module.get<EventBus>(EventBus);
  });

  describe('execute', () => {
    it('should create a business with all fields including location object', async () => {
      const command = new CreateBusinessCommand({
        businessName: 'Nairobi Supermarket Ltd',
        phone: '+254712345678',
        location: testLocation,
        businessType: BusinessType.Retail,
        email: 'info@business.com',
      });

      businessRepository.findOne.mockResolvedValue(null);
      businessRepository.save.mockResolvedValue(undefined);

      const businessId = await handler.execute(command);

      expect(businessId).toBeDefined();
      expect(businessRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+254712345678' },
      });
      expect(businessRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(BusinessOnboardedEventV1));
    });

    it('should create a business without email', async () => {
      const command = new CreateBusinessCommand({
        businessName: 'Nairobi Restaurant',
        phone: '+254712345678',
        location: testLocation,
        businessType: BusinessType.Restaurant,
        email: null,
      });

      businessRepository.findOne.mockResolvedValue(null);
      businessRepository.save.mockResolvedValue(undefined);

      const businessId = await handler.execute(command);

      expect(businessId).toBeDefined();
      expect(businessRepository.save).toHaveBeenCalled();
      const savedEntity = (businessRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedEntity.email).toBeNull();
      expect(savedEntity.location).toEqual(testLocation);
    });

    it('should create a business with different businessType values', async () => {
      const businessTypes = Object.values(BusinessType);

      for (const type of businessTypes) {
        const command = new CreateBusinessCommand({
          businessName: `Business ${type}`,
          phone: `+2547${Math.random().toString().slice(2, 9)}`,
          location: testLocation,
          businessType: type,
          email: null,
        });

        businessRepository.findOne.mockResolvedValue(null);
        businessRepository.save.mockResolvedValue(undefined);
        eventBus.publish.mockClear();

        const businessId = await handler.execute(command);

        expect(businessId).toBeDefined();
        expect(eventBus.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            businessType: type,
          })
        );
      }
    });

    it('should throw ConflictException if phone already exists', async () => {
      const existingBusiness = new BusinessEntity();
      existingBusiness.id = '550e8400-e29b-41d4-a716-446655440000';
      existingBusiness.phone = '+254712345678';

      const command = new CreateBusinessCommand({
        businessName: 'Test Business',
        phone: '+254712345678',
        location: testLocation,
        businessType: BusinessType.Retail,
        email: null,
      });

      businessRepository.findOne.mockResolvedValue(existingBusiness);

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(businessRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should emit correct event with business data including location object', async () => {
      const command = new CreateBusinessCommand({
        businessName: 'Test Business',
        phone: '+254712345678',
        location: testLocation,
        businessType: BusinessType.Logistics,
        email: 'test@business.com',
      });

      businessRepository.findOne.mockResolvedValue(null);
      businessRepository.save.mockResolvedValue(undefined);

      await handler.execute(command);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Test Business',
          phone: '+254712345678',
          location: testLocation,
          businessType: BusinessType.Logistics,
          email: 'test@business.com',
        })
      );
    });

    it('should pass location object correctly to entity', async () => {
      const command = new CreateBusinessCommand({
        businessName: 'Test Business',
        phone: '+254712345678',
        location: testLocation,
        businessType: BusinessType.Services,
        email: null,
      });

      businessRepository.findOne.mockResolvedValue(null);
      businessRepository.save.mockResolvedValue(undefined);

      await handler.execute(command);

      const saveCall = (businessRepository.save as jest.Mock).mock.calls[0][0] as BusinessEntity;
      expect(saveCall.location).toEqual(testLocation);
      expect(saveCall.location.latitude).toBe(-1.29);
      expect(saveCall.location.longitude).toBe(36.82);
      expect(saveCall.location.humanReadableName).toBe('Westlands');
      expect(saveCall.location.administrativeArea).toBe('Nairobi');
      expect(saveCall.location.country).toBe('Kenya');
    });

    it('should persist entity before emitting event', async () => {
      const command = new CreateBusinessCommand({
        businessName: 'Test Business',
        phone: '+254712345678',
        location: testLocation,
        businessType: BusinessType.Services,
        email: null,
      });

      let saveWasCalled = false;
      businessRepository.findOne.mockResolvedValue(null);
      businessRepository.save.mockImplementation(() => {
        saveWasCalled = true;
      });

      let publishWasCalled = false;
      eventBus.publish.mockImplementation(() => {
        publishWasCalled = true;
        if (!saveWasCalled) {
          throw new Error('Publish called before save');
        }
      });

      await handler.execute(command);

      expect(saveWasCalled).toBe(true);
      expect(publishWasCalled).toBe(true);
    });

    it('should handle repository save errors', async () => {
      const command = new CreateBusinessCommand({
        businessName: 'Test Business',
        phone: '+254712345678',
        location: testLocation,
        businessType: BusinessType.Wholesale,
        email: null,
      });

      businessRepository.findOne.mockResolvedValue(null);
      businessRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should generate unique event and business IDs', async () => {
      const command1 = new CreateBusinessCommand({
        businessName: 'Business 1',
        phone: '+254712345671',
        location: testLocation,
        businessType: BusinessType.Retail,
        email: null,
      });

      const command2 = new CreateBusinessCommand({
        businessName: 'Business 2',
        phone: '+254712345672',
        location: {
          latitude: -4.05,
          longitude: 39.67,
          humanReadableName: 'Mombasa',
          administrativeArea: 'Mombasa',
          country: 'Kenya',
        },
        businessType: BusinessType.Retail,
        email: null,
      });

      businessRepository.findOne.mockResolvedValue(null);
      businessRepository.save.mockResolvedValue(undefined);

      const id1 = await handler.execute(command1);
      const id2 = await handler.execute(command2);

      expect(id1).not.toBe(id2);
    });
  });
});
