import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CapabilityAccessController } from '../../capability/services/capability-access.controller';
import { WorkflowEngineService } from '../../workflow/services/workflow-engine.service';
import { AbstractStateRenderer } from '../strategies/state-renderer.base';
import {
  UIComposeRequest,
  UIResponse,
  UIAction,
  ActorCapabilities,
  ProcessContext,
} from '../interfaces/ui-composer.interfaces';

/**
 * UIComposerService
 *
 * Main service that composes UI responses based on:
 * - Process state from WorkflowEngine
 * - Actor capabilities from CapabilityAccessController
 * - Component definitions from ComponentRegistry
 *
 * Architecture Boundaries (STRICTLY ENFORCED):
 * - UIComposer must NOT mutate state
 * - UIComposer must NOT execute commands
 * - UIComposer must NOT duplicate business rules
 * - UIComposer must NOT enforce capability (only READ allowed capabilities)
 * - UIComposer must NOT enforce consent (only MARK if required)
 * - UIComposer is purely declarative
 *
 * Flow:
 * 1. Receive UIComposeRequest with actorId, contextType, contextId
 * 2. Get process instance from WorkflowEngine
 * 3. Get actor capabilities from CapabilityAccessController
 * 4. Use StateRenderer to get components and actions for current state
 * 5. Filter actions by capability (disable if actor lacks capability)
 * 6. Mark actions with requiresConsent if capability.requiresConsent is true
 * 7. Return composed UIResponse
 */
@Injectable()
export class UIComposerService {
  private readonly logger = new Logger(UIComposerService.name);
  private readonly renderers: Map<string, AbstractStateRenderer> = new Map();

  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly capabilityAccessController: CapabilityAccessController
  ) {
    this.logger.log('UIComposerService initialized');
  }

  /**
   * Register a state renderer for a context type
   *
   * @param renderer - State renderer to register
   */
  registerRenderer(renderer: AbstractStateRenderer): void {
    this.renderers.set(renderer.contextType, renderer);
    this.logger.debug(`Registered renderer for context type: ${renderer.contextType}`);
  }

  /**
   * Compose a UI response for the given request
   *
   * @param request - UI composition request
   * @returns Composed UI response
   */
  async compose(request: UIComposeRequest): Promise<UIResponse> {
    this.logger.debug(
      `Composing UI for actor=${request.actorId}, contextType=${request.contextType}, contextId=${request.contextId}`
    );

    // Step 1: Get the process context from WorkflowEngine
    const processContext = await this.getProcessContext(request);

    // Step 2: Get actor capabilities
    const actorCapabilities = await this.getActorCapabilities(request.actorId);

    // Step 3: Get the appropriate renderer
    const renderer = this.getRenderer(request.contextType);

    // Step 4: Get screen configuration
    const screenConfig = renderer.getScreenConfig(processContext.currentState);

    // Step 5: Render components for the current state
    const components = renderer.renderComponents(
      processContext.currentState,
      processContext.context
    );

    // Step 6: Get action definitions and filter by capability
    const actionDefinitions = renderer.renderActions(
      processContext.currentState,
      processContext.context
    );

    const actions = this.filterActionsByCapability(actionDefinitions, actorCapabilities);

    // Step 7: Build the response
    const response: UIResponse = {
      screen: screenConfig.screen,
      metadata: {
        title: screenConfig.title,
        subtitle: screenConfig.subtitle,
        breadcrumbs: screenConfig.breadcrumbs,
        contextId: processContext.instanceId,
        definitionId: processContext.definitionId,
        currentState: processContext.currentState,
        status: processContext.status,
      },
      components,
      actions,
    };

    this.logger.debug(
      `Composed UI: screen=${response.screen}, components=${components.length}, actions=${actions.length}`
    );

    return response;
  }

  /**
   * Get process context from WorkflowEngine
   *
   * @param request - UI composition request
   * @returns Process context
   */
  private async getProcessContext(request: UIComposeRequest): Promise<ProcessContext> {
    try {
      const instance = await this.workflowEngine.getProcessState(request.contextId);

      return {
        instanceId: instance.instanceId,
        definitionId: instance.definitionId,
        currentState: instance.currentState,
        context: instance.context ?? {},
        relatedEntities: instance.relatedEntities as Array<{
          entityType: string;
          entityId: string;
          role: string;
          linkedAt: Date;
        }> ?? [],
        status: instance.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get process context for contextId=${request.contextId}: ${(error as Error).message}`
      );
      throw new NotFoundException(
        `Process instance not found: ${request.contextId}`
      );
    }
  }

  /**
   * Get actor capabilities from CapabilityAccessController
   *
   * @param actorId - Actor ID
   * @returns Actor capabilities with metadata
   */
  private async getActorCapabilities(actorId: string): Promise<ActorCapabilities> {
    // Get all capability names for the actor
    const capabilities = await this.capabilityAccessController.getCapabilitiesForActor(actorId);

    // Handle null/undefined capabilities response
    if (!capabilities) {
      return {
        capabilities: [],
        capabilityMetadata: new Map(),
      };
    }

    // Get metadata for each capability (requiresConsent)
    const capabilityMetadata = new Map<string, { name: string; requiresConsent: boolean }>();

    // Check each capability for requiresConsent metadata
    // Note: This is a simplified version - in production, you'd get full metadata
    for (const capability of capabilities) {
      // Default to false, actual implementation would query capability metadata
      capabilityMetadata.set(capability, {
        name: capability,
        requiresConsent: this.determineRequiresConsent(capability),
      });
    }

    return {
      capabilities,
      capabilityMetadata,
    };
  }

  /**
   * Determine if a capability requires consent
   * This is a simplified version - in production, this would come from capability metadata
   *
   * @param capability - Capability name
   * @returns Whether consent is required
   */
  private determineRequiresConsent(capability: string): boolean {
    // Capabilities that require consent (simplified - should come from DB)
    const consentRequiredCapabilities = [
      'move:booking:cancel',
      'move:driver:contact',
      'move:payment:add',
      'move:quote:request',
    ];

    return consentRequiredCapabilities.includes(capability);
  }

  /**
   * Get the renderer for a context type
   *
   * @param contextType - Context type
   * @returns State renderer
   */
  private getRenderer(contextType: string): AbstractStateRenderer {
    const renderer = this.renderers.get(contextType);

    if (!renderer) {
      this.logger.warn(`No renderer found for context type: ${contextType}, using default`);
      // Return a default renderer or throw
      throw new NotFoundException(`No renderer found for context type: ${contextType}`);
    }

    return renderer;
  }

  /**
   * Filter actions by actor capabilities
   *
   * @param actionDefinitions - Raw action definitions
   * @param actorCapabilities - Actor's capabilities
   * @returns Filtered actions with disabled status
   */
  private filterActionsByCapability(
    actionDefinitions: Array<{
      id: string;
      label: string;
      capability: string;
      requiresConsent?: boolean;
      requiresConfirmation?: boolean;
      confirmationMessage?: string;
      style?: 'primary' | 'secondary' | 'danger' | 'ghost';
      availableInStates?: string[];
      notAvailableInStates?: string[];
      metadata?: Record<string, unknown>;
    }>,
    actorCapabilities: ActorCapabilities
  ): UIAction[] {
    return actionDefinitions.map((definition) => {
      const hasCapability = actorCapabilities.capabilities.includes(definition.capability);
      const capabilityMetadata = actorCapabilities.capabilityMetadata.get(definition.capability);

      // Check requiresConsent from multiple sources:
      // 1. Capability metadata (if actor has the capability)
      // 2. Action definition
      // 3. Inherent consent requirement based on capability name
      const inherentRequiresConsent = this.determineRequiresConsent(definition.capability);
      const requiresConsent = capabilityMetadata?.requiresConsent ?? definition.requiresConsent ?? inherentRequiresConsent;

      return {
        id: definition.id,
        label: definition.label,
        capability: definition.capability,
        requiresConsent: requiresConsent === true ? true : undefined,
        requiresConfirmation: definition.requiresConfirmation,
        confirmationMessage: definition.confirmationMessage,
        style: definition.style,
        disabled: !hasCapability,
        disabledReason: hasCapability
          ? undefined
          : `You don't have the required capability: ${definition.capability}`,
        metadata: definition.metadata,
      };
    });
  }

  /**
   * Get available renderers
   *
   * @returns Map of context type to renderer
   */
  getRenderers(): Map<string, AbstractStateRenderer> {
    return new Map(this.renderers);
  }

  /**
   * Check if a renderer exists for a context type
   *
   * @param contextType - Context type
   * @returns True if renderer exists
   */
  hasRenderer(contextType: string): boolean {
    return this.renderers.has(contextType);
  }
}
