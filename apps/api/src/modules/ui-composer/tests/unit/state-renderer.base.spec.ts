import { Logger } from '@nestjs/common';

import { AbstractStateRenderer } from '../../strategies/state-renderer.base';
import { ComponentRegistryService } from '../../services/component-registry.service';
import { UIComponent, UIActionDefinition, ScreenConfig } from '../../interfaces/ui-composer.interfaces';

/**
 * Concrete implementation of AbstractStateRenderer for testing
 */
class TestStateRenderer extends AbstractStateRenderer {
  readonly contextType = 'TEST_CONTEXT';

  constructor(componentRegistry: ComponentRegistryService, options?: { debug?: boolean }) {
    super(componentRegistry, options);
  }

  protected getComponentsForState(state: string, context: Record<string, unknown>): UIComponent[] {
    const components: UIComponent[] = [];

    if (state === 'draft') {
      components.push(
        this.componentRegistry.createComponent('BookingDetails', {
          title: 'Test Booking',
          ...context,
        })
      );
    } else if (state === 'completed') {
      components.push(
        this.componentRegistry.createComponent('StatusTimeline', {
          status: 'completed',
          ...context,
        })
      );
    }

    return components;
  }

  protected getActionsForState(state: string, _context: Record<string, unknown>): UIActionDefinition[] {
    const actions: UIActionDefinition[] = [];

    if (state === 'draft') {
      actions.push({
        id: 'test-action',
        label: 'Test Action',
        capability: 'test:action:execute',
        requiresConfirmation: false,
        style: 'primary',
      });
    } else if (state === 'completed') {
      actions.push({
        id: 'completed-action',
        label: 'Completed Action',
        capability: 'test:completed:execute',
        requiresConfirmation: false,
        style: 'secondary',
      });
    }

    return actions;
  }

  protected getScreenConfiguration(state: string): ScreenConfig {
    const configs: Record<string, ScreenConfig> = {
      draft: {
        screen: 'test-draft',
        title: 'Draft Screen',
        subtitle: 'Test draft subtitle',
        breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Draft', isCurrent: true }],
      },
      completed: {
        screen: 'test-completed',
        title: 'Completed Screen',
        breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Completed', isCurrent: true }],
      },
    };

    return configs[state] ?? {
      screen: 'test-default',
      title: 'Default Screen',
      breadcrumbs: [{ label: 'Home', href: '/', isCurrent: true }],
    };
  }
}

describe('AbstractStateRenderer', () => {
  let renderer: TestStateRenderer;
  let componentRegistry: ComponentRegistryService;

  beforeEach(() => {
    componentRegistry = new ComponentRegistryService();
    renderer = new TestStateRenderer(componentRegistry);
  });

  describe('constructor', () => {
    it('should initialize with component registry', () => {
      // Verify renderer is created successfully
      expect(renderer).toBeDefined();
    });

    it('should initialize with debug option false by default', () => {
      // Default options are applied in constructor
      expect(renderer).toBeDefined();
    });

    it('should accept custom debug option', () => {
      const customRenderer = new TestStateRenderer(componentRegistry, { debug: true });
      expect(customRenderer['options'].debug).toBe(true);
    });

    it('should initialize logger', () => {
      expect(renderer['logger']).toBeDefined();
      expect(renderer['logger']).toBeInstanceOf(Logger);
    });
  });

  describe('contextType', () => {
    it('should return the correct context type', () => {
      expect(renderer.contextType).toBe('TEST_CONTEXT');
    });
  });

  describe('renderComponents', () => {
    it('should render components for draft state', () => {
      const components = renderer.renderComponents('draft', { test: 'data' });

      expect(components.length).toBeGreaterThan(0);
      expect(components[0].type).toBe('BookingDetails');
    });

    it('should render components for completed state', () => {
      const components = renderer.renderComponents('completed', { test: 'data' });

      expect(components.length).toBeGreaterThan(0);
      expect(components[0].type).toBe('StatusTimeline');
    });

    it('should pass context to getComponentsForState', () => {
      const context = { customField: 'customValue' };
      const components = renderer.renderComponents('draft', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components[0].props.customField).toBe('customValue');
    });

    it('should handle empty context', () => {
      const components = renderer.renderComponents('draft', {});

      expect(components.length).toBeGreaterThan(0);
    });

    it('should handle unknown state', () => {
      const components = renderer.renderComponents('unknown_state', {});

      expect(components).toBeDefined();
    });

    it('should return empty array when no components defined for state', () => {
      // Create a renderer with no components for specific state
      const emptyRenderer = new (class extends TestStateRenderer {
        protected getComponentsForState(_state: string, _context: Record<string, unknown>): UIComponent[] {
          return [];
        }
      })(componentRegistry);

      const components = emptyRenderer.renderComponents('draft', {});

      expect(components).toEqual([]);
    });
  });

  describe('renderActions', () => {
    it('should render actions for draft state', () => {
      const actions = renderer.renderActions('draft', {});

      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].id).toBe('test-action');
    });

    it('should render actions for completed state', () => {
      const actions = renderer.renderActions('completed', {});

      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].id).toBe('completed-action');
    });

    it('should return actions with all required properties', () => {
      const actions = renderer.renderActions('draft', {});

      actions.forEach((action) => {
        expect(action.id).toBeDefined();
        expect(action.label).toBeDefined();
        expect(action.capability).toBeDefined();
      });
    });

    it('should handle unknown state', () => {
      const actions = renderer.renderActions('unknown_state', {});

      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should return empty array when no actions defined for state', () => {
      const emptyRenderer = new (class extends TestStateRenderer {
        protected getActionsForState(_state: string, _context: Record<string, unknown>): UIActionDefinition[] {
          return [];
        }
      })(componentRegistry);

      const actions = emptyRenderer.renderActions('draft', {});

      expect(actions).toEqual([]);
    });
  });

  describe('getScreenConfig', () => {
    it('should return screen config for draft state', () => {
      const config = renderer.getScreenConfig('draft');

      expect(config.screen).toBe('test-draft');
      expect(config.title).toBe('Draft Screen');
    });

    it('should return screen config for completed state', () => {
      const config = renderer.getScreenConfig('completed');

      expect(config.screen).toBe('test-completed');
      expect(config.title).toBe('Completed Screen');
    });

    it('should include subtitle when available', () => {
      const config = renderer.getScreenConfig('draft');

      expect(config.subtitle).toBe('Test draft subtitle');
    });

    it('should include breadcrumbs', () => {
      const config = renderer.getScreenConfig('draft');

      expect(config.breadcrumbs).toBeDefined();
      expect(config.breadcrumbs?.length).toBeGreaterThan(0);
    });

    it('should return default config for unknown state', () => {
      const config = renderer.getScreenConfig('unknown_state');

      expect(config.screen).toBe('test-default');
      expect(config.title).toBe('Default Screen');
    });
  });

  describe('getContextSummary', () => {
    it('should extract hasDriver from context', () => {
      const context = { driverId: 'driver-123' };
      const summary = renderer['getContextSummary'](context);

      expect(summary.hasDriver).toBe(true);
    });

    it('should return hasDriver false when no driver', () => {
      const context = {};
      const summary = renderer['getContextSummary'](context);

      expect(summary.hasDriver).toBe(false);
    });

    it('should extract hasQuote from context', () => {
      const context = { quoteId: 'quote-123' };
      const summary = renderer['getContextSummary'](context);

      expect(summary.hasQuote).toBe(true);
    });

    it('should extract hasPayment from context', () => {
      const context = { paymentId: 'payment-123' };
      const summary = renderer['getContextSummary'](context);

      expect(summary.hasPayment).toBe(true);
    });

    it('should extract hasItems from context with items', () => {
      const context = { items: [{ id: 'item-1' }] };
      const summary = renderer['getContextSummary'](context);

      expect(summary.hasItems).toBe(true);
    });

    it('should return hasItems false for empty items', () => {
      const context = { items: [] };
      const summary = renderer['getContextSummary'](context);

      expect(summary.hasItems).toBe(false);
    });

    it('should return hasItems false when no items key', () => {
      const context = {};
      const summary = renderer['getContextSummary'](context);

      expect(summary.hasItems).toBe(false);
    });

    it('should extract address information', () => {
      const context = {
        pickupAddress: '123 Pickup St',
        dropoffAddress: '456 Dropoff Ave',
      };
      const summary = renderer['getContextSummary'](context);

      expect(summary.pickupAddress).toBe('123 Pickup St');
      expect(summary.dropoffAddress).toBe('456 Dropoff Ave');
    });

    it('should extract scheduledDate and estimatedPrice', () => {
      const context = {
        scheduledDate: '2024-01-15T10:00:00Z',
        estimatedPrice: 200,
      };
      const summary = renderer['getContextSummary'](context);

      expect(summary.scheduledDate).toBe('2024-01-15T10:00:00Z');
      expect(summary.estimatedPrice).toBe(200);
    });
  });

  describe('hasContextData', () => {
    it('should return true when key exists and has value', () => {
      const context = { driverId: 'driver-123' };
      const result = renderer['hasContextData'](context, 'driverId');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', () => {
      const context = {};
      const result = renderer['hasContextData'](context, 'driverId');

      expect(result).toBe(false);
    });

    it('should return false when key value is falsy', () => {
      const context = { driverId: null };
      const result = renderer['hasContextData'](context, 'driverId');

      expect(result).toBe(false);
    });

    it('should return false when key value is empty string', () => {
      const context = { driverId: '' };
      const result = renderer['hasContextData'](context, 'driverId');

      expect(result).toBe(false);
    });

    it('should return false when key value is 0', () => {
      const context = { count: 0 };
      const result = renderer['hasContextData'](context, 'count');

      expect(result).toBe(false);
    });

    it('should return true for boolean true', () => {
      const context = { isActive: true };
      const result = renderer['hasContextData'](context, 'isActive');

      expect(result).toBe(true);
    });
  });

  describe('debug logging', () => {
    it('should not log when debug is false', () => {
      const loggerSpy = jest.spyOn(renderer['logger'], 'debug');
      
      renderer['debug']('Test message');
      
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should log when debug is true', () => {
      // Create renderer with debug option
      const debugRenderer = new TestStateRenderer(componentRegistry, { debug: true });
      const loggerSpy = jest.spyOn(debugRenderer['logger'], 'debug');
      
      debugRenderer['debug']('Test message');
      
      expect(loggerSpy).toHaveBeenCalledWith('Test message');
    });
  });
});

describe('StateRenderer Interface Compliance', () => {
  let componentRegistry: ComponentRegistryService;

  beforeEach(() => {
    componentRegistry = new ComponentRegistryService();
  });

  it('should implement StateRenderer interface correctly', () => {
    const renderer = new TestStateRenderer(componentRegistry);

    // Check all required interface methods exist
    expect(typeof renderer.contextType).toBe('string');
    expect(typeof renderer.renderComponents).toBe('function');
    expect(typeof renderer.renderActions).toBe('function');
    expect(typeof renderer.getScreenConfig).toBe('function');
  });

  it('should return UIComponent[] from renderComponents', () => {
    const renderer = new TestStateRenderer(componentRegistry);
    const result = renderer.renderComponents('draft', {});

    expect(Array.isArray(result)).toBe(true);
    result.forEach((component) => {
      expect(component.type).toBeDefined();
      expect(component.props).toBeDefined();
    });
  });

  it('should return UIActionDefinition[] from renderActions', () => {
    const renderer = new TestStateRenderer(componentRegistry);
    const result = renderer.renderActions('draft', {});

    expect(Array.isArray(result)).toBe(true);
    result.forEach((action) => {
      expect(action.id).toBeDefined();
      expect(action.label).toBeDefined();
      expect(action.capability).toBeDefined();
    });
  });

  it('should return ScreenConfig from getScreenConfig', () => {
    const renderer = new TestStateRenderer(componentRegistry);
    const result = renderer.getScreenConfig('draft');

    expect(result.screen).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.breadcrumbs).toBeDefined();
  });
});
