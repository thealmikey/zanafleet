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
      expect(schema.metadata.title).toBe('ZanaFleet Movers');
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
      expect(configSource?.staticData).toHaveProperty('ctaText', 'Get a Free Quote');
      expect(configSource?.staticData).toHaveProperty('phoneNumber');
      expect(configSource?.staticData).toHaveProperty('email');
    });

    it('should include layout with hero section', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.layout).toBeDefined();
      expect(schema.layout.type).toBe('flex');
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
      expect(heroSection?.components).toBeDefined();
      
      // Check for Typography component with company name
      const hasCompanyName = heroSection?.components?.some(
        c => c.component === 'Typography' && (c.props?.content as string) === '{{config.companyName}}'
      );
      expect(hasCompanyName).toBe(true);
    });

    it('should include services section', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      // Find services section (second child)
      const servicesSection = schema.layout.children?.[1];
      expect(servicesSection).toBeDefined();
      expect(servicesSection?.components).toBeDefined();
      
      // Check for services title
      const hasServicesTitle = servicesSection?.components?.some(
        c => c.component === 'Typography' && (c.props?.content as string) === 'Our Services'
      );
      expect(hasServicesTitle).toBe(true);

      // Check for service cards
      const hasServiceCards = servicesSection?.components?.some(
        c => c.component === 'Card' && c.props?.title
      );
      expect(hasServiceCards).toBe(true);
    });

    it('should include CTA section with contact info', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      // Find CTA section (third child)
      const ctaSection = schema.layout.children?.[2];
      expect(ctaSection).toBeDefined();
      expect(ctaSection?.components).toBeDefined();
      
      // Check for CTA title
      const hasCtaTitle = ctaSection?.components?.some(
        c => c.component === 'Typography' && (c.props?.content as string) === 'Ready to Move?'
      );
      expect(hasCtaTitle).toBe(true);

      // Check for phone number
      const phoneContent = ctaSection?.components?.find(
        c => c.component === 'Typography' && (c.props?.content as string)?.startsWith('Phone:')
      );
      expect(phoneContent).toBeDefined();

      // Check for email
      const emailContent = ctaSection?.components?.find(
        c => c.component === 'Typography' && (c.props?.content as string)?.startsWith('Email:')
      );
      expect(emailContent).toBeDefined();
    });

    it('should include navigation action to quote form', async () => {
      const request = { screenId: 'movers-home' };
      const schema = await strategy.render(request);

      expect(schema.actions).toBeDefined();
      expect(schema.actions?.length).toBeGreaterThan(0);
      
      const quoteAction = schema.actions.find(a => a.id === 'open-quote-form');
      expect(quoteAction).toBeDefined();
      expect(quoteAction?.type).toBe('navigate');
      expect(quoteAction?.label).toBe('Get Quote');
      expect(quoteAction?.navigateTo).toBe('quote');
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
    it('should handle open-quote-form action', async () => {
      const request = {
        screenId: 'movers-home',
        actionId: 'open-quote-form',
        payload: {},
        actorId: 'anonymous',
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.navigateTo).toBe('quote');
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