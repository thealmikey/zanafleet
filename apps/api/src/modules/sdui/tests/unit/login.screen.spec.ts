/**
 * Login Screen Strategy Tests
 *
 * Unit tests for the Login screen schema generation.
 */

import { LoginScreenStrategy } from '../../strategies/login.screen';
import { SDUIService } from '../../services/sdui.service';
import { UISchema } from '../../interfaces';

describe('LoginScreenStrategy', () => {
  let strategy: LoginScreenStrategy;
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

    strategy = new LoginScreenStrategy(mockSduiService);
  });

  describe('render', () => {
    it('should render login screen schema', async () => {
      const request = { screenId: 'login' };
      const schema = await strategy.render(request);

      expect(schema.screenId).toBe('login');
      expect(schema.version).toBe('1.0.0');
      expect(schema.metadata.title).toBe('Sign In');
      expect(schema.metadata.type).toBe('login');
      expect(schema.metadata.auth).toBe('none');
    });

    it('should include data sources', async () => {
      const request = { screenId: 'login' };
      const schema = await strategy.render(request);

      expect(schema.data).toBeDefined();
      expect(schema.data?.length).toBeGreaterThan(0);
      
      const configSource = schema.data?.find(d => d.id === 'config');
      expect(configSource).toBeDefined();
      expect(configSource?.type).toBe('static');
      expect(configSource?.staticData).toHaveProperty('demoCredentials');
    });

    it('should include login form layout', async () => {
      const request = { screenId: 'login' };
      const schema = await strategy.render(request);

      expect(schema.layout).toBeDefined();
      expect(schema.layout.type).toBe('flex');
      expect(schema.layout.children).toBeDefined();
    });

    it('should include form components', async () => {
      const request = { screenId: 'login' };
      const schema = await strategy.render(request);

      // Check layout has components (form fields)
      const hasFormComponents = schema.layout.children?.some(child => 
        child.components?.some(c => c.component === 'TextField')
      );
      expect(hasFormComponents).toBe(true);
    });

    it('should include validation rules', async () => {
      const request = { screenId: 'login' };
      const schema = await strategy.render(request);

      expect(schema.validations).toBeDefined();
      expect(schema.validations?.length).toBeGreaterThan(0);
      
      // Check email validation
      const emailRequired = schema.validations?.find(v => v.field === 'email' && v.type === 'required');
      expect(emailRequired).toBeDefined();
      
      const emailFormat = schema.validations?.find(v => v.field === 'email' && v.type === 'email');
      expect(emailFormat).toBeDefined();
    });

    it('should include submit action', async () => {
      const request = { screenId: 'login' };
      const schema = await strategy.render(request);

      expect(schema.actions).toBeDefined();
      
      const submitAction = schema.actions.find(a => a.id === 'submit');
      expect(submitAction).toBeDefined();
      expect(submitAction?.type).toBe('submit');
      expect(submitAction?.endpoint).toBe('/api/auth/login');
    });

    it('should include navigation actions', async () => {
      const request = { screenId: 'login' };
      const schema = await strategy.render(request);

      const forgotPasswordAction = schema.actions.find(a => a.id === 'forgot-password');
      expect(forgotPasswordAction).toBeDefined();
      expect(forgotPasswordAction?.type).toBe('navigate');

      const signupAction = schema.actions.find(a => a.id === 'signup');
      expect(signupAction).toBeDefined();
      expect(signupAction?.type).toBe('navigate');
    });
  });

  describe('executeAction', () => {
    it('should reject empty credentials', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: {},
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('required');
    });

    it('should reject short passwords', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: { email: 'test@test.com', password: '123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(false);
    });

    it('should accept valid credentials', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: { email: 'test@test.com', password: 'password123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('actorId');
    });

    it('should map admin email to admin role', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: { email: 'admin@zanafleet.test', password: 'password123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('role', 'admin');
    });

    it('should map dispatcher email to dispatcher role', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: { email: 'dispatcher@zanafleet.test', password: 'password123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('role', 'dispatcher');
    });

    it('should map driver email to driver role', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: { email: 'driver@zanafleet.test', password: 'password123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('role', 'driver');
    });

    it('should return navigateTo on success', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: { email: 'test@test.com', password: 'password123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.navigateTo).toBe('/dashboard');
    });

    it('should return toast on success', async () => {
      const request = {
        screenId: 'login',
        actionId: 'submit',
        actorId: 'test',
        payload: { email: 'test@test.com', password: 'password123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.toast).toBeDefined();
      expect(response.toast?.type).toBe('success');
    });

    it('should return error for unknown action', async () => {
      const request = {
        screenId: 'login',
        actionId: 'unknown-action',
        actorId: 'test',
        payload: { email: 'test@test.com', password: 'password123' },
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown action');
    });
  });
});
