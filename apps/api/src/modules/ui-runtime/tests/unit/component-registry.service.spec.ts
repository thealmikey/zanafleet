import { Test, TestingModule } from '@nestjs/testing';
import { ComponentRegistryService } from '../../registry/component-registry.service';
import { ComponentDefinition } from '../../schema/v1/types';

describe('ComponentRegistryService', () => {
  let service: ComponentRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComponentRegistryService],
    }).compile();

    service = module.get<ComponentRegistryService>(ComponentRegistryService);
  });

  describe('Component Registration', () => {
    it('should register a component', () => {
      const component: ComponentDefinition = {
        type: 'CustomComponent',
        version: '1.0.0',
        displayName: 'Custom Component',
        description: 'A custom test component',
        category: 'display',
        propsSchema: {},
        renderer: 'CustomRenderer',
      };

      service.register(component);

      expect(service.get('CustomComponent')).toBeDefined();
    });

    it('should overwrite existing component registration', () => {
      const component1: ComponentDefinition = {
        type: 'TestComponent',
        version: '1.0.0',
        displayName: 'Test Component',
        description: 'First version',
        category: 'display',
        propsSchema: {},
        renderer: 'TestRenderer1',
      };

      const component2: ComponentDefinition = {
        type: 'TestComponent',
        version: '2.0.0',
        displayName: 'Test Component',
        description: 'Second version',
        category: 'display',
        propsSchema: {},
        renderer: 'TestRenderer2',
      };

      service.register(component1);
      service.register(component2);

      const retrieved = service.get('TestComponent');
      expect(retrieved?.version).toBe('2.0.0');
      expect(retrieved?.renderer).toBe('TestRenderer2');
    });
  });

  describe('Component Retrieval', () => {
    it('should retrieve registered component', () => {
      const component: ComponentDefinition = {
        type: 'RetrievableComponent',
        version: '1.0.0',
        displayName: 'Retrievable Component',
        description: 'A component for testing retrieval',
        category: 'display',
        propsSchema: {},
        renderer: 'RetrievableRenderer',
      };

      service.register(component);
      const retrieved = service.get('RetrievableComponent');

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('RetrievableComponent');
    });

    it('should return undefined for non-existent component', () => {
      const retrieved = service.get('NonExistentComponent');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve all components', () => {
      const allComponents = service.getAll();
      expect(allComponents.length).toBeGreaterThan(0);
    });

    it('should check if component exists', () => {
      expect(service.has('Text')).toBe(true);
      expect(service.has('NonExistent')).toBe(false);
    });
  });

  describe('Component Categories', () => {
    it('should retrieve components by category', () => {
      const displayComponents = service.getByCategory('display');
      expect(displayComponents.length).toBeGreaterThan(0);
      displayComponents.forEach(c => {
        expect(c.category).toBe('display');
      });
    });

    it('should return empty array for unknown category', () => {
      const components = service.getByCategory('unknown' as any);
      expect(components).toEqual([]);
    });
  });

  describe('Component Tags', () => {
    it('should retrieve components by tag', () => {
      const textComponents = service.getByTag('text');
      expect(textComponents.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown tag', () => {
      const components = service.getByTag('unknown-tag');
      expect(components).toEqual([]);
    });
  });

  describe('Platform Support', () => {
    it('should support web platform by default', () => {
      expect(service.supportsPlatform('Text', 'web')).toBe(true);
    });

    it('should check platform-specific support', () => {
      // The built-in Text component supports all platforms
      expect(service.supportsPlatform('Text', 'ios')).toBe(true);
      expect(service.supportsPlatform('Text', 'android')).toBe(true);
    });

    it('should return false for non-existent component', () => {
      expect(service.supportsPlatform('NonExistent', 'web')).toBe(false);
    });
  });

  describe('Capability Requirements', () => {
    it('should retrieve required capabilities', () => {
      const capabilities = service.getRequiredCapabilities('Button');
      expect(Array.isArray(capabilities)).toBe(true);
    });

    it('should return empty array for component without requirements', () => {
      const capabilities = service.getRequiredCapabilities('Text');
      expect(capabilities).toEqual([]);
    });

    it('should return empty array for non-existent component', () => {
      const capabilities = service.getRequiredCapabilities('NonExistent');
      expect(capabilities).toEqual([]);
    });
  });

  describe('Component Props Schema', () => {
    it('should retrieve props schema', () => {
      const schema = service.getPropsSchema('Button');
      expect(schema).toBeDefined();
    });

    it('should return undefined for non-existent component', () => {
      const schema = service.getPropsSchema('NonExistent');
      expect(schema).toBeUndefined();
    });
  });

  describe('Component Events', () => {
    it('should retrieve component events', () => {
      const events = service.getEvents('Button');
      expect(events).toBeDefined();
    });

    it('should return undefined for non-existent component', () => {
      const events = service.getEvents('NonExistent');
      expect(events).toBeUndefined();
    });
  });

  describe('Built-in Components', () => {
    it('should have Text component registered', () => {
      expect(service.has('Text')).toBe(true);
    });

    it('should have Button component registered', () => {
      expect(service.has('Button')).toBe(true);
    });

    it('should have Input component registered', () => {
      expect(service.has('Input')).toBe(true);
    });

    it('should have Card component registered', () => {
      expect(service.has('Card')).toBe(true);
    });

    it('should have layout components registered', () => {
      expect(service.has('Grid')).toBe(true);
      expect(service.has('Stack')).toBe(true);
      expect(service.has('Tabs')).toBe(true);
      expect(service.has('Modal')).toBe(true);
      expect(service.has('Drawer')).toBe(true);
    });
  });
});
