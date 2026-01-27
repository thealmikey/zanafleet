import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { CreateRoleCommand } from '../../commands/create-role.command';
import { RoleCreatedEventV1 } from '../../events/role-created.event';
import { CreateRoleCommandHandler } from '../../handlers/create-role.handler';
import { RoleEntity } from '../../entities/role.entity';
import { RoleScope } from '../../dto/role.enums';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

/**
 * Integration Tests: CreateRoleCommand End-to-End
 *
 * Test flow:
 * 1. Command is executed via CommandBus
 * 2. CommandHandler checks for duplicates
 * 3. CommandHandler persists to PostgreSQL
 * 4. RoleCreatedEvent-V1 is emitted
 * 5. Verify: No duplicate events, deterministic behavior, duplicate rejection
 *
 * Prerequisites:
 * - TypeORM with test database (SQLite or PostgreSQL test DB)
 * - NestJS CQRS module
 */
describeIntegration('CreateRoleCommand Integration Tests', () => {
  let module!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let roleRepository!: Repository<RoleEntity>;
  let emittedEvents: RoleCreatedEventV1[] = [];
  let moduleInitializationFailed = false;

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          CqrsModule,
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.TEST_DB_HOST || 'localhost',
            port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
            username: process.env.TEST_DB_USER || 'test',
            password: process.env.TEST_DB_PASSWORD || 'test',
            database: process.env.TEST_DB_NAME || 'zanafleet_test',
            entities: [RoleEntity],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([RoleEntity]),
        ],
        providers: [CreateRoleCommandHandler],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      eventBus = module.get<EventBus>(EventBus);
      roleRepository = module.get<Repository<RoleEntity>>(
        getRepositoryToken(RoleEntity),
      );

      eventBus.subscribe((event) => {
        if (event instanceof RoleCreatedEventV1) {
          emittedEvents.push(event);
        }
      });

      commandBus.register([CreateRoleCommandHandler]);
    } catch (error) {
      console.warn(
        'Failed to initialize Role integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error),
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Role integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d).',
      );
    }
  });

  afterEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    emittedEvents = [];
    await roleRepository.delete({});
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await module.close();
    }
  });

  describe('Complete Command Flow', () => {
    it('should execute command, persist to DB, and emit event', async () => {
      const command = new CreateRoleCommand({
        name: 'Integration Test Role',
        permissions: ['read', 'write'],
        scope: RoleScope.Organization,
      });

      const roleId = await commandBus.execute(command);

      expect(roleId).toBeDefined();
      expect(typeof roleId).toBe('string');

      const savedRole = await roleRepository.findOne({
        where: { id: roleId },
      });
      expect(savedRole).toBeDefined();
      expect(savedRole?.name).toBe('Integration Test Role');
      expect(savedRole?.permissions).toEqual(['read', 'write']);
      expect(savedRole?.scope).toBe(RoleScope.Organization);

      expect(emittedEvents.length).toBe(1);
      const event = emittedEvents[0];
      expect(event.roleId).toBe(roleId);
      expect(event.eventType).toBe('RoleCreatedEvent-V1');
      expect(event.name).toBe('Integration Test Role');
      expect(event.permissions).toEqual(['read', 'write']);
      expect(event.scope).toBe(RoleScope.Organization);
    });

    it('should persist empty permissions array', async () => {
      const command = new CreateRoleCommand({
        name: 'Role Without Permissions',
        permissions: [],
        scope: RoleScope.Workspace,
      });

      const roleId = await commandBus.execute(command);

      const savedRole = await roleRepository.findOne({
        where: { id: roleId },
      });
      expect(savedRole?.permissions).toEqual([]);
    });

    it('should emit event with correct metadata', async () => {
      const command = new CreateRoleCommand({
        name: 'Metadata Test Role',
        permissions: ['admin'],
        scope: RoleScope.Actor,
      });

      const roleId = await commandBus.execute(command);

      const event = emittedEvents[0];
      expect(event.eventId).toBeDefined();
      expect(event.aggregateId).toBe(roleId);
      expect(event.aggregateType).toBe('Role');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.createdAt).toBeInstanceOf(Date);
    });

    it('should not emit duplicate events for single command', async () => {
      const command = new CreateRoleCommand({
        name: 'No Duplicates Role',
        permissions: ['read'],
        scope: RoleScope.Organization,
      });

      await commandBus.execute(command);

      expect(emittedEvents.length).toBe(1);
    });
  });

  describe('Duplicate Role Prevention', () => {
    it('should reject role with duplicate name and scope', async () => {
      const command1 = new CreateRoleCommand({
        name: 'Duplicate Role',
        permissions: ['read'],
        scope: RoleScope.Organization,
      });

      await commandBus.execute(command1);
      emittedEvents = [];

      const command2 = new CreateRoleCommand({
        name: 'Duplicate Role',
        permissions: ['write'],
        scope: RoleScope.Organization,
      });

      await expect(commandBus.execute(command2)).rejects.toThrow(ConflictException);
      await expect(commandBus.execute(command2)).rejects.toThrow(
        'Role with name "Duplicate Role" and scope "Organization" already exists',
      );

      expect(emittedEvents.length).toBe(0);
    });

    it('should allow same name with different scope', async () => {
      const command1 = new CreateRoleCommand({
        name: 'Admin',
        permissions: ['all'],
        scope: RoleScope.Organization,
      });

      const command2 = new CreateRoleCommand({
        name: 'Admin',
        permissions: ['all'],
        scope: RoleScope.Workspace,
      });

      const command3 = new CreateRoleCommand({
        name: 'Admin',
        permissions: ['all'],
        scope: RoleScope.Actor,
      });

      const roleId1 = await commandBus.execute(command1);
      const roleId2 = await commandBus.execute(command2);
      const roleId3 = await commandBus.execute(command3);

      expect(roleId1).not.toBe(roleId2);
      expect(roleId2).not.toBe(roleId3);
      expect(emittedEvents.length).toBe(3);

      const count = await roleRepository.count({ where: { name: 'Admin' } });
      expect(count).toBe(3);
    });

    it('should allow different names with same scope', async () => {
      const command1 = new CreateRoleCommand({
        name: 'Role A',
        permissions: ['read'],
        scope: RoleScope.Organization,
      });

      const command2 = new CreateRoleCommand({
        name: 'Role B',
        permissions: ['write'],
        scope: RoleScope.Organization,
      });

      const roleId1 = await commandBus.execute(command1);
      const roleId2 = await commandBus.execute(command2);

      expect(roleId1).not.toBe(roleId2);
      expect(emittedEvents.length).toBe(2);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce events with same properties for same input (different IDs)', async () => {
      const command1 = new CreateRoleCommand({
        name: 'Deterministic Role',
        permissions: ['read', 'write'],
        scope: RoleScope.Workspace,
      });

      await commandBus.execute(command1);
      const event1 = emittedEvents[0];
      emittedEvents = [];
      await roleRepository.delete({});

      const command2 = new CreateRoleCommand({
        name: 'Deterministic Role',
        permissions: ['read', 'write'],
        scope: RoleScope.Workspace,
      });

      await commandBus.execute(command2);
      const event2 = emittedEvents[0];

      expect(event1.name).toBe(event2.name);
      expect(event1.permissions).toEqual(event2.permissions);
      expect(event1.scope).toBe(event2.scope);
      expect(event1.roleId).not.toBe(event2.roleId);
    });

    it('should create unique roles with different IDs', async () => {
      const command1 = new CreateRoleCommand({
        name: 'Role X',
        permissions: [],
        scope: RoleScope.Organization,
      });

      const command2 = new CreateRoleCommand({
        name: 'Role Y',
        permissions: [],
        scope: RoleScope.Workspace,
      });

      const id1 = await commandBus.execute(command1);
      const id2 = await commandBus.execute(command2);

      expect(id1).not.toBe(id2);
      expect(emittedEvents.length).toBe(2);
      expect(emittedEvents[0].roleId).toBe(id1);
      expect(emittedEvents[1].roleId).toBe(id2);
    });
  });

  describe('Event Immutability', () => {
    it('should create immutable event with frozen permissions', async () => {
      const command = new CreateRoleCommand({
        name: 'Immutable Test',
        permissions: ['read', 'write'],
        scope: RoleScope.Organization,
      });

      await commandBus.execute(command);
      const event = emittedEvents[0];

      expect(() => {
        (event.permissions as string[]).push('delete');
      }).toThrow();
    });

    it('should serialize and deserialize event correctly', async () => {
      const command = new CreateRoleCommand({
        name: 'Serialization Test',
        permissions: ['read', 'write', 'delete'],
        scope: RoleScope.Workspace,
      });

      await commandBus.execute(command);
      const originalEvent = emittedEvents[0];
      const serialized = originalEvent.toJSON();
      const deserialized = RoleCreatedEventV1.fromJSON(serialized);

      expect(deserialized.roleId).toBe(originalEvent.roleId);
      expect(deserialized.name).toBe(originalEvent.name);
      expect(deserialized.permissions).toEqual([...originalEvent.permissions]);
      expect(deserialized.scope).toBe(originalEvent.scope);
      expect(deserialized.eventType).toBe('RoleCreatedEvent-V1');
    });
  });

  describe('All Scopes', () => {
    it('should handle Organization scope', async () => {
      const command = new CreateRoleCommand({
        name: 'Org Role',
        permissions: ['manage_org'],
        scope: RoleScope.Organization,
      });

      const roleId = await commandBus.execute(command);

      const savedRole = await roleRepository.findOne({ where: { id: roleId } });
      expect(savedRole?.scope).toBe(RoleScope.Organization);
    });

    it('should handle Workspace scope', async () => {
      const command = new CreateRoleCommand({
        name: 'Workspace Role',
        permissions: ['manage_workspace'],
        scope: RoleScope.Workspace,
      });

      const roleId = await commandBus.execute(command);

      const savedRole = await roleRepository.findOne({ where: { id: roleId } });
      expect(savedRole?.scope).toBe(RoleScope.Workspace);
    });

    it('should handle Actor scope', async () => {
      const command = new CreateRoleCommand({
        name: 'Actor Role',
        permissions: ['manage_self'],
        scope: RoleScope.Actor,
      });

      const roleId = await commandBus.execute(command);

      const savedRole = await roleRepository.findOne({ where: { id: roleId } });
      expect(savedRole?.scope).toBe(RoleScope.Actor);
    });
  });
});
