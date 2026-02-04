import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Neo4jModule } from '@api/core/neo4j';
import { EventBusModule } from '@api/core/event-bus';
import { CommunicationModule } from '../../communication.module';
import { TemplateService } from '../../services/template.service';
import { TemplateEntity } from '../../entities/template.entity';
import { NotificationChannel } from '../../dto/notification.enums';

const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

(shouldRunIntegration ? describe : describe.skip)('Template Integration Tests', () => {
  let module: TestingModule;
  let templateService: TemplateService;
  let templateRepository: Repository<TemplateEntity>;

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
    templateService = module.get<TemplateService>(TemplateService);
    templateRepository = module.get<Repository<TemplateEntity>>(getRepositoryToken(TemplateEntity));
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  afterEach(async () => {
    if (module) {
      const entityManager = module.get('EntityManager');
      await entityManager.query('DELETE FROM notification_templates WHERE "name" LIKE $1', ['test-%']);
    }
  });

  describe('Template Rendering with Variables', () => {
    it('should render template with provided variables', async () => {
      // Create test template
      const template = await templateRepository.save({
        name: `test-welcome-${uuidv4().slice(0, 8)}`,
        channel: NotificationChannel.EMAIL,
        subject: 'Hello {{username}}!',
        body: 'Welcome {{username}}, your email is {{email}}.',
        variables: ['username', 'email'],
        locale: 'en',
        workspaceId: null,
        isActive: true,
      });

      const result = templateService.render(template, {
        username: 'JohnDoe',
        email: 'john@example.com',
      });

      expect(result.subject).toBe('Hello JohnDoe!');
      expect(result.body).toBe('Welcome JohnDoe, your email is john@example.com.');
    });

    it('should throw error when required variable is missing', async () => {
      const template = await templateRepository.save({
        name: `test-missing-var-${uuidv4().slice(0, 8)}`,
        channel: NotificationChannel.EMAIL,
        subject: 'Hello {{username}}!',
        body: 'Your email is {{email}}.',
        variables: ['username', 'email'],
        locale: 'en',
        workspaceId: null,
        isActive: true,
      });

      expect(() =>
        templateService.render(template, { username: 'JohnDoe' }), // missing email
      ).toThrow(/Missing required template variables.*email/);
    });

    it('should validate variables before rendering', async () => {
      const template = await templateRepository.save({
        name: `test-validate-${uuidv4().slice(0, 8)}`,
        channel: NotificationChannel.SMS,
        subject: 'OTP',
        body: 'Your OTP is {{code}}',
        variables: ['code'],
        locale: 'en',
        workspaceId: null,
        isActive: true,
      });

      const validResult = templateService.validateVariables(template, { code: '123456' });
      expect(validResult.isValid).toBe(true);
      expect(validResult.missing).toHaveLength(0);

      const invalidResult = templateService.validateVariables(template, {});
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.missing).toContain('code');
    });
  });

  describe('Workspace Fallback to Global Template', () => {
    it('should find workspace-specific template when available', async () => {
      const workspaceId = uuidv4();
      const templateName = `test-workspace-template-${uuidv4().slice(0, 8)}`;

      // Create global template
      await templateRepository.save({
        name: templateName,
        channel: NotificationChannel.EMAIL,
        subject: 'Global Subject',
        body: 'Global body',
        variables: [],
        locale: 'en',
        workspaceId: null,
        isActive: true,
      });

      // Create workspace-specific template
      await templateRepository.save({
        name: templateName,
        channel: NotificationChannel.EMAIL,
        subject: 'Workspace Subject',
        body: 'Workspace body',
        variables: [],
        locale: 'en',
        workspaceId,
        isActive: true,
      });

      const result = await templateService.findByName(templateName, {
        workspaceId,
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBeDefined();
      expect(result?.workspaceId).toBe(workspaceId);
      expect(result?.subject).toBe('Workspace Subject');
    });

    it('should fall back to global template when workspace template not found', async () => {
      const workspaceId = uuidv4();
      const templateName = `test-global-fallback-${uuidv4().slice(0, 8)}`;

      // Create only global template
      await templateRepository.save({
        name: templateName,
        channel: NotificationChannel.EMAIL,
        subject: 'Global Subject',
        body: 'Global body',
        variables: [],
        locale: 'en',
        workspaceId: null,
        isActive: true,
      });

      const result = await templateService.findByName(templateName, {
        workspaceId, // No workspace-specific template exists
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBeDefined();
      expect(result?.workspaceId).toBeNull();
      expect(result?.subject).toBe('Global Subject');
    });

    it('should return null when no template found', async () => {
      const result = await templateService.findByName('non-existent-template', {
        workspaceId: uuidv4(),
      });

      expect(result).toBeNull();
    });

    it('should filter by locale', async () => {
      const templateName = `test-locale-${uuidv4().slice(0, 8)}`;

      await templateRepository.save({
        name: templateName,
        channel: NotificationChannel.EMAIL,
        subject: 'English Subject',
        body: 'English body',
        variables: [],
        locale: 'en',
        workspaceId: null,
        isActive: true,
      });

      await templateRepository.save({
        name: templateName,
        channel: NotificationChannel.EMAIL,
        subject: 'Sujet Français',
        body: 'Corps en français',
        variables: [],
        locale: 'fr',
        workspaceId: null,
        isActive: true,
      });

      const enResult = await templateService.findByName(templateName, { locale: 'en' });
      expect(enResult?.subject).toBe('English Subject');

      const frResult = await templateService.findByName(templateName, { locale: 'fr' });
      expect(frResult?.subject).toBe('Sujet Français');
    });
  });
});
