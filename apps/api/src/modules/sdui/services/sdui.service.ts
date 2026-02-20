/**
 * SDUI Service
 *
 * Core service for Server-Driven UI screen management.
 * Handles schema retrieval, action execution, and data binding.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CapabilityAccessController } from '../../capability/services/capability-access.controller';
import {
  UISchema,
  SDUIRequest,
  SDUIActionRequest,
  SDUIActionResponse,
  DataSource,
  ActionDefinition,
  NavigationConfig,
} from '../interfaces';

/**
 * Screen Renderer Interface
 *
 * Interface for screen-specific schema rendering.
 */
export interface ScreenRenderer {
  /**
   * Get screen schema
   */
  render(request: SDUIRequest): Promise<UISchema>;

  /**
   * Execute an action
   */
  executeAction(request: SDUIActionRequest): Promise<SDUIActionResponse>;
}

/**
 * SDUI Service
 *
 * Main service for server-driven UI operations.
 */
@Injectable()
export class SDUIService {
  private readonly logger = new Logger(SDUIService.name);
  private readonly renderers: Map<string, ScreenRenderer> = new Map();

  constructor(
    private readonly capabilityAccessController: CapabilityAccessController
  ) {
    this.logger.log('SDUIService initialized');
  }

  /**
   * Register a screen renderer
   *
   * @param screenId - Screen identifier
   * @param renderer - Screen renderer implementation
   */
  registerRenderer(screenId: string, renderer: ScreenRenderer): void {
    this.renderers.set(screenId, renderer);
    this.logger.debug(`Registered renderer for screen: ${screenId}`);
  }

  /**
   * Get screen schema
   *
   * @param request - SDUI request
   * @returns UI schema for the screen
   */
  async getScreen(request: SDUIRequest): Promise<UISchema> {
    this.logger.debug(`Getting screen: ${request.screenId}`);

    const renderer = this.renderers.get(request.screenId);
    if (!renderer) {
      // Try to find a wildcard renderer
      const wildcardRenderer = this.findWildcardRenderer(request.screenId);
      if (wildcardRenderer) {
        return wildcardRenderer.render(request);
      }

      throw new NotFoundException(`Screen not found: ${request.screenId}`);
    }

    return renderer.render(request);
  }

  /**
   * Execute an action on a screen
   *
   * @param request - Action request
   * @returns Action response
   */
  async executeAction(request: SDUIActionRequest): Promise<SDUIActionResponse> {
    this.logger.debug(
      `Executing action ${request.actionId} on screen ${request.screenId}`
    );

    const renderer = this.renderers.get(request.screenId);
    if (!renderer) {
      throw new NotFoundException(`Screen not found: ${request.screenId}`);
    }

    // Check capability if required
    const action = await this.findAction(request.screenId, request.actionId);
    if (action?.capability) {
      const hasCapability = await this.checkCapability(
        request.actorId,
        action.capability
      );
      if (!hasCapability) {
        return {
          success: false,
          error: `You don't have the required capability: ${action.capability}`,
          errorCode: 'CAPABILITY_DENIED',
        };
      }
    }

    return renderer.executeAction(request);
  }

  /**
   * Get navigation configuration for a role
   *
   * @param actorId - Actor ID
   * @returns Navigation configuration
   */
  async getNavigation(actorId: string): Promise<NavigationConfig> {
    // Get actor's roles/capabilities to determine navigation
    const capabilities = await this.capabilityAccessController.getCapabilitiesForActor(actorId);

    // Build navigation based on capabilities
    const items: NavigationConfig['items'] = [];

    // Dashboard (available to all authenticated users)
    items.push({
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      path: '/dashboard',
    });

    // Add items based on capabilities
    if (capabilities?.includes('move:booking:view') || capabilities?.includes('analytics:report:view')) {
      items.push({
        id: 'bookings',
        label: 'Bookings',
        icon: 'local_shipping',
        path: '/bookings',
      });
    }

    if (capabilities?.includes('move:driver:view') || capabilities?.includes('move:driver:assign')) {
      items.push({
        id: 'drivers',
        label: 'Drivers',
        icon: 'people',
        path: '/drivers',
      });
    }

    if (capabilities?.includes('admin:*') || capabilities?.includes('analytics:report:view')) {
      items.push({
        id: 'analytics',
        label: 'Analytics',
        icon: 'analytics',
        path: '/analytics',
      });
    }

    // Settings (available to all)
    items.push({
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      path: '/settings',
    });

    return {
      items,
      userMenu: [
        {
          id: 'profile',
          label: 'Profile',
          icon: 'person',
          path: '/profile',
        },
        {
          id: 'logout',
          label: 'Logout',
          icon: 'logout',
          path: '/logout',
        },
      ],
    };
  }

  /**
   * Get list of available screens
   *
   * @returns List of screen IDs
   */
  getAvailableScreens(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * Check if a screen exists
   *
   * @param screenId - Screen identifier
   * @returns True if screen exists
   */
  hasScreen(screenId: string): boolean {
    return this.renderers.has(screenId) || this.findWildcardRenderer(screenId) !== null;
  }

  /**
   * Find a wildcard renderer for a screen ID
   *
   * @param screenId - Screen identifier
   * @returns Wildcard renderer or null
   */
  private findWildcardRenderer(screenId: string): ScreenRenderer | null {
    for (const [pattern, renderer] of this.renderers.entries()) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(screenId)) {
          return renderer;
        }
      }
    }
    return null;
  }

  /**
   * Find an action definition
   *
   * @param screenId - Screen identifier
   * @param actionId - Action identifier
   * @returns Action definition or null
   */
  private async findAction(
    screenId: string,
    actionId: string
  ): Promise<ActionDefinition | null> {
    const renderer = this.renderers.get(screenId);
    if (!renderer) {
      return null;
    }

    try {
      const schema = await renderer.render({
        screenId,
        preview: true,
      });

      return schema.actions.find((a) => a.id === actionId) || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if actor has a capability
   *
   * @param actorId - Actor ID
   * @param capability - Capability name
   * @returns True if actor has capability
   */
  private async checkCapability(
    actorId: string,
    capability: string
  ): Promise<boolean> {
    if (!actorId) {
      return false;
    }

    const capabilities = await this.capabilityAccessController.getCapabilitiesForActor(actorId);
    return capabilities?.includes(capability) || false;
  }
}
