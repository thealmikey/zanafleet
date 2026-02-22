/**
 * Movers Homepage Screen Strategy Tests
 *
 * Unit tests for the Movers homepage screen schema generation.
 */

import { MoversHomeScreenStrategy } from '../../strategies/movers-home.screen';
import { SDUIService } from '../../services/sdui.service';
import { UISchema } from '../../interfaces';

describe('MoversHomeScreenStrategy', () => {
  let strategy: MoversHomeScreenStrategy;
  let mockSduiService: jest.Mocked<SDUIService>;

  beforeEach(() => {
    mockSduiService = {
      getNavigation: jest.fn(),
      getScreen: jest.fn(),
      executeAction: jest.fn(),
      registerRenderer: jest.fn(),
      getAvailableScreens: jest.fn(),
      hasScreen: jest.fn(),
    } as unknown as jest.Mocked<SDUIService>;

    strategy = new MoversHomeScreenStrategy(mockSduiService);
  });

  describe('render', () => {
    it('should render movers-home screen schema', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.screenId).toBe('movers-home');
      expect(schema.version).toBe('1.0.0');
      expect(schema.metadata.title).toBe('Find Reliable Movers');
      expect(schema.metadata.type).toBe('movers-home');
      expect(schema.metadata.auth).toBe('none');
    });

    it('should include data sources with company config', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.data).toBeDefined();
      expect(schema.data?.length).toBeGreaterThan(0);
      
      const configSource = schema.data?.find(d => d.id === 'config');
      expect(configSource).toBeDefined();
      expect(configSource?.type).toBe('static');
      expect(configSource?.staticData).toHaveProperty('companyName', 'ZanaFleet Movers');
      expect(configSource?.staticData).toHaveProperty('tagline', 'Reliable Moving Services');
      expect(configSource?.staticData).toHaveProperty('ctaText', 'Find Movers');
      expect(configSource?.staticData).toHaveProperty('phoneNumber');
      expect(configSource?.staticData).toHaveProperty('email');
    });

    it('should include layout with hero section', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.layout).toBeDefined();
      expect(schema.layout.type).toBe('root');
      expect(schema.layout.children).toBeDefined();
      expect(schema.layout.children?.length).toBeGreaterThan(0);
    });

    it('should include hero section with company name', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      // Find the hero section (first child)
      const heroSection = schema.layout.children?.[0];
      expect(heroSection).toBeDefined();
      expect(heroSection?.type).toBe('flex');
      expect(heroSection?.props).toBeDefined();
      expect(heroSection?.props?.background).toContain('linear-gradient');
    });

    it('should include booking form with location inputs', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      const hero = schema.layout.children?.[0];
      expect(hero).toBeDefined();
      const heroComponents = hero?.children?.[0]?.components || hero?.components || [];
      const hasForm = heroComponents.some((c) => c.component === 'Form' && c.id === 'booking-form');
      expect(hasForm).toBe(true);
    });

    it('should include submit action for quote request', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.actions).toBeDefined();
      expect(schema.actions?.length).toBeGreaterThan(0);
      
      const quoteAction = schema.actions.find(a => a.id === 'submit-quote-request');
      expect(quoteAction).toBeDefined();
      expect(quoteAction?.type).toBe('submit');
    });

    it('should include login navigation action', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      const loginAction = schema.actions.find(a => a.id === 'navigate-to-login');
      expect(loginAction).toBeDefined();
      expect(loginAction?.type).toBe('navigate');
      expect(loginAction?.label).toBe('Login');
      expect(loginAction?.navigateTo).toBe('login');
    });

    it('should have correct cache duration', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.metadata.cacheDuration).toBe(300);
    });

    it('should not require authentication', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.metadata.auth).toBe('none');
    });
  });

  describe('executeAction', () => {
    it('should handle submit-quote-request action', async () => {
      const request = {
        screenId: 'movers-home',
        actionId: 'submit-quote-request',
        payload: {},
        actorId: 'anonymous',
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should return error for unknown action', async () => {
      const request = {
        screenId: 'movers-home',
        actionId: 'unknown-action',
        payload: {},
        actorId: 'anonymous',
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown action');
    });
  });
});
