import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationChannel } from '../../dto/notification.enums';
import { TemplateEntity } from '../../entities/template.entity';
import { TemplateService } from '../../services/template.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let repository: Repository<TemplateEntity>;

  const mockTemplate: TemplateEntity = {
    id: 'template-1',
    name: 'welcome-email',
    channel: NotificationChannel.EMAIL,
    subject: 'Welcome {{username}}!',
    body: 'Hello {{username}}, your email is {{email}}.',
    variables: ['username', 'email'],
    version: 1,
    locale: 'en',
    workspaceId: null,
    brandingConfig: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const workspaceTemplate: TemplateEntity = {
    ...mockTemplate,
    id: 'template-2',
    workspaceId: 'workspace-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: getRepositoryToken(TemplateEntity),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    repository = module.get<Repository<TemplateEntity>>(getRepositoryToken(TemplateEntity));
  });

  describe('render', () => {
    it('should interpolate variables in template', () => {
      const variables = {
        username: 'john',
        email: 'john@example.com',
      };

      const result = service.render(mockTemplate, variables);

      expect(result.subject).toBe('Welcome john!');
      expect(result.body).toBe('Hello john, your email is john@example.com.');
      expect(result.variables).toEqual(variables);
    });

    it('should throw when required variables are missing', () => {
      const variables = {
        username: 'john',
      };

      expect(() => service.render(mockTemplate, variables)).toThrow(
        'Missing required template variables: email for template "welcome-email"',
      );
    });

    it('should throw when variable value is empty string', () => {
      const variables = {
        username: 'john',
        email: '',
      };

      expect(() => service.render(mockTemplate, variables)).toThrow();
    });

    it('should throw when variable value is null', () => {
      const variables = {
        username: 'john',
        email: null as any,
      };

      expect(() => service.render(mockTemplate, variables)).toThrow();
    });

    it('should throw when variable value is undefined', () => {
      const variables = {
        username: 'john',
        email: undefined as any,
      };

      expect(() => service.render(mockTemplate, variables)).toThrow();
    });

    it('should handle multiple missing variables', () => {
      const variables = {};

      expect(() => service.render(mockTemplate, variables)).toThrow(
        /Missing required template variables: username, email/,
      );
    });

    it('should return rendered message with correct structure', () => {
      const variables = {
        username: 'alice',
        email: 'alice@example.com',
      };

      const result = service.render(mockTemplate, variables);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('variables');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.body).toBe('string');
    });
  });

  describe('validateVariables', () => {
    it('should return isValid: true when all variables provided', () => {
      const variables = {
        username: 'john',
        email: 'john@example.com',
      };

      const result = service.validateVariables(mockTemplate, variables);

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return isValid: false when variables are missing', () => {
      const variables = {
        username: 'john',
      };

      const result = service.validateVariables(mockTemplate, variables);

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('email');
    });

    it('should list all missing variables', () => {
      const variables = {};

      const result = service.validateVariables(mockTemplate, variables);

      expect(result.missing).toEqual(['username', 'email']);
    });

    it('should treat empty string as missing', () => {
      const variables = {
        username: 'john',
        email: '',
      };

      const result = service.validateVariables(mockTemplate, variables);

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('email');
    });

    it('should return ValidationResult with correct structure', () => {
      const variables = { username: 'john', email: 'john@example.com' };

      const result = service.validateVariables(mockTemplate, variables);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('missing');
      expect(Array.isArray(result.missing)).toBe(true);
    });
  });

  describe('findByName', () => {
    it('should find workspace-specific template when available', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(workspaceTemplate),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.findByName('welcome-email', {
        workspaceId: 'workspace-1',
        locale: 'en',
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toEqual(workspaceTemplate);
      expect(result?.workspaceId).toBe('workspace-1');
    });

    it('should fall back to global template when workspace template not found', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn()
          .mockResolvedValueOnce(null) // workspace-specific query returns null
          .mockResolvedValueOnce(mockTemplate), // global query returns template
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.findByName('welcome-email', {
        workspaceId: 'workspace-1',
        locale: 'en',
      });

      expect(result).toEqual(mockTemplate);
      expect(result?.workspaceId).toBeNull();
    });

    it('should return null when template not found', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.findByName('non-existent', {
        workspaceId: 'workspace-1',
      });

      expect(result).toBeNull();
    });

    it('should use default locale "en" when not specified', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTemplate),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await service.findByName('welcome-email', { workspaceId: 'workspace-1' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('template.locale = :locale', { locale: 'en' });
    });

    it('should filter only active templates', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTemplate),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await service.findByName('welcome-email');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'template.isActive = :isActive',
        { isActive: true },
      );
    });

    it('should support custom locale', async () => {
      const frenchTemplate = { ...mockTemplate, locale: 'fr' };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(frenchTemplate),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await service.findByName('welcome-email', { locale: 'fr' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('template.locale = :locale', { locale: 'fr' });
    });

    it('should support channel filter', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTemplate),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await service.findByName('welcome-email', { channel: NotificationChannel.SMS });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('template.channel = :channel', {
        channel: NotificationChannel.SMS,
      });
    });

    it('should handle missing workspaceId option gracefully', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTemplate),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.findByName('welcome-email');

      expect(result).toEqual(mockTemplate);
    });
  });
});
