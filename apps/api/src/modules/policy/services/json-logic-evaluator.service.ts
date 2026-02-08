import { Injectable } from '@nestjs/common';
import jsonLogic from 'json-logic-js';
import { DateTime } from 'luxon';

import { PolicyCondition, EvaluationContext } from '../dto';

/**
 * Result of evaluating policy conditions against a context.
 */
export interface EvaluationOutcome {
  matched: boolean;
  reason: string;
}

/**
 * Data object for evaluation - flat key-value structure.
 */
type EvaluationData = Record<string, unknown>;

/**
 * JsonLogicEvaluatorService
 *
 * Pure, side-effect-free service that evaluates policy conditions against
 * an evaluation context using the json-logic-js library.
 *
 * Supports operators: ==, !=, >, <, >=, <=, in, contains, startsWith, endsWith, AND, OR, NOT
 *
 * Context field mapping:
 * - timestamp → hour (0-23), minute (0-59), dayOfWeek (0=Sunday, 6=Saturday)
 * - location → latitude, longitude
 * - metadata.* → arbitrary field access
 */
@Injectable()
export class JsonLogicEvaluatorService {
  constructor() {
    // Register custom '===' operation for strict equality
    jsonLogic.add_operation('===', (a: unknown, b: unknown) => {
      return a === b;
    });

    // Register custom '!==' operation for strict inequality
    jsonLogic.add_operation('!==', (a: unknown, b: unknown) => {
      return a !== b;
    });

    // Register custom 'contains' operation - checks if haystack contains needle
    jsonLogic.add_operation('contains', (haystack: unknown, needle: unknown) => {
      if (typeof haystack === 'string' && typeof needle === 'string') {
        return haystack.includes(needle);
      }
      if (Array.isArray(haystack)) {
        return haystack.includes(needle);
      }
      return false;
    });

    // Register custom 'startsWith' operation
    jsonLogic.add_operation('startsWith', (str: unknown, prefix: unknown) => {
      if (typeof str === 'string' && typeof prefix === 'string') {
        return str.startsWith(prefix);
      }
      return false;
    });

    // Register custom 'endsWith' operation
    jsonLogic.add_operation('endsWith', (str: unknown, suffix: unknown) => {
      if (typeof str === 'string' && typeof suffix === 'string') {
        return str.endsWith(suffix);
      }
      return false;
    });

    // Register custom 'hasActiveEvent' operation - checks if eventType exists in activeEvents array
    jsonLogic.add_operation('hasActiveEvent', (events: unknown, eventType: unknown) => {
      if (!Array.isArray(events) || typeof eventType !== 'string') {
        return false;
      }
      return events.some((event: unknown) => {
        if (typeof event === 'object' && event !== null && 'eventType' in event) {
          return (event as { eventType: string }).eventType === eventType;
        }
        return false;
      });
    });

    // Register custom 'hasOverride' operation - checks if exceptionType exists in activeOverrides array
    jsonLogic.add_operation('hasOverride', (overrides: unknown, exceptionType: unknown) => {
      if (!Array.isArray(overrides) || typeof exceptionType !== 'string') {
        return false;
      }
      return overrides.some((override: unknown) => {
        if (typeof override === 'object' && override !== null && 'exceptionType' in override) {
          return (override as { exceptionType: string }).exceptionType === exceptionType;
        }
        return false;
      });
    });
  }

  /**
   * Evaluate policy conditions against the provided context.
   * Pure function: no I/O, no side effects.
   *
   * @param conditions - The policy conditions to evaluate
   * @param context - The evaluation context containing all relevant data
   * @returns Object containing whether conditions matched and a detailed reason
   */
  evaluate(conditions: PolicyCondition, context: EvaluationContext): EvaluationOutcome {
    const data = this.buildDataFromContext(context);
    const rule = this.buildJsonLogicRule(conditions);

    const matched = Boolean(jsonLogic.apply(rule, data));
    const reason = this.buildReason(conditions, data, matched);

    return { matched, reason };
  }

  /**
   * Convert a PolicyCondition tree to JSON Logic rule format.
   *
   * JSON Logic format examples:
   * - {"==": [{"var": "field"}, "value"]}
   * - {"and": [{...}, {...}]}
   * - {"or": [{...}, {...}]}
   * - {"!": {...}}
   */
  private buildJsonLogicRule(condition: PolicyCondition): object {
    const { field, operator, value, logic, children } = condition;
    const upperOp = operator.toUpperCase();

    // Handle logical operators
    if (upperOp === 'AND') {
      const childRules = (children ?? []).map((child) => this.buildJsonLogicRule(child));
      if (childRules.length === 0) {
        return { '==': [true, true] }; // Empty AND is true
      }
      return { and: childRules };
    }

    if (upperOp === 'OR') {
      const childRules = (children ?? []).map((child) => this.buildJsonLogicRule(child));
      if (childRules.length === 0) {
        return { '==': [true, false] }; // Empty OR is false
      }
      return { or: childRules };
    }

    if (upperOp === 'NOT') {
      if (children && children.length > 0) {
        return { '!': this.buildJsonLogicRule(children[0]) };
      }
      // NOT with no children and a field/value acts as "field != value"
      return { '!': { '==': [{ var: field }, value] } };
    }

    // Handle comparison operators
    const normalizedOp = this.normalizeOperator(operator);
    const comparisonRule = this.buildComparisonRule(field, normalizedOp, value);

    // If there are children, combine with the logic operator
    if (children && children.length > 0) {
      const childRules = children.map((child) => this.buildJsonLogicRule(child));
      const allRules = [comparisonRule, ...childRules];

      if (logic === 'OR') {
        return { or: allRules };
      }
      return { and: allRules };
    }

    return comparisonRule;
  }

  /**
   * Build a single comparison rule in JSON Logic format.
   * Uses strict equality (===) for == and (!==) for != to properly distinguish undefined from null.
   */
  private buildComparisonRule(field: string, operator: string, value: unknown): object {
    const varRef = { var: field };

    switch (operator) {
      case '==':
        // Use strict equality to distinguish undefined from null
        return { '===': [varRef, value] };
      case '!=':
        // Use strict inequality
        return { '!==': [varRef, value] };
      case '>':
        return { '>': [varRef, value] };
      case '<':
        return { '<': [varRef, value] };
      case '>=':
        return { '>=': [varRef, value] };
      case '<=':
        return { '<=': [varRef, value] };
      case 'in':
        // JSON Logic 'in' checks if first arg is in second arg (array)
        return { in: [varRef, value] };
      case 'contains':
        // Custom operation: contains(haystack, needle)
        return { contains: [varRef, value] };
      case 'startsWith':
        // Custom operation: startsWith(str, prefix)
        return { startsWith: [varRef, value] };
      case 'endsWith':
        // Custom operation: endsWith(str, suffix)
        return { endsWith: [varRef, value] };
      case 'hasActiveEvent':
        // Custom operation: hasActiveEvent(activeEvents, eventType)
        return { hasActiveEvent: [{ var: 'calendar.activeEvents' }, value] };
      case 'hasOverride':
        // Custom operation: hasOverride(activeOverrides, exceptionType)
        return { hasOverride: [{ var: 'calendar.activeOverrides' }, value] };
      default:
        // Fallback to equality check for unknown operators
        return { '==': [varRef, value] };
    }
  }

  /**
   * Normalize operator aliases to canonical form.
   */
  private normalizeOperator(operator: string): string {
    const aliases: Record<string, string> = {
      eq: '==',
      ne: '!=',
      gt: '>',
      lt: '<',
      gte: '>=',
      lte: '<=',
    };
    return aliases[operator] ?? operator;
  }

  /**
   * Transform an EvaluationContext into a flat data object for evaluation.
   * Extracts derived fields from timestamp (hour, minute, dayOfWeek) and flattens metadata.
   * Always sets context fields (even if undefined) to ensure correct strict equality checks.
   */
  private buildDataFromContext(context: EvaluationContext): EvaluationData {
    const data: EvaluationData = {
      trigger: context.trigger,
      workspaceId: context.workspaceId,
      // Always include optional fields to distinguish undefined from missing
      actorId: context.actorId,
      deliveryId: context.deliveryId,
      riderId: context.riderId,
      businessId: context.businessId,
      saccoId: context.saccoId,
    };

    if (context.timestamp) {
      const ts = context.timestamp;
      data.timestamp = ts.toISOString();

      // Use luxon for timezone-aware time extraction
      // Default to UTC for backward compatibility
      const zone = context.timezone ?? 'UTC';
      const dt = DateTime.fromJSDate(ts, { zone });

      data.hour = dt.hour;
      data.minute = dt.minute;
      // Convert luxon weekday (1=Monday...7=Sunday) to JS convention (0=Sunday...6=Saturday)
      data.dayOfWeek = dt.weekday % 7;
    }

    if (context.location) {
      data.latitude = context.location.latitude;
      data.longitude = context.location.longitude;
      data['location.latitude'] = context.location.latitude;
      data['location.longitude'] = context.location.longitude;
    }

    if (context.metadata) {
      data.metadata = context.metadata;
      for (const [key, val] of Object.entries(context.metadata)) {
        data[`metadata.${key}`] = val;
      }
    }

    // Add calendar context fields if present
    // Store as nested object so json-logic's var operation can traverse it
    // e.g., { var: 'calendar.isHoliday' } accesses data.calendar.isHoliday
    if (context.calendarContext) {
      const cal = context.calendarContext;
      data.calendar = {
        isHoliday: cal.isHoliday,
        isWorkingHours: cal.isWorkingHours,
        isWeekend: cal.isWeekend,
        currentDayOfWeek: cal.currentDayOfWeek,
        effectiveCalendarIds: cal.effectiveCalendarIds,
        activeEvents: cal.activeEvents,
        activeOverrides: cal.activeOverrides,
      };
    }

    return data;
  }

  /**
   * Build a detailed reason string explaining why the condition matched or didn't match.
   */
  private buildReason(
    condition: PolicyCondition,
    data: EvaluationData,
    matched: boolean
  ): string {
    const parts: string[] = [];
    this.collectReasonParts(condition, data, parts);

    const outcomeWord = matched ? 'matched' : 'did not match';
    const conditionSummary = parts.join('; ');

    if (parts.length === 0) {
      return `Condition ${outcomeWord}`;
    }

    return `Condition ${outcomeWord}: ${conditionSummary}`;
  }

  /**
   * Recursively collect human-readable explanations for each condition part.
   */
  private collectReasonParts(
    condition: PolicyCondition,
    data: EvaluationData,
    parts: string[]
  ): void {
    const { field, operator, value, children } = condition;
    const upperOp = operator.toUpperCase();

    if (upperOp === 'AND' || upperOp === 'OR' || upperOp === 'NOT') {
      if (children && children.length > 0) {
        for (const child of children) {
          this.collectReasonParts(child, data, parts);
        }
      }
      return;
    }

    const actualValue = this.getValueFromData(data, field);
    const actualDisplay = this.formatValue(actualValue);
    const expectedDisplay = this.formatValue(value);
    const opDisplay = this.formatOperator(operator);

    parts.push(`${field} (${actualDisplay}) ${opDisplay} ${expectedDisplay}`);

    if (children && children.length > 0) {
      for (const child of children) {
        this.collectReasonParts(child, data, parts);
      }
    }
  }

  /**
   * Get a value from the data object using dot notation.
   */
  private getValueFromData(data: EvaluationData, path: string): unknown {
    if (path in data) {
      return data[path];
    }

    const parts = path.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Format a value for human-readable display.
   */
  private formatValue(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.formatValue(v)).join(', ')}]`;
    }
    return String(value);
  }

  /**
   * Format an operator for human-readable display.
   */
  private formatOperator(operator: string): string {
    const opMap: Record<string, string> = {
      '==': 'equals',
      eq: 'equals',
      '!=': 'does not equal',
      ne: 'does not equal',
      '>': 'is greater than',
      gt: 'is greater than',
      '<': 'is less than',
      lt: 'is less than',
      '>=': 'is greater than or equal to',
      gte: 'is greater than or equal to',
      '<=': 'is less than or equal to',
      lte: 'is less than or equal to',
      in: 'is in',
      contains: 'contains',
      startsWith: 'starts with',
      endsWith: 'ends with',
    };
    return opMap[operator] ?? operator;
  }
}
