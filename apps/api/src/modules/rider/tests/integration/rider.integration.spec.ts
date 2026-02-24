import { EventBusModule } from '@api/core/event-bus';
import { Neo4jModule, Neo4jService } from '@api/core/neo4j';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleType } from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';

import { CreateSaccoCommand } from '../../../sacco/commands/create-sacco.command';
import { SaccoModule } from '../../../sacco/sacco.module';
import { CreateRiderCommand } from '../../commands/create-rider.command';
import { RiderEntity } from '../../entities/rider.entity';
import { RiderModule } from '../../rider.module';

/**
 * Integration tests require real Postgres and Neo4j databases.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- --testPathPattern integration
 * Or start services first: docker-compose -f docker-compose.test.yml up -d
 */
const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

(shouldRunIntegration ? describe : describe.skip)('Rider Integration Tests', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let neo4jService: Neo4jService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'zanafleet_test',
          autoLoadEntities: true,
          synchronize: true,
        }),
        EventBusModule.forRoot({ isGlobal: true }),
        Neo4jModule.forRoot({ isGlobal: true }),
        SaccoModule,
        RiderModule,
      ],
    }).compile();

    await module.init();
    commandBus = module.get<CommandBus>(CommandBus);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  afterEach(async () => {
    // Clean up test data from Postgres
    if (module) {
      const entityManager = module.get('EntityManager');
      await entityManager.query('DELETE FROM riders WHERE full_name LIKE $1', ['Test Rider%']);
      await entityManager.query('DELETE FROM saccos WHERE name LIKE $1', ['Test Sacco%']);
    }

    // Clean up test data from Neo4j
    if (neo4jService) {
      const session = neo4jService.getWriteSession();
      try {
        await session.run(
          "MATCH (r:Rider) WHERE r.fullName STARTS WITH 'Test Rider' DETACH DELETE r"
        );
        await session.run("MATCH (s:Sacco) WHERE s.name STARTS WITH 'Test Sacco' DETACH DELETE s");
      } finally {
        await session.close();
      }
    }
  });

  describe('Create Rider', () => {
    it('should create a Rider without Sacco successfully', async () => {
      const nairobiLocation = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Nairobi',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };
      const phone = `+2547${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`;
      const nationalId = `ID${uuidv4().slice(0, 8)}`;
      const command = new CreateRiderCommand({
        fullName: `Test Rider ${uuidv4().slice(0, 8)}`,
        nationalId,
        phone,
        location: nairobiLocation,
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: null,
      });

      const riderId = await commandBus.execute(command);

      expect(riderId).toBeDefined();
      expect(typeof riderId).toBe('string');
      expect(riderId.length).toBe(36);
    });

    it('should create a Rider with valid Sacco and auto-fill location', async () => {
      // First create a Sacco
      const mombasaLocation = {
        latitude: -4.05,
        longitude: 39.67,
        humanReadableName: 'Mombasa',
        administrativeArea: 'Mombasa',
        country: 'Kenya',
      };
      const saccoName = `Test Sacco ${uuidv4().slice(0, 8)}`;
      const saccoCommand = new CreateSaccoCommand({
        name: saccoName,
        location: mombasaLocation,
        contactPhone: '+254712345678',
      });
      const saccoId = await commandBus.execute(saccoCommand);

      // Create rider with sacco but without location
      const phone = `+2547${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`;
      const nationalId = `ID${uuidv4().slice(0, 8)}`;
      const command = new CreateRiderCommand({
        fullName: `Test Rider ${uuidv4().slice(0, 8)}`,
        nationalId,
        phone,
        location: null, // Should be auto-filled from Sacco
        vehicleType: VehicleType.Car,
        saccoId,
        email: null,
      });

      const riderId = await commandBus.execute(command);

      expect(riderId).toBeDefined();

      // Verify the rider was created with the Sacco's location
      const entityManager = module.get('EntityManager');
      const rider = await entityManager.findOne(RiderEntity, { where: { id: riderId } });
      expect(rider.location).toEqual(mombasaLocation);
    });

    it('should throw NotFoundException when creating Rider with invalid Sacco', async () => {
      const nairobiLocation = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Nairobi',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };
      const phone = `+2547${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`;
      const nationalId = `ID${uuidv4().slice(0, 8)}`;
      const invalidSaccoId = uuidv4();
      const command = new CreateRiderCommand({
        fullName: `Test Rider ${uuidv4().slice(0, 8)}`,
        nationalId,
        phone,
        location: nairobiLocation,
        vehicleType: VehicleType.Bike,
        saccoId: invalidSaccoId,
        email: null,
      });

      await expect(commandBus.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when creating Rider with duplicate phone', async () => {
      const nairobiLocation = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Nairobi',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };
      const mombasaLocation = {
        latitude: -4.05,
        longitude: 39.67,
        humanReadableName: 'Mombasa',
        administrativeArea: 'Mombasa',
        country: 'Kenya',
      };
      const phone = `+2547${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`;
      const command1 = new CreateRiderCommand({
        fullName: `Test Rider ${uuidv4().slice(0, 8)}`,
        nationalId: `ID${uuidv4().slice(0, 8)}`,
        phone,
        location: nairobiLocation,
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: null,
      });
      const command2 = new CreateRiderCommand({
        fullName: `Test Rider ${uuidv4().slice(0, 8)}`,
        nationalId: `ID${uuidv4().slice(0, 8)}`,
        phone, // Same phone
        location: mombasaLocation,
        vehicleType: VehicleType.Car,
        saccoId: null,
        email: null,
      });

      await commandBus.execute(command1);

      await expect(commandBus.execute(command2)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when creating Rider with duplicate national_id', async () => {
      const nairobiLocation = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Nairobi',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };
      const mombasaLocation = {
        latitude: -4.05,
        longitude: 39.67,
        humanReadableName: 'Mombasa',
        administrativeArea: 'Mombasa',
        country: 'Kenya',
      };
      const nationalId = `ID${uuidv4().slice(0, 8)}`;
      const command1 = new CreateRiderCommand({
        fullName: `Test Rider ${uuidv4().slice(0, 8)}`,
        nationalId,
        phone: `+2547${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0')}`,
        location: nairobiLocation,
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: null,
      });
      const command2 = new CreateRiderCommand({
        fullName: `Test Rider ${uuidv4().slice(0, 8)}`,
        nationalId, // Same national ID
        phone: `+2547${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0')}`,
        location: mombasaLocation,
        vehicleType: VehicleType.Car,
        saccoId: null,
        email: null,
      });

      await commandBus.execute(command1);

      await expect(commandBus.execute(command2)).rejects.toThrow(ConflictException);
    });

    it('should create :Rider node and [:BELONGS_TO] relationship in Neo4j when Sacco is provided', async () => {
      // First create a Sacco
      const nairobiLocation = {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Nairobi',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      };
      const saccoName = `Test Sacco ${uuidv4().slice(0, 8)}`;
      const saccoCommand = new CreateSaccoCommand({
        name: saccoName,
        location: nairobiLocation,
        contactPhone: '+254712345678',
      });
      const saccoId = await commandBus.execute(saccoCommand);

      // Create rider with sacco
      const fullName = `Test Rider ${uuidv4().slice(0, 8)}`;
      const phone = `+2547${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`;
      const nationalId = `ID${uuidv4().slice(0, 8)}`;
      const command = new CreateRiderCommand({
        fullName,
        nationalId,
        phone,
        location: nairobiLocation,
        vehicleType: VehicleType.Bike,
        saccoId,
        email: null,
      });

      const riderId = await commandBus.execute(command);

      // Wait for event handler to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify Neo4j node and relationship exist
      const session = neo4jService.getReadSession();
      try {
        // Verify Rider node with separate location properties
        const riderResult = await session.run('MATCH (r:Rider {id: $riderId}) RETURN r', {
          riderId,
        });
        expect(riderResult.records.length).toBe(1);
        const riderNode = riderResult.records[0].get('r').properties;
        expect(riderNode.fullName).toBe(fullName);
        expect(riderNode.phone).toBe(phone);
        expect(riderNode.vehicleType).toBe(VehicleType.Bike);
        expect(riderNode.latitude).toBe(nairobiLocation.latitude);
        expect(riderNode.longitude).toBe(nairobiLocation.longitude);
        expect(riderNode.humanReadableName).toBe(nairobiLocation.humanReadableName);
        expect(riderNode.administrativeArea).toBe(nairobiLocation.administrativeArea);
        expect(riderNode.country).toBe(nairobiLocation.country);

        // Verify BELONGS_TO relationship
        const relResult = await session.run(
          'MATCH (r:Rider {id: $riderId})-[rel:BELONGS_TO]->(s:Sacco {id: $saccoId}) RETURN rel',
          { riderId, saccoId }
        );
        expect(relResult.records.length).toBe(1);
      } finally {
        await session.close();
      }
    });
  });
});
