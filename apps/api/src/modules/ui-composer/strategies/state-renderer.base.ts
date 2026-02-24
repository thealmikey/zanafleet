import { Logger } from '@nestjs/common';

import {
  StateRenderer,
  UIComponent,
  UIActionDefinition,
  ScreenConfig,
} from '../interfaces/ui-composer.interfaces';
import { ComponentRegistryService } from '../services/component-registry.service';

/**
 * StateRendererOptions
 *
 * Configuration options for the base renderer.
 */
export interface StateRendererOptions {
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * AbstractStateRenderer
 *
 * Base class for state-specific UI rendering.
 * Implements the Strategy pattern for different context types.
 *
 * Architecture Boundaries:
 * - This class ONLY renders UI based on state
 * - It does NOT enforce business rules
 * - It does NOT validate transitions
 * - It does NOT check capabilities (done in UIComposer service)
 * - It is purely declarative
 */
export abstract class AbstractStateRenderer implements StateRenderer {
  protected readonly logger: Logger;
  protected readonly componentRegistry: ComponentRegistryService;
  protected readonly options: StateRendererOptions;

  constructor(componentRegistry: ComponentRegistryService, options?: StateRendererOptions) {
    this.componentRegistry = componentRegistry;
    this.options = { debug: false, ...options };
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Get the context type this renderer handles
   * Must be implemented by subclasses
   */
  abstract readonly contextType: string;

  /**
   * Render UI components for the given state
   *
   * @param state - Current process state
   * @param context - Process context data
   * @returns Array of UI components
   */
  renderComponents(state: string, context: Record<string, unknown>): UIComponent[] {
    this.debug(`Rendering components for state: ${state}`);

    const components = this.getComponentsForState(state, context);
    this.debug(`Generated ${components.length} components`);

    return components;
  }

  /**
   * Get available actions for the given state
   *
   * @param state - Current process state
   * @param context - Process context data
   * @returns Array of action definitions
   */
  renderActions(state: string, context: Record<string, unknown>): UIActionDefinition[] {
    this.debug(`Rendering actions for state: ${state}`);

    const actions = this.getActionsForState(state, context);
    this.debug(`Generated ${actions.length} actions`);

    return actions;
  }

  /**
   * Get screen configuration for the context type
   *
   * @param state - Current process state
   * @returns Screen configuration
   */
  getScreenConfig(state: string): ScreenConfig {
    return this.getScreenConfiguration(state);
  }

  /**
   * Get process context summary
   *
   * @param context - Process context
   * @returns Summary object
   */
  protected getContextSummary(context: Record<string, unknown>): Record<string, unknown> {
    return {
      hasDriver: !!context.driverId,
      hasQuote: !!context.quoteId,
      hasPayment: !!context.paymentId,
      hasItems: Array.isArray(context.items) && context.items.length > 0,
      pickupAddress: context.pickupAddress,
      dropoffAddress: context.dropoffAddress,
      scheduledDate: context.scheduledDate,
      estimatedPrice: context.estimatedPrice,
    };
  }

  /**
   * Check if context has specific data
   *
   * @param context - Process context
   * @param key - Key to check
   * @returns True if key exists and is truthy
   */
  protected hasContextData(context: Record<string, unknown>, key: string): boolean {
    return !!context[key];
  }

  /**
   * Debug logging helper
   */
  protected debug(message: string): void {
    if (this.options.debug) {
      this.logger.debug(message);
    }
  }

  // ---------------------------------------------------------------------------
  // Abstract Methods - Must be implemented by subclasses
  // ---------------------------------------------------------------------------

  /**
   * Get components for a specific state
   * Must be implemented by subclasses
   *
   * @param state - Current process state
   * @param context - Process context data
   * @returns Array of UI components
   */
  protected abstract getComponentsForState(
    state: string,
    context: Record<string, unknown>
  ): UIComponent[];

  /**
   * Get actions for a specific state
   * Must be implemented by subclasses
   *
   * @param state - Current process state
   * @param context - Process context data
   * @returns Array of action definitions
   */
  protected abstract getActionsForState(
    state: string,
    context: Record<string, unknown>
  ): UIActionDefinition[];

  /**
   * Get screen configuration
   * Must be implemented by subclasses
   *
   * @param state - Current process state
   * @returns Screen configuration
   */
  protected abstract getScreenConfiguration(state: string): ScreenConfig;
}
