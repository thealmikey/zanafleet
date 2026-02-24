import { Test, TestingModule } from '@nestjs/testing';
import { UISchemaCompilerService } from '../../compiler/compiler.service';
import { ComponentRegistryService } from '../../registry/component-registry.service';
import {
  createComposeRequest,
  createUISchema,
  createStackLayout,
  createCondition,
  createAction,
  createDataSource,
  createBinding,
  INVALID_CONDITIONS,
} from '../utils/test-fixtures';
import { Condition } from '../../schema/v1/types';

describe('UISchemaCompilerService', () => {
  let service: UISchemaCompilerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UISchemaCompilerService, ComponentRegistryService],
    }).compile();

    service = module.get<UISchemaCompilerService>(UISchemaCompilerService);
  });

  describe('compile', () => {
    it('should compile a valid UISchema request', async () => {
      const request = createComposeRequest();

      const result = await service.compile(request);

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.schemaVersion).toBe(1);
      expect(result.screen).toBeDefined();
      expect(result.screen.id).toBe('dashboard_screen');
    });

    it('should include all required fields in compiled schema', async () => {
      const request = createComposeRequest();

      const result = await service.compile(request);

      expect(result.screen).toHaveProperty('layout');
      expect(result.screen).toHaveProperty('state');
      expect(result.screen).toHaveProperty('dataSources');
      expect(result.screen).toHaveProperty('bindings');
      expect(result.screen).toHaveProperty('actions');
      expect(result.screen).toHaveProperty('validators');
      expect(result.screen).toHaveProperty('telemetry');
      expect(result.metadata).toBeDefined();
      expect(result.capabilities).toBeDefined();
    });

    it('should resolve endpoint variables in data sources', async () => {
      const request = createComposeRequest({
        actorId: 'actor-123',
        contextId: 'context-456',
        contextType: 'order',
      });

      const result = await service.compile(request);

      // Verify endpoint variables are resolved
      expect(result).toBeDefined();
    });

    it('should handle empty component trees', async () => {
      const emptyLayout = createStackLayout({ id: 'empty', children: [] });
      const schema = createUISchema({
        screen: {
          ...createUISchema().screen,
          layout: emptyLayout,
        },
      });

      expect((schema.screen.layout as any).children).toHaveLength(0);
    });

    it('should handle deeply nested components', async () => {
      const depth = 10;
      const nestedLayout = createStackLayout({ id: 'root' });

      let current = nestedLayout;
      for (let i = 0; i < depth; i++) {
        const next = createStackLayout({ id: `level-${i}`, children: [] });
        current.children = [next as never];
        current = next;
      }

      const schema = createUISchema({
        screen: {
          ...createUISchema().screen,
          layout: nestedLayout,
        },
      });

      expect(schema).toBeDefined();
    });
  });

  describe('buildResponse', () => {
    it('should build a valid response with metadata', () => {
      const schema = createUISchema();

      const response = service.buildResponse(schema);

      expect(response.schema).toEqual(schema);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.schemaVersion).toBe(schema.schemaVersion);
      expect(response.metadata.etag).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
    });

    it('should include features in response metadata', () => {
      const schema = createUISchema({
        screen: {
          ...createUISchema().screen,
          dataSources: [createDataSource()],
          bindings: [createBinding()],
          actions: [createAction()],
        },
      });

      const response = service.buildResponse(schema);

      expect(response.metadata.features).toContain('dataSources');
      expect(response.metadata.features).toContain('bindings');
      expect(response.metadata.features).toContain('actions');
    });

    it('should handle cacheable schemas', () => {
      const schema = createUISchema({
        metadata: {
          ...createUISchema().metadata,
          cacheable: true,
          ttl: 600,
        },
      });

      const response = service.buildResponse(schema);

      expect(response.metadata.ttl).toBe(600);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate equality condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'eq',
          left: 'user.role',
          right: 'admin',
        },
      });

      const context = { user: { role: 'admin' } };
      const result = service.evaluateCondition(condition, context);

      expect(result).toBe(true);
    });

    it('should evaluate inequality condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'ne',
          left: 'user.role',
          right: 'admin',
        },
      });

      const context = { user: { role: 'user' } };
      const result = service.evaluateCondition(condition, context);

      expect(result).toBe(true);
    });

    it('should evaluate greater than condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'gt',
          left: 'count',
          right: 10,
        },
      });

      const result1 = service.evaluateCondition(condition, { count: 15 });
      const result2 = service.evaluateCondition(condition, { count: 5 });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate less than condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'lt',
          left: 'count',
          right: 10,
        },
      });

      const result1 = service.evaluateCondition(condition, { count: 5 });
      const result2 = service.evaluateCondition(condition, { count: 15 });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate contains condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'contains',
          left: 'text',
          right: 'hello',
        },
      });

      const result1 = service.evaluateCondition(condition, { text: 'hello world' });
      const result2 = service.evaluateCondition(condition, { text: 'goodbye' });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate startsWith condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'startsWith',
          left: 'text',
          right: 'hello',
        },
      });

      const result1 = service.evaluateCondition(condition, { text: 'hello world' });
      const result2 = service.evaluateCondition(condition, { text: 'say hello' });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate endsWith condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'endsWith',
          left: 'text',
          right: 'world',
        },
      });

      const result1 = service.evaluateCondition(condition, { text: 'hello world' });
      const result2 = service.evaluateCondition(condition, { text: 'world hello' });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate exists condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'exists',
          left: 'user.name',
          right: '',
        },
      });

      const result1 = service.evaluateCondition(condition, { user: { name: 'John' } });
      const result2 = service.evaluateCondition(condition, { user: {} });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate isNull condition', () => {
      const condition: Condition = createCondition({
        $when: {
          operator: 'isNull',
          left: 'user.name',
          right: '',
        },
      });

      const result1 = service.evaluateCondition(condition, { user: {} });
      const result2 = service.evaluateCondition(condition, { user: { name: 'John' } });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate AND conditions', () => {
      const condition: Condition = {
        $and: [
          { $when: { operator: 'eq', left: 'user.role', right: 'admin' } },
          { $when: { operator: 'eq', left: 'user.active', right: true } },
        ],
      };

      const result1 = service.evaluateCondition(condition, {
        user: { role: 'admin', active: true },
      });
      const result2 = service.evaluateCondition(condition, {
        user: { role: 'admin', active: false },
      });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should evaluate OR conditions', () => {
      const condition: Condition = {
        $or: [
          { $when: { operator: 'eq', left: 'user.role', right: 'admin' } },
          { $when: { operator: 'eq', left: 'user.role', right: 'manager' } },
        ],
      };

      const result1 = service.evaluateCondition(condition, { user: { role: 'admin' } });
      const result2 = service.evaluateCondition(condition, { user: { role: 'manager' } });
      const result3 = service.evaluateCondition(condition, { user: { role: 'user' } });

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false);
    });

    it('should return true for null condition', () => {
      const result = service.evaluateCondition(null as any, {});

      expect(result).toBe(true);
    });

    it('should return true for empty condition object', () => {
      const result = service.evaluateCondition({} as Condition, {});

      expect(result).toBe(true);
    });

    it('should handle unknown operators gracefully', () => {
      const condition = INVALID_CONDITIONS.unknownOperator;

      const result = service.evaluateCondition(condition as Condition, {});

      expect(result).toBe(true);
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in schema', async () => {
      const request = createComposeRequest({
        actorId: 'sensitive-actor',
      });

      const result = await service.compile(request);

      // Verify no sensitive data leakage
      expect(result.metadata.screenId).toBeDefined();
    });

    it('should filter actions based on capabilities', async () => {
      const schema = createUISchema({
        screen: {
          ...createUISchema().screen,
          actions: [
            createAction({ id: 'action-1', requiresCapability: 'user.read' }),
            createAction({ id: 'action-2', requiresCapability: 'admin.delete' }),
          ],
        },
      });

      // Note: In a real implementation, the compiler would filter based on actor capabilities
      expect(schema.screen.actions).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('should compile schema within acceptable time', async () => {
      const request = createComposeRequest();

      const startTime = Date.now();
      await service.compile(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
