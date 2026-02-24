import { EventBusModule } from '@api/core/event-bus';
import { Neo4jModule, Neo4jService } from '@api/core/neo4j';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { SendNotificationCommand } from '../../commands/send-notification.command';
import { CommunicationModule } from '../../communication.module';
import {
  NotificationChannel,
  NotificationStatus,
  RecipientType,
} from '../../dto/notification.enums';
import { NotificationEntity } from '../../entities/notification.entity';

const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

(shouldRunIntegration ? describe : describe.skip)('SendNotification Integration Tests', () => {
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
        CommunicationModule,
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
      await entityManager.query('DELETE FROM notifications WHERE "workspaceId" IS NOT NULL');
      await entityManager.query(
        'DELETE FROM notification_preferences WHERE "recipientId" LIKE $1',
        ['test-%']
      );
    }

    // Clean up test data from Neo4j
    if (neo4jService) {
      const session = neo4jService.getWriteSession();
      try {
        await session.run("MATCH (n:Notification) WHERE n.id STARTS WITH 'test-' DETACH DELETE n");
      } finally {
        await session.close();
      }
    }
  });

  describe('Send Notification Command Flow', () => {
    it('should send notification successfully and return notificationId', async () => {
      const workspaceId = uuidv4();
      const recipientId = uuidv4();
      const correlationId = uuidv4();

      const command = new SendNotificationCommand(
        recipientId,
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'welcome',
        { username: 'TestUser', email: 'test@example.com' },
        workspaceId,
        correlationId
      );

      const result = await commandBus.execute(command);

      expect(result).toBeDefined();
      expect(result.notificationId).toBeDefined();
      expect(typeof result.notificationId).toBe('string');
      expect(result.notificationId.length).toBe(36);
    });

    it('should create notification record in database with SENT status', async () => {
      const workspaceId = uuidv4();
      const recipientId = uuidv4();

      const command = new SendNotificationCommand(
        recipientId,
        RecipientType.RIDER,
        NotificationChannel.SMS,
        'rider-onboarded',
        { fullName: 'Test Rider', saccoName: 'Test Sacco' },
        workspaceId
      );

      const result = await commandBus.execute(command);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const entityManager = module.get('EntityManager');
      const notification = await entityManager.findOne(NotificationEntity, {
        where: { id: result.notificationId },
      });

      expect(notification).toBeDefined();
      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(notification.recipientId).toBe(recipientId);
      expect(notification.channel).toBe(NotificationChannel.SMS);
    });

    it('should handle multiple channels for same recipient', async () => {
      const workspaceId = uuidv4();
      const recipientId = uuidv4();

      const emailCommand = new SendNotificationCommand(
        recipientId,
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'welcome',
        { username: 'TestUser', email: 'test@example.com' },
        workspaceId
      );

      const smsCommand = new SendNotificationCommand(
        recipientId,
        RecipientType.ACTOR,
        NotificationChannel.SMS,
        'welcome',
        { username: 'TestUser', email: 'test@example.com' },
        workspaceId
      );

      const [emailResult, smsResult] = await Promise.all([
        commandBus.execute(emailCommand),
        commandBus.execute(smsCommand),
      ]);

      expect(emailResult.notificationId).toBeDefined();
      expect(smsResult.notificationId).toBeDefined();
      expect(emailResult.notificationId).not.toBe(smsResult.notificationId);
    });
  });
});
