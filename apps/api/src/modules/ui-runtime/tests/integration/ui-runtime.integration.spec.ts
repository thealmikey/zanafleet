/**
 * Integration Tests for SDUI Runtime
 * Tests module interactions and full pipeline flows
 */

import { Test, TestingModule } from '@nestjs/testing';

import { UISchemaCompilerService } from '../../compiler/compiler.service';
import { UIComposerService } from '../../composer/composer.service';
import { ComponentRegistryService } from '../../registry/component-registry.service';
import { UIRuntimeModule } from '../../ui-runtime.module';
import { ValidationService } from '../../validation/validation.service';
import {
  createComposeRequest,
  createActionRequest,
  createUISchema,
} from '../utils/test-fixtures';

describe('UIRuntime Integration', () => {
  let composer: UIComposerService;
  let compiler: UISchemaCompilerService;
  let registry: ComponentRegistryService;
  let validation: ValidationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UIRuntimeModule],
    }).compile();

    composer = moduleFixture.get<UIComposerService>(UIComposerService);
    compiler = moduleFixture.get<UISchemaCompilerService>(UISchemaCompilerService);
    registry = moduleFixture.get<ComponentRegistryService>(ComponentRegistryService);
    validation = moduleFixture.get<ValidationService>(ValidationService);
  });

  describe('Full Screen Composition Pipeline', () => {
    it('should compose dashboard screen end-to-end', async () => {
      const request = createComposeRequest({
        contextType: 'dashboard',
        contextId: 'dashboard-001',
      });

      const response = await composer.compose(request);

      expect(response.schema).toBeDefined();
      expect(response.schema.screen).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.metadata.etag).toBeDefined();
    });

    it('should compose notification center screen', async () => {
      const request = createComposeRequest({
        contextType: 'notifications',
        contextId: 'notifications-001',
      });

      const response = await composer.compose(request);

      expect(response.schema).toBeDefined();
      expect(response.schema.screen.id).toBeDefined();
    });

    it('should handle action execution flow', async () => {
      const composeRequest = createComposeRequest();
      await composer.compose(composeRequest);

      const actionRequest = createActionRequest({
        actionId: 'submit-form',
        payload: { field: 'value' },
      });

      const result = await composer.executeAction(actionRequest);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.correlationId).toBeDefined();
    });
  });

  describe('Component Registry Integration', () => {
    it('should retrieve components for screen composition', () => {
      const components = registry.getAll();
      expect(components.length).toBeGreaterThan(0);
    });

    it('should validate components against schema', () => {
      const buttonSchema = registry.getPropsSchema('Button');
      expect(buttonSchema).toBeDefined();
    });

    it('should check platform support', () => {
      expect(registry.supportsPlatform('Text', 'web')).toBe(true);
      expect(registry.supportsPlatform('Text', 'ios')).toBe(true);
    });
  });

  describe('Validation Integration', () => {
    it('should validate form data', () => {
      const data = {
        email: 'test@example.com',
        name: 'John',
        age: 25,
      };

      const rules = [
        {
          id: 'email-rule',
          field: 'email',
          rules: [
            { type: 'required' as const, severity: 'error' as const },
            { type: 'email' as const, severity: 'error' as const },
          ],
        },
        {
          id: 'name-rule',
          field: 'name',
          rules: [
            { type: 'required' as const, severity: 'error' as const },
            { type: 'minLength' as const, value: 2, severity: 'error' as const },
          ],
        },
        {
          id: 'age-rule',
          field: 'age',
          rules: [
            { type: 'required' as const, severity: 'error' as const },
            { type: 'min' as const, value: 18, severity: 'error' as const },
          ],
        },
      ];

      const result = validation.validate(data, rules);
      expect(result.valid).toBe(true);
    });

    it('should fail validation for invalid data', () => {
      const data = {
        email: 'invalid-email',
        name: '',
        age: 15,
      };

      const rules = [
        {
          id: 'email-rule',
          field: 'email',
          rules: [
            { type: 'required' as const, severity: 'error' as const },
            { type: 'email' as const, severity: 'error' as const },
          ],
        },
        {
          id: 'name-rule',
          field: 'name',
          rules: [
            { type: 'required' as const, severity: 'error' as const },
            { type: 'minLength' as const, value: 2, severity: 'error' as const },
          ],
        },
        {
          id: 'age-rule',
          field: 'age',
          rules: [
            { type: 'required' as const, severity: 'error' as const },
            { type: 'min' as const, value: 18, severity: 'error' as const },
          ],
        },
      ];

      const result = validation.validate(data, rules);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Compilation Integration', () => {
    it('should compile schema with all components', async () => {
      const request = createComposeRequest();

      const schema = await compiler.compile(request);

      expect(schema.version).toBeDefined();
      expect(schema.schemaVersion).toBeDefined();
      expect(schema.screen).toBeDefined();
    });

    it('should build response with metadata', async () => {
      const schema = createUISchema();
      const response = compiler.buildResponse(schema);

      expect(response.metadata.schemaVersion).toBe(1);
      expect(response.metadata.etag).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
    });
  });
});
