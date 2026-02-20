/**
 * Login Screen Strategy
 *
 * Schema definition for the login screen.
 */

import { ScreenRenderer, SDUIService } from '../services/sdui.service';
import {
  UISchema,
  SDUIRequest,
  SDUIActionRequest,
  SDUIActionResponse,
  ScreenMetadata,
  ScreenType,
  AuthRequirement,
  LayoutNode,
  LayoutType,
  ComponentRef,
  DataSource,
  ActionDefinition,
  ActionType,
  ValidationRule,
  ValidationType,
} from '../interfaces';

/**
 * Login Screen Schema
 *
 * Server-driven UI schema for authentication.
 */
export class LoginScreenStrategy implements ScreenRenderer {
  private readonly sduiService: SDUIService;

  constructor(sduiService: SDUIService) {
    this.sduiService = sduiService;
  }

  /**
   * Render the login screen schema
   */
  async render(request: SDUIRequest): Promise<UISchema> {
    const metadata: ScreenMetadata = {
      title: 'Sign In',
      description: 'Sign in to your ZanaFleet account',
      type: 'login' as ScreenType,
      auth: 'none' as AuthRequirement,
      cacheDuration: 0,
      offlineCapable: false,
    };

    const dataSources: DataSource[] = [
      {
        id: 'config',
        type: 'static',
        endpoint: '/api/sdui/screens/login/config',
        staticData: {
          logoUrl: '/assets/logo.png',
          forgotPasswordUrl: '/forgot-password',
          signupUrl: '/signup',
          demoCredentials: {
            admin: 'admin@zanafleet.test',
            dispatcher: 'dispatcher@zanafleet.test',
            driver: 'driver@zanafleet.test',
          },
        },
        cacheable: true,
        cacheDuration: 3600,
      },
    ];

    const layout: LayoutNode = {
      type: 'flex' as LayoutType,
      props: {
        direction: 'column',
        align: 'center',
        justify: 'center',
        fullHeight: true,
        spacing: 4,
      },
      children: [
        {
          type: 'stack' as LayoutType,
          props: {
            spacing: 3,
            maxWidth: 400,
            padding: 4,
          },
          components: [
            {
              component: 'Logo',
              props: {
                src: '{{config.logoUrl}}',
                alt: 'ZanaFleet',
                height: 60,
              },
            },
            {
              component: 'Typography',
              props: {
                variant: 'h4',
                align: 'center',
                content: 'Welcome Back',
              },
            },
            {
              component: 'Typography',
              props: {
                variant: 'body2',
                align: 'center',
                color: 'textSecondary',
                content: 'Sign in to continue to your dashboard',
              },
            },
            {
              component: 'Form',
              id: 'login-form',
              props: {
                method: 'POST',
                action: '/api/sdui/screens/login/actions/submit',
              },
              bindings: {
                email: { source: 'form', path: 'email' },
                password: { source: 'form', path: 'password' },
              },
            },
            {
              component: 'TextField',
              props: {
                name: 'email',
                label: 'Email Address',
                type: 'email',
                fullWidth: true,
                required: true,
                autoComplete: 'email',
                startAdornment: 'email',
              },
            },
            {
              component: 'TextField',
              props: {
                name: 'password',
                label: 'Password',
                type: 'password',
                fullWidth: true,
                required: true,
                autoComplete: 'current-password',
                startAdornment: 'lock',
              },
            },
            {
              component: 'Button',
              id: 'submit-login',
              props: {
                type: 'submit',
                variant: 'contained',
                color: 'primary',
                fullWidth: true,
                size: 'large',
                content: 'Sign In',
              },
              layout: {
                order: 100,
              },
            },
            {
              component: 'Link',
              props: {
                href: '{{config.forgotPasswordUrl}}',
                content: 'Forgot Password?',
                align: 'center',
              },
            },
            {
              component: 'Divider',
              props: {
                text: 'OR',
              },
            },
            {
              component: 'Link',
              props: {
                href: '{{config.signupUrl}}',
                content: "Don't have an account? Sign up",
                align: 'center',
              },
            },
          ],
        },
        {
          type: 'stack' as LayoutType,
          props: {
            spacing: 2,
            maxWidth: 400,
          },
          components: [
            {
              component: 'Alert',
              props: {
                severity: 'info',
                content: 'Demo Credentials:',
              },
            },
            {
              component: 'Typography',
              props: {
                variant: 'caption',
                content: 'Admin: admin@zanafleet.test',
              },
            },
            {
              component: 'Typography',
              props: {
                variant: 'caption',
                content: 'Dispatcher: dispatcher@zanafleet.test',
              },
            },
            {
              component: 'Typography',
              props: {
                variant: 'caption',
                content: 'Driver: driver@zanafleet.test',
              },
            },
          ],
        },
      ],
    };

    const actions: ActionDefinition[] = [
      {
        id: 'submit',
        label: 'Sign In',
        type: 'submit' as ActionType,
        endpoint: '/api/auth/login',
        method: 'POST',
        requiresConfirmation: false,
        onSuccess: {
          type: 'navigate',
          target: '/dashboard',
        },
        onError: {
          type: 'toast',
          message: 'Invalid email or password',
          toastType: 'error',
        },
      },
      {
        id: 'forgot-password',
        label: 'Forgot Password',
        type: 'navigate' as ActionType,
        navigateTo: '/forgot-password',
      },
      {
        id: 'signup',
        label: 'Sign Up',
        type: 'navigate' as ActionType,
        navigateTo: '/signup',
      },
    ];

    const validations: ValidationRule[] = [
      {
        field: 'email',
        type: 'required' as ValidationType,
        message: 'Email is required',
      },
      {
        field: 'email',
        type: 'email' as ValidationType,
        message: 'Please enter a valid email address',
      },
      {
        field: 'password',
        type: 'required' as ValidationType,
        message: 'Password is required',
      },
      {
        field: 'password',
        type: 'minLength' as ValidationType,
        params: { min: 6 },
        message: 'Password must be at least 6 characters',
      },
    ];

    return {
      version: '1.0.0',
      screenId: 'login',
      metadata,
      data: dataSources,
      layout,
      actions,
      validations,
    };
  }

  /**
   * Execute login action
   */
  async executeAction(request: SDUIActionRequest): Promise<SDUIActionResponse> {
    const { actionId, payload } = request;

    // Handle unknown actions
    if (actionId !== 'submit') {
      return {
        success: false,
        error: `Unknown action: ${actionId}`,
        errorCode: 'UNKNOWN_ACTION',
      };
    }

    // Validate credentials (in real app, call auth service)
    const email = payload?.email as string;
    const password = payload?.password as string;

    // Demo validation - in production, call auth service
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Demo: accept any password with 6+ chars
    if (password.length < 6) {
      return {
        success: false,
        error: 'Invalid email or password',
        errorCode: 'AUTH_FAILED',
      };
    }

    // Determine user role based on email
    let role = 'user';
    let actorId = 'actor-001';

    if (email.includes('admin')) {
      role = 'admin';
      actorId = 'actor-admin-001';
    } else if (email.includes('dispatcher')) {
      role = 'dispatcher';
      actorId = 'actor-dispatcher-001';
    } else if (email.includes('driver')) {
      role = 'driver';
      actorId = 'actor-driver-001';
    }

    // Return success with token and redirect
    return {
      success: true,
      data: {
        token: 'demo-jwt-token-' + Date.now(),
        actorId,
        role,
        expiresIn: 3600,
      },
      navigateTo: '/dashboard',
      toast: {
        message: 'Welcome back!',
        type: 'success',
      },
    };
  }
}
