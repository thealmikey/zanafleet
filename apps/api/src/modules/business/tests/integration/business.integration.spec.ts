import { EventBusModule } from '@api/core/event-bus';
import { Neo4jModule, Neo4jService } from '@api/core/neo4j';
import { ConflictException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessType } from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';


import { BusinessModule } from '../../business.module';
import { CreateBusinessCommand } from '../../commands/create-business.command';

/**
 * Integration tests require real Postgres and Neo4j databases.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- --testPathPattern integration
 * Or start services first: docker-compose -f docker-compose.test.yml up -d
 */
const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

(shouldRunIntegration ? describe : describe.skip)('Business Integration Tests', () => {
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
        BusinessModule,
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
      await entityManager.query('DELETE FROM businesses WHERE business_name LIKE $1', ['Test Business%']);
    }

    // Clean up test data from Neo4j
    if (neo4jService) {
      const session = neo4jService.getWriteSession();
      try {
        await session.run("MATCH (b:Business) WHERE b.businessName STARTS WITH 'Test Business' DETACH DELETE b");
      } finally {
        await session.close();
      }
    }
  });

  describe('Create Business', () => {
    it('should create a Business with valid data and return businessId', async () => {
      const phone = `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      const command = new CreateBusinessCommand({
        businessName: `Test Business ${uuidv4().slice(0, 8)}`,
        phone,
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Nairobi',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        businessType: BusinessType.Retail,
        email: null,
      });

      const businessId = await commandBus.execute(command);

      expect(businessId).toBeDefined();
      expect(typeof businessId).toBe('string');
      expect(businessId.length).toBe(36);
    });

    it('should throw ConflictException when creating Business with duplicate phone', async () => {
      const phone = `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      const command1 = new CreateBusinessCommand({
        businessName: `Test Business ${uuidv4().slice(0, 8)}`,
        phone,
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Nairobi',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        businessType: BusinessType.Retail,
        email: null,
      });
      const command2 = new CreateBusinessCommand({
        businessName: `Test Business ${uuidv4().slice(0, 8)}`,
        phone, // Same phone
        location: {
          latitude: -4.05,
          longitude: 39.67,
          humanReadableName: 'Mombasa',
          administrativeArea: 'Mombasa',
          country: 'Kenya',
        },
        businessType: BusinessType.Restaurant,
        email: null,
      });

      await commandBus.execute(command1);

      await expect(commandBus.execute(command2)).rejects.toThrow(ConflictException);
    });

    it('should create :Business node in Neo4j after creation with location properties', async () => {
      const businessName = `Test Business ${uuidv4().slice(0, 8)}`;
      const phone = `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      const command = new CreateBusinessCommand({
        businessName,
        phone,
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        businessType: BusinessType.Logistics,
        email: 'test@business.com',
      });

      const businessId = await commandBus.execute(command);

      // Wait for event handler to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify Neo4j node exists with separate location properties
      const session = neo4jService.getReadSession();
      try {
        const result = await session.run(
          'MATCH (b:Business {id: $businessId}) RETURN b',
          { businessId }
        );
        expect(result.records.length).toBe(1);
        const node = result.records[0].get('b').properties;
        expect(node.businessName).toBe(businessName);
        expect(node.phone).toBe(phone);
        expect(node.latitude).toBe(-1.29);
        expect(node.longitude).toBe(36.82);
        expect(node.humanReadableName).toBe('Westlands');
        expect(node.administrativeArea).toBe('Nairobi');
        expect(node.country).toBe('Kenya');
        expect(node.businessType).toBe(BusinessType.Logistics);
        expect(node.email).toBe('test@business.com');
      } finally {
        await session.close();
      }
    });
  });
});
