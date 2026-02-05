import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateSaccoCommand } from '../../commands/create-sacco.command';
import { SaccoEntity } from '../../entities/sacco.entity';
import { SaccoCreatedEventV1 } from '../../events/sacco-created.event';
import { CreateSaccoCommandHandler } from '../../handlers/create-sacco.handler';

describe('CreateSaccoCommandHandler', () => {
  let handler: CreateSaccoCommandHandler;
  let repository: Repository<SaccoEntity>;
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSaccoCommandHandler,
        {
          provide: getRepositoryToken(SaccoEntity),
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

    handler = module.get<CreateSaccoCommandHandler>(CreateSaccoCommandHandler);
    repository = module.get<Repository<SaccoEntity>>(getRepositoryToken(SaccoEntity));
    eventBus = module.get<EventBus>(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully create a sacco with location object', async () => {
      const command = new CreateSaccoCommand({
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      });

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'save').mockResolvedValue({} as SaccoEntity);

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: command.name },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should pass location object correctly to entity', async () => {
      const locationData = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Westlands',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };

      const command = new CreateSaccoCommand({
        name: 'Nairobi Taxi Sacco',
        location: locationData,
        contactPhone: '+254712345678',
      });

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'save').mockResolvedValue({} as SaccoEntity);

      await handler.execute(command);

      const saveCall = (repository.save as jest.Mock).mock.calls[0][0] as SaccoEntity;
      expect(saveCall.location).toEqual(locationData);
      expect(saveCall.name).toBe('Nairobi Taxi Sacco');
      expect(saveCall.contactPhone).toBe('+254712345678');
    });

    it('should pass location object correctly to event', async () => {
      const locationData = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Westlands',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };

      const command = new CreateSaccoCommand({
        name: 'Nairobi Taxi Sacco',
        location: locationData,
        contactPhone: '+254712345678',
      });

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'save').mockResolvedValue({} as SaccoEntity);

      await handler.execute(command);

      const publishCall = (eventBus.publish as jest.Mock).mock.calls[0][0] as SaccoCreatedEventV1;
      expect(publishCall.location).toEqual(locationData);
      expect(publishCall.name).toBe('Nairobi Taxi Sacco');
      expect(publishCall.contactPhone).toBe('+254712345678');
    });

    it('should reject duplicate sacco name with ConflictException', async () => {
      const command = new CreateSaccoCommand({
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      });

      const existingSacco = new SaccoEntity();
      existingSacco.id = 'existing-id';
      existingSacco.name = 'Nairobi Taxi Sacco';
      existingSacco.location = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Westlands',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };
      existingSacco.contactPhone = '+254712345678';
      existingSacco.createdAt = new Date();
      existingSacco.updatedAt = new Date();

      jest.spyOn(repository, 'findOne').mockResolvedValue(existingSacco);

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should verify location is passed through correctly from command to entity to event', async () => {
      const locationData = {
        latitude: -1.295,
        longitude: 36.823,
        humanReadableName: 'Upper Hill',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };

      const command = new CreateSaccoCommand({
        name: 'Upper Hill Sacco',
        location: locationData,
        contactPhone: '+254723456789',
      });

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'save').mockResolvedValue({} as SaccoEntity);

      await handler.execute(command);

      // Verify entity received correct location
      const entityCall = (repository.save as jest.Mock).mock.calls[0][0] as SaccoEntity;
      expect(entityCall.location.latitude).toBe(-1.295);
      expect(entityCall.location.longitude).toBe(36.823);
      expect(entityCall.location.humanReadableName).toBe('Upper Hill');
      expect(entityCall.location.administrativeArea).toBe('Nairobi');

      // Verify event received correct location
      const eventCall = (eventBus.publish as jest.Mock).mock.calls[0][0] as SaccoCreatedEventV1;
      expect(eventCall.location.latitude).toBe(-1.295);
      expect(eventCall.location.longitude).toBe(36.823);
      expect(eventCall.location.humanReadableName).toBe('Upper Hill');
      expect(eventCall.location.administrativeArea).toBe('Nairobi');
    });

    it('should create event with proper structure', async () => {
      const command = new CreateSaccoCommand({
        name: 'Test Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Test Area',
          administrativeArea: 'Test County',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      });

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'save').mockResolvedValue({} as SaccoEntity);

      await handler.execute(command);

      const event = (eventBus.publish as jest.Mock).mock.calls[0][0] as SaccoCreatedEventV1;
      expect(event.eventType).toBe('Sacco.Sacco.CreatedV1');
      expect(event.eventVersion).toBe('V1');
      expect(event.aggregateType).toBe('Sacco');
      expect(event.saccoId).toBe(event.aggregateId);
      expect(event.name).toBe('Test Sacco');
      expect(event.contactPhone).toBe('+254712345678');
      expect(event.createdAt).toBeDefined();
      expect(event.occurredAt).toBeDefined();
    });
  });
});
