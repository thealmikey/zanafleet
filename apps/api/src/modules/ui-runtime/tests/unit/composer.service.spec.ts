import { Test, TestingModule } from '@nestjs/testing';

import { UISchemaCompilerService } from '../../compiler/compiler.service';
import { UIComposerService } from '../../composer/composer.service';
import { ComponentRegistryService } from '../../registry/component-registry.service';
import { TelemetryService } from '../../telemetry/telemetry.service';
import { ValidationService } from '../../validation/validation.service';
import { createComposeRequest, createActionRequest } from '../utils/test-fixtures';

describe('UIComposerService', () => {
  let service: UIComposerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UIComposerService,
        UISchemaCompilerService,
        ComponentRegistryService,
        ValidationService,
        TelemetryService,
      ],
    }).compile();

    service = module.get<UIComposerService>(UIComposerService);
  });

  describe('compose', () => {
    it('should compose UI from request', async () => {
      const request = createComposeRequest();

      const response = await service.compose(request);

      expect(response).toBeDefined();
      expect(response.schema).toBeDefined();
      expect(response.metadata).toBeDefined();
    });

    it('should include schema version in response', async () => {
      const request = createComposeRequest();

      const response = await service.compose(request);

      expect(response.metadata.schemaVersion).toBeDefined();
    });

    it('should include etag in response', async () => {
      const request = createComposeRequest();

      const response = await service.compose(request);

      expect(response.metadata.etag).toBeDefined();
    });

    it('should include timestamp in response', async () => {
      const request = createComposeRequest();

      const response = await service.compose(request);

      expect(response.metadata.timestamp).toBeDefined();
    });
  });

  describe('executeAction', () => {
    it('should execute action successfully', async () => {
      const request = createActionRequest();

      const result = await service.executeAction(request);

      expect(result.success).toBe(true);
      expect(result.correlationId).toBeDefined();
    });

    it('should return data on success', async () => {
      const request = createActionRequest();

      const result = await service.executeAction(request);

      expect(result.data).toBeDefined();
    });

    it('should handle action with correlation ID', async () => {
      const request = createActionRequest({
        correlationId: 'custom-correlation-id',
      });

      const result = await service.executeAction(request);

      expect(result.correlationId).toBe('custom-correlation-id');
    });
  });

  describe('Performance', () => {
    it('should compose UI within acceptable time', async () => {
      const request = createComposeRequest();

      const startTime = Date.now();
      await service.compose(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should execute action within acceptable time', async () => {
      const request = createActionRequest();

      const startTime = Date.now();
      await service.executeAction(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});
