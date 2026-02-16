import { Injectable, Logger } from '@nestjs/common';

import {
  UISchema,
  DataSource,
  Binding,
  ActionDefinition,
  ValidatorDefinition,
  SchemaMetadata,
  TelemetryConfig,
  UIComposeRequest,
  UIComposeResponse,
  ResponseMetadata,
  CapabilityRequirement,
  ScreenState,
  Condition,
  LayoutNode,
} from '../schema/v1/types';

/**
 * UISchema Compiler Service
 * Compiles and resolves UISchema from various inputs
 */
@Injectable()
export class UISchemaCompilerService {
  private readonly logger = new Logger(UISchemaCompilerService.name);

  // Empty constructor for NestJS dependency injection
  /* eslint-disable @typescript-eslint/no-empty-function */
  constructor() {}
  /* eslint-enable @typescript-eslint/no-empty-function */

  /**
   * Compile UISchema from request
   */
  async compile(request: UIComposeRequest): Promise<UISchema> {
    const startTime = Date.now();

    // Get screen definition (from workflow or cache)
    const screenDef = await this.getScreenDefinition(request);

    // Build metadata
    const metadata = this.buildMetadata(screenDef, request);

    // Build screen state
    const state = this.buildScreenState(request);

    // Resolve data sources
    const dataSources = await this.resolveDataSources(screenDef.dataSources, request);

    // Resolve bindings
    const bindings = this.resolveBindings(screenDef.bindings);

    // Resolve actions with capability filtering
    const actions = await this.resolveActions(screenDef.actions);

    // Resolve validators
    const validators = this.resolveValidators(screenDef.validators);

    // Build final UISchema
    const schema: UISchema = {
      version: '1.0.0',
      schemaVersion: 1,
      screen: {
        id: screenDef.id,
        type: 'screen',
        layout: screenDef.layout,
        state,
        dataSources,
        bindings,
        actions,
        validators,
        telemetry: screenDef.telemetry ?? { screenEvents: true, actionEvents: true },
      },
      metadata,
      capabilities: screenDef.capabilities ?? [],
      telemetry: screenDef.telemetry ?? { screenEvents: true, actionEvents: true },
    };

    const compileTime = Date.now() - startTime;
    this.logger.debug(`UISchema compiled in ${compileTime}ms`);

    return schema;
  }

  /**
   * Build response from schema
   */
  buildResponse(schema: UISchema): UIComposeResponse {
    const responseMetadata: ResponseMetadata = {
      schemaVersion: schema.schemaVersion,
      etag: this.generateETag(schema),
      timestamp: new Date().toISOString(),
      ttl: schema.metadata.cacheable ? schema.metadata.ttl : undefined,
      features: this.getAvailableFeatures(schema),
    };

    return {
      schema,
      metadata: responseMetadata,
    };
  }

  /**
   * Get screen definition (placeholder - integrate with workflow engine)
   */
  private async getScreenDefinition(request: UIComposeRequest): Promise<{
    id: string;
    layout: LayoutNode;
    dataSources: DataSource[];
    bindings: Binding[];
    actions: ActionDefinition[];
    validators: ValidatorDefinition[];
    capabilities: CapabilityRequirement[];
    telemetry: TelemetryConfig;
  }> {
    // TODO: Integrate with workflow engine to get actual screen definitions
    // For now, return a placeholder structure
    return {
      id: `${request.contextType.toLowerCase()}_screen`,
      layout: {
        id: 'main-layout',
        type: 'stack',
        direction: 'vertical',
        children: [],
      },
      dataSources: [],
      bindings: [],
      actions: [],
      validators: [],
      capabilities: [],
      telemetry: { screenEvents: true, actionEvents: true },
    };
  }

  /**
   * Build metadata
   */
  private buildMetadata(
    screenDef: { id: string },
    request: UIComposeRequest,
  ): SchemaMetadata {
    return {
      screenId: screenDef.id,
      screenTitle: this.formatScreenTitle(screenDef.id),
      contextType: request.contextType,
      contextId: request.contextId,
      locale: 'en',
      createdAt: new Date().toISOString(),
      cacheable: true,
      ttl: 300, // 5 minutes default
    };
  }

  /**
   * Build screen state
   */
  private buildScreenState(request: UIComposeRequest): ScreenState {
    return {
      id: request.contextId ?? `screen_${Date.now()}`,
      version: '1.0.0',
      data: {},
      lastModified: new Date().toISOString(),
      etag: '',
      ttl: 300,
    };
  }

  /**
   * Resolve data sources
   */
  private async resolveDataSources(
    dataSources: DataSource[],
    request: UIComposeRequest,
  ): Promise<DataSource[]> {
    // TODO: Load actual data for async/computed data sources
    return dataSources.map((ds) => ({
      ...ds,
      // Resolve endpoint variables
      endpoint: this.resolveEndpointVariables(ds.endpoint, request),
    }));
  }

  /**
   * Resolve endpoint variables
   */
  private resolveEndpointVariables(
    endpoint: string | undefined,
    request: UIComposeRequest,
  ): string | undefined {
    if (!endpoint) return endpoint;
    return endpoint
      .replace('{actorId}', request.actorId)
      .replace('{contextId}', request.contextId ?? '')
      .replace('{contextType}', request.contextType);
  }

  /**
   * Resolve bindings
   */
  private resolveBindings(bindings: Binding[]): Binding[] {
    // TODO: Validate and resolve binding references
    return bindings;
  }

  /**
   * Resolve actions with capability filtering
   */
  private async resolveActions(
    actions: ActionDefinition[],
  ): Promise<ActionDefinition[]> {
    // TODO: Filter actions based on actor capabilities
    // For now, return all actions - capability filtering happens at runtime
    return actions.map((action) => ({
      ...action,
      // Add default disabled state based on conditions
      disabled: action.disabled ?? undefined,
    }));
  }

  /**
   * Resolve validators
   */
  private resolveValidators(validators: ValidatorDefinition[]): ValidatorDefinition[] {
    return validators;
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(condition: Condition, context: Record<string, unknown>): boolean {
    if (!condition) return true;

    if (condition.$when) {
      const { operator, left, right } = condition.$when;
      const leftValue = this.resolveValue(left, context);
      const rightValue = this.resolveValue(right, context);

      switch (operator) {
        case 'eq': return leftValue === rightValue;
        case 'ne': return leftValue !== rightValue;
        case 'gt': return Number(leftValue) > Number(rightValue);
        case 'lt': return Number(leftValue) < Number(rightValue);
        case 'gte': return Number(leftValue) >= Number(rightValue);
        case 'lte': return Number(leftValue) <= Number(rightValue);
        case 'in': return Array.isArray(rightValue) && rightValue.includes(leftValue);
        case 'notIn': return Array.isArray(rightValue) && !rightValue.includes(leftValue);
        case 'contains': return String(leftValue).includes(String(rightValue));
        case 'startsWith': return String(leftValue).startsWith(String(rightValue));
        case 'endsWith': return String(leftValue).endsWith(String(rightValue));
        case 'exists': return leftValue !== null && leftValue !== undefined;
        case 'isNull': return leftValue === null || leftValue === undefined;
        default: return true;
      }
    }

    if (condition.$and && condition.$and.length > 0) {
      return condition.$and.every((c) => this.evaluateCondition(c, context));
    }

    if (condition.$or && condition.$or.length > 0) {
      return condition.$or.some((c) => this.evaluateCondition(c, context));
    }

    return true;
  }

  /**
   * Resolve value from binding or context
   */
  private resolveValue(
    value: unknown,
    _context: Record<string, unknown>,
  ): unknown {
    return value;
  }

  /**
   * Format screen title from ID
   */
  private formatScreenTitle(screenId: string): string {
    return screenId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate ETag from schema
   */
  private generateETag(schema: UISchema): string {
    const content = JSON.stringify(schema);
    // Simple hash - in production use proper hashing
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `"${hash.toString(16)}"`;
  }

  /**
   * Get available features from schema
   */
  private getAvailableFeatures(schema: UISchema): string[] {
    const features: string[] = [];
    if (schema.screen.dataSources?.length) features.push('dataSources');
    if (schema.screen.bindings?.length) features.push('bindings');
    if (schema.screen.actions?.length) features.push('actions');
    if (schema.aiAnnotations?.length) features.push('aiAnnotations');
    return features;
  }
}
