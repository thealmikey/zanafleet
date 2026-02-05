import { EventBusModule } from '@api/core/event-bus';
import { Neo4jModule, Neo4jService } from '@api/core/neo4j';
import { ConflictException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';


import { CreateSaccoCommand } from '../../commands/create-sacco.command';
import { SaccoModule } from '../../sacco.module';

/**
 * Integration tests require real Postgres and Neo4j databases.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- --testPathPattern integration
 * Or start services first: docker-compose -f docker-compose.test.yml up -d
 */
const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

(shouldRunIntegration ? describe : describe.skip)('Sacco Integration Tests', () => {
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
      await entityManager.query('DELETE FROM saccos WHERE name LIKE $1', ['Test Sacco%']);
    }

    // Clean up test data from Neo4j
    if (neo4jService) {
      const session = neo4jService.getWriteSession();
      try {
        await session.run("MATCH (s:Sacco) WHERE s.name STARTS WITH 'Test Sacco' DETACH DELETE s");
      } finally {
        await session.close();
      }
    }
  });

  describe('Create Sacco', () => {
    it('should create a Sacco with valid data and return saccoId', async () => {
      const command = new CreateSaccoCommand({
        name: `Test Sacco ${uuidv4().slice(0, 8)}`,
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Nairobi',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      });

      const saccoId = await commandBus.execute(command);

      expect(saccoId).toBeDefined();
      expect(typeof saccoId).toBe('string');
      expect(saccoId.length).toBe(36); // UUID length
    });

    it('should throw ConflictException when creating Sacco with duplicate name', async () => {
      const name = `Test Sacco ${uuidv4().slice(0, 8)}`;
      const command1 = new CreateSaccoCommand({
        name,
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Nairobi',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      });
      const command2 = new CreateSaccoCommand({
        name,
        location: {
          latitude: -4.05,
          longitude: 39.67,
          humanReadableName: 'Mombasa',
          administrativeArea: 'Mombasa',
          country: 'Kenya',
        },
        contactPhone: '+254712345679',
      });

      await commandBus.execute(command1);

      await expect(commandBus.execute(command2)).rejects.toThrow(ConflictException);
    });

    it('should create :Sacco node in Neo4j after creation', async () => {
      const name = `Test Sacco ${uuidv4().slice(0, 8)}`;
      const command = new CreateSaccoCommand({
        name,
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Nairobi',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      });

      const saccoId = await commandBus.execute(command);

      // Wait for event handler to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify Neo4j node exists
      const session = neo4jService.getReadSession();
      try {
        const result = await session.run(
          'MATCH (s:Sacco {id: $saccoId}) RETURN s',
          { saccoId }
        );
        expect(result.records.length).toBe(1);
        const node = result.records[0].get('s').properties;
        expect(node.name).toBe(name);
        expect(node.latitude).toBe(-1.29);
        expect(node.longitude).toBe(36.82);
        expect(node.humanReadableName).toBe('Nairobi');
        expect(node.administrativeArea).toBe('Nairobi');
        expect(node.country).toBe('Kenya');
        expect(node.contactPhone).toBe('+254712345678');
      } finally {
        await session.close();
      }
    });
  });
});
