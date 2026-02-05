import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationChannel } from '../dto/notification.enums';
import { TemplateEntity } from '../entities/template.entity';

/**
 * RenderedMessage
 *
 * Result of rendering a template with variables.
 * Contains interpolated subject and body.
 */
export interface RenderedMessage {
  subject: string;
  body: string;
  variables: Record<string, string>;
}

/**
 * ValidationResult
 *
 * Result of validating variables against template requirements.
 */
export interface ValidationResult {
  isValid: boolean;
  missing: string[];
  errors?: string[];
}

/**
 * TemplateService
 *
 * Manages notification templates with support for:
 * - Finding templates with workspace fallback (workspace-specific → global → null)
 * - Rendering templates with variable interpolation using {{variable}} syntax
 * - Validating required variables before rendering
 *
 * Throws if required variables are missing during render.
 */
@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(TemplateEntity)
    private readonly templateRepository: Repository<TemplateEntity>,
  ) {}

  /**
   * Find template by name with workspace fallback logic.
   *
   * Lookup order:
   * 1. Workspace-specific template (if workspaceId provided)
   * 2. Global template (workspaceId = null)
   * 3. Return null if not found
   *
   * @param name Template name
   * @param options Search options (workspaceId, locale, channel)
   * @returns Template or null if not found
   */
  async findByName(
    name: string,
    options?: {
      workspaceId?: string;
      locale?: string;
      channel?: NotificationChannel;
    },
  ): Promise<TemplateEntity | null> {
    const locale = options?.locale ?? 'en';
    const channel = options?.channel;
    const workspaceId = options?.workspaceId;

    const baseQuery = this.templateRepository
      .createQueryBuilder('template')
      .where('template.name = :name', { name })
      .andWhere('template.locale = :locale', { locale })
      .andWhere('template.isActive = :isActive', { isActive: true });

    if (channel) {
      baseQuery.andWhere('template.channel = :channel', { channel });
    }

    // Try workspace-specific template first
    if (workspaceId) {
      const workspaceTemplate = await baseQuery
        .andWhere('template.workspaceId = :workspaceId', { workspaceId })
        .getOne();

      if (workspaceTemplate) {
        this.logger.debug(`Found workspace template: ${name} for workspace: ${workspaceId}`);
        return workspaceTemplate;
      }
    }

    // Fall back to global template (workspaceId IS NULL)
    const globalTemplate = await baseQuery
      .andWhere('template.workspaceId IS NULL')
      .getOne();

    if (globalTemplate) {
      this.logger.debug(`Found global template: ${name}`);
      return globalTemplate;
    }

    this.logger.warn(`Template not found: ${name}`);
    return null;
  }

  /**
   * Render template with variable interpolation.
   *
   * Throws if required variables are missing.
   *
   * @param template Template to render
   * @param variables Variables to interpolate
   * @returns Rendered message with interpolated subject and body
   * @throws Error if required variables are missing
   */
  render(template: TemplateEntity, variables: Record<string, string>): RenderedMessage {
    const validation = this.validateVariables(template, variables);

    if (!validation.isValid) {
      const missingVars = validation.missing.join(', ');
      const error = `Missing required template variables: ${missingVars} for template "${template.name}"`;
      this.logger.error(error);
      throw new Error(error);
    }

    const subject = this.interpolate(template.subject, variables);
    const body = this.interpolate(template.body, variables);

    this.logger.debug(`Rendered template: ${template.name}`);

    return {
      subject,
      body,
      variables,
    };
  }

  /**
   * Validate that all required variables are provided.
   *
   * @param template Template to validate against
   * @param variables Variables to validate
   * @returns Validation result with missing variables list
   */
  validateVariables(
    template: TemplateEntity,
    variables: Record<string, string>,
  ): ValidationResult {
    const missing: string[] = [];

    for (const variable of template.variables) {
      const value = variables[variable];
      if (value === undefined || value === null || value === '') {
        missing.push(variable);
      }
    }

    const isValid = missing.length === 0;

    if (!isValid) {
      this.logger.warn(
        `Validation failed for template "${template.name}". Missing: ${missing.join(', ')}`,
      );
    }

    return { isValid, missing };
  }

  /**
   * Interpolate variables in text using {{variable}} syntax.
   *
   * @param text Text containing {{variable}} placeholders
   * @param variables Variables to interpolate
   * @returns Text with variables replaced
   */
  private interpolate(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_match, variableName: string) => {
      const value = variables[variableName];
      return value ?? _match;
    });
  }
}
