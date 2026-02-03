import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { VehicleType } from '@zanafleet/contracts';
import { SaccoEntity } from '../../../sacco/entities/sacco.entity';
import { CreateRiderCommand } from '../../commands/create-rider.command';
import { RiderEntity } from '../../entities/rider.entity';
import { CreateRiderCommandHandler } from '../../handlers/create-rider.handler';
import { RiderOnboardedEventV1 } from '../../events/rider-onboarded.event';

describe('CreateRiderCommandHandler', () => {
  let handler: CreateRiderCommandHandler;
  let riderRepository: any;
  let saccoRepository: any;
  let eventBus: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRiderCommandHandler,
        {
          provide: getRepositoryToken(RiderEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SaccoEntity),
          useValue: {
            findOne: jest.fn(),
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

    handler = module.get<CreateRiderCommandHandler>(CreateRiderCommandHandler);
    riderRepository = module.get(getRepositoryToken(RiderEntity));
    saccoRepository = module.get(getRepositoryToken(SaccoEntity));
    eventBus = module.get<EventBus>(EventBus);
  });

  describe('execute', () => {
    it('should create a rider without a Sacco', async () => {
      const command = new CreateRiderCommand({
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: 'john@example.com',
      });

      riderRepository.findOne.mockResolvedValue(null);
      riderRepository.save.mockResolvedValue(undefined);

      const riderId = await handler.execute(command);

      expect(riderId).toBeDefined();
      expect(riderRepository.findOne).toHaveBeenCalledTimes(2);
      expect(riderRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(RiderOnboardedEventV1));
    });

    it('should create a rider with a Sacco and auto-fill location', async () => {
      const saccoId = uuidv4();
      const sacco = new SaccoEntity();
      sacco.id = saccoId;
      sacco.name = 'Nairobi Taxi Sacco';
      sacco.location = 'Nairobi, Kenya';
      sacco.contactPhone = '+254712345678';

      const command = new CreateRiderCommand({
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        vehicleType: VehicleType.Bike,
        saccoId,
        email: null,
      });

      saccoRepository.findOne.mockResolvedValue(sacco);
      riderRepository.findOne.mockResolvedValue(null);
      riderRepository.save.mockResolvedValue(undefined);

      const riderId = await handler.execute(command);

      expect(riderId).toBeDefined();
      expect(saccoRepository.findOne).toHaveBeenCalledWith({
        where: { id: saccoId },
      });
      expect(riderRepository.save).toHaveBeenCalled();
      const savedEntity = (riderRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedEntity.location).toBe('Nairobi, Kenya');
    });

    it('should throw NotFoundException if Sacco does not exist', async () => {
      const saccoId = uuidv4();

      const command = new CreateRiderCommand({
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: undefined,
        vehicleType: VehicleType.Bike,
        saccoId,
        email: null,
      });

      saccoRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(riderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if phone already exists', async () => {
      const existingRider = new RiderEntity();
      existingRider.id = uuidv4();
      existingRider.phone = '+254712345678';

      const command = new CreateRiderCommand({
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: null,
      });

      riderRepository.findOne.mockResolvedValueOnce(existingRider);

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(riderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if nationalId already exists', async () => {
      const existingRider = new RiderEntity();
      existingRider.id = uuidv4();
      existingRider.nationalId = '12345678';

      const command = new CreateRiderCommand({
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: null,
      });

      riderRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingRider);

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(riderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if location is required but not provided and no Sacco', async () => {
      const command = new CreateRiderCommand({
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: null,
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: null,
      });

      riderRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(
        'Location is required when no Sacco is provided'
      );
    });
  });
});
