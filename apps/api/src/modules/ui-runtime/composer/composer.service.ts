import { Injectable, Logger } from '@nestjs/common';
import { UISchemaCompilerService } from '../compiler/compiler.service';
import { ComponentRegistryService } from '../registry/component-registry.service';
import { ValidationService } from '../validation/validation.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import {
  UISchema,
  UIComposeRequest,
  UIComposeResponse,
  ActionInvocationRequest,
  ActionInvocationResult,
} from '../schema/v1/types';

/**
 * UI Composer Service
 * Composes and renders UISchema, handles action routing
 */
@Injectable()
export class UIComposerService {
  private readonly logger = new Logger(UIComposerService.name);

  constructor(
    private readonly compiler: UISchemaCompilerService,
    private readonly componentRegistry: ComponentRegistryService,
    private readonly validation: ValidationService,
    private readonly telemetry: TelemetryService
  ) {}

  /**
   * Compose UI for a request
   */
  async compose(request: UIComposeRequest): Promise<UIComposeResponse> {
    const startTime = Date.now();

    // Compile schema
    const schema = await this.compiler.compile(request);

    // Build response
    const response = this.compiler.buildResponse(schema);

    // Emit telemetry
    const renderTime = Date.now() - startTime;
    this.telemetry.emitScreenRendered({
      actorId: request.actorId,
      contextId: request.contextId,
      contextType: request.contextType,
      screenId: schema.metadata.screenId,
      schemaVersion: schema.schemaVersion,
      renderTime,
      componentCount: 0, // Simplified count
      correlationId: `corr_${Date.now()}`,
    });

    return response;
  }

  /**
   * Execute an action
   */
  async executeAction(request: ActionInvocationRequest): Promise<ActionInvocationResult> {
    const startTime = Date.now();
    const correlationId = request.correlationId ?? `corr_${Date.now()}`;

    // Emit action invoked
    this.telemetry.emitActionInvoked({
      actorId: request.actorId,
      actionId: request.actionId,
      actionType: 'custom',
      contextId: request.contextId,
      contextType: '',
      correlationId,
    });

    try {
      // TODO: Implement actual action execution through:
      // 1. Capability check
      // 2. Consent check
      // 3. Validation
      // 4. Command execution
      // 5. State transition

      // For now, return a placeholder result
      const result: ActionInvocationResult = {
        success: true,
        correlationId,
        data: {
          message: 'Action executed successfully',
        },
      };

      // Emit success
      this.telemetry.emitActionSucceeded({
        actorId: request.actorId,
        actionId: request.actionId,
        duration: Date.now() - startTime,
        correlationId,
        contextId: request.contextId,
        contextType: '',
      });

      return result;
    } catch (error) {
      // Emit failure
      this.telemetry.emitActionFailed({
        actorId: request.actorId,
        actionId: request.actionId,
        errorCode: 'ACTION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
        correlationId,
        contextId: request.contextId,
        contextType: '',
      });

      return {
        success: false,
        correlationId,
        errors: [
          {
            code: 'ACTION_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          },
        ],
      };
    }
  }

  /**
   * Resolve component bindings
   */
  resolveBindings(schema: UISchema, data: Record<string, unknown>): UISchema {
    // TODO: Implement binding resolution
    return schema;
  }
}
