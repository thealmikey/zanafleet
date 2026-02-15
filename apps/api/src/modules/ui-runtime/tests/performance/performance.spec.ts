/**
 * Performance Tests for SDUI Runtime
 * Validates system performance under load
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UISchemaCompilerService } from '../../compiler/compiler.service';
import { UIComposerService } from '../../composer/composer.service';
import { ComponentRegistryService } from '../../registry/component-registry.service';
import { ValidationService } from '../../validation/validation.service';
import { TelemetryService } from '../../telemetry/telemetry.service';
import {
  createComposeRequest,
  createActionRequest,
  createUISchema,
  createLargeComponentTree,
  createSchemaWithManyAISuggestions,
} from '../utils/test-fixtures';

describe('SDUI Runtime Performance', () => {
  let compiler: UISchemaCompilerService;
  let composer: UIComposerService;
  let registry: ComponentRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UISchemaCompilerService,
        UIComposerService,
        ComponentRegistryService,
        ValidationService,
        TelemetryService,
      ],
    }).compile();

    compiler = module.get<UISchemaCompilerService>(UISchemaCompilerService);
    composer = module.get<UIComposerService>(UIComposerService);
    registry = module.get<ComponentRegistryService>(ComponentRegistryService);
  });

  describe('Screen Generation Latency', () => {
    it('should generate simple screen under 100ms', async () => {
      const request = createComposeRequest();

      const startTime = Date.now();
      await composer.compose(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should generate complex dashboard under 500ms', async () => {
      const request = createComposeRequest({
        contextType: 'dashboard',
        contextId: 'complex-dashboard',
      });

      const startTime = Date.now();
      const response = await composer.compose(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
      expect(response.schema).toBeDefined();
    });
  });

  describe('Action Execution Latency', () => {
    it('should execute action under 50ms', async () => {
      const request = createActionRequest();

      const startTime = Date.now();
      await composer.executeAction(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Large Screen Rendering', () => {
    it('should handle screens with 100 components', () => {
      const largeLayout = createLargeComponentTree(100);
      const schema = createUISchema({
        screen: {
          ...createUISchema().screen,
          layout: largeLayout,
        },
      });

      const startTime = Date.now();
      const _response = compiler.buildResponse(schema);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should handle screens with 500 components', () => {
      const largeLayout = createLargeComponentTree(500);
      const schema = createUISchema({
        screen: {
          ...createUISchema().screen,
          layout: largeLayout,
        },
      });

      const startTime = Date.now();
      const _response = compiler.buildResponse(schema);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Many AI Suggestions', () => {
    it('should handle 10 AI suggestions', () => {
      const schema = createSchemaWithManyAISuggestions(10);

      const startTime = Date.now();
      const _response = compiler.buildResponse(schema);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should handle 100 AI suggestions', () => {
      const schema = createSchemaWithManyAISuggestions(100);

      const startTime = Date.now();
      const _response = compiler.buildResponse(schema);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(300);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle 10 concurrent screen compositions', async () => {
      const requests = Array(10).fill(null).map(() => createComposeRequest());

      const startTime = Date.now();
      await Promise.all(requests.map((req) => composer.compose(req)));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle 50 concurrent screen compositions', async () => {
      const requests = Array(50).fill(null).map(() => createComposeRequest());

      const startTime = Date.now();
      await Promise.all(requests.map((req) => composer.compose(req)));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Component Registry Performance', () => {
    it('should retrieve component in under 1ms', () => {
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        registry.get('Button');
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10);
    });

    it('should retrieve all components in under 5ms', () => {
      const startTime = Date.now();
      registry.getAll();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5);
    });
  });
});
