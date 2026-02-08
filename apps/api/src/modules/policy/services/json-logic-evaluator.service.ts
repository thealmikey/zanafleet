import { Injectable } from '@nestjs/common';

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
 * an evaluation context using JSON Logic-style rules.
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
    const matched = this.evaluateCondition(conditions, data);
    const reason = this.buildReason(conditions, data, matched);

    return { matched, reason };
  }

  /**
   * Recursively evaluate a PolicyCondition against data.
   */
  private evaluateCondition(condition: PolicyCondition, data: EvaluationData): boolean {
    const { field, operator, value, logic, children } = condition;
    const upperOp = operator.toUpperCase();

    if (upperOp === 'AND') {
      return this.evaluateAnd(children ?? [], data);
    }

    if (upperOp === 'OR') {
      return this.evaluateOr(children ?? [], data);
    }

    if (upperOp === 'NOT') {
      if (children && children.length > 0) {
        return !this.evaluateCondition(children[0], data);
      }
      return !this.evaluateComparison(field, '==', value, data);
    }

    const comparisonResult = this.evaluateComparison(field, operator, value, data);

    if (children && children.length > 0) {
      const childResults = children.map((child) => this.evaluateCondition(child, data));
      if (logic === 'OR') {
        return comparisonResult || childResults.some(Boolean);
      }
      return comparisonResult && childResults.every(Boolean);
    }

    return comparisonResult;
  }

  /**
   * Evaluate AND logic across children.
   */
  private evaluateAnd(children: PolicyCondition[], data: EvaluationData): boolean {
    if (children.length === 0) {
      return true;
    }
    return children.every((child) => this.evaluateCondition(child, data));
  }

  /**
   * Evaluate OR logic across children.
   */
  private evaluateOr(children: PolicyCondition[], data: EvaluationData): boolean {
    if (children.length === 0) {
      return false;
    }
    return children.some((child) => this.evaluateCondition(child, data));
  }

  /**
   * Evaluate a single comparison operation.
   */
  private evaluateComparison(
    field: string,
    operator: string,
    value: unknown,
    data: EvaluationData
  ): boolean {
    const actualValue = this.getValueFromData(data, field);
    const normalizedOp = this.normalizeOperator(operator);

    switch (normalizedOp) {
      case '==':
        return actualValue === value;
      case '!=':
        return actualValue !== value;
      case '>':
        return this.compareNumeric(actualValue, value, (a, b) => a > b);
      case '<':
        return this.compareNumeric(actualValue, value, (a, b) => a < b);
      case '>=':
        return this.compareNumeric(actualValue, value, (a, b) => a >= b);
      case '<=':
        return this.compareNumeric(actualValue, value, (a, b) => a <= b);
      case 'in':
        return this.evaluateIn(actualValue, value);
      case 'contains':
        return this.evaluateContains(actualValue, value);
      case 'startsWith':
        return this.evaluateStartsWith(actualValue, value);
      case 'endsWith':
        return this.evaluateEndsWith(actualValue, value);
      default:
        return false;
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
   * Compare two values numerically.
   */
  private compareNumeric(
    actual: unknown,
    expected: unknown,
    compareFn: (a: number, b: number) => boolean
  ): boolean {
    const actualNum = typeof actual === 'number' ? actual : Number(actual);
    const expectedNum = typeof expected === 'number' ? expected : Number(expected);

    if (Number.isNaN(actualNum) || Number.isNaN(expectedNum)) {
      return false;
    }

    return compareFn(actualNum, expectedNum);
  }

  /**
   * Evaluate 'in' operator - check if value is in array.
   */
  private evaluateIn(actualValue: unknown, expectedArray: unknown): boolean {
    if (Array.isArray(expectedArray)) {
      return expectedArray.includes(actualValue);
    }
    return false;
  }

  /**
   * Evaluate 'contains' operator - check if string/array contains value.
   */
  private evaluateContains(haystack: unknown, needle: unknown): boolean {
    if (typeof haystack === 'string' && typeof needle === 'string') {
      return haystack.includes(needle);
    }
    if (Array.isArray(haystack)) {
      return haystack.includes(needle);
    }
    return false;
  }

  /**
   * Evaluate 'startsWith' operator.
   */
  private evaluateStartsWith(str: unknown, prefix: unknown): boolean {
    if (typeof str === 'string' && typeof prefix === 'string') {
      return str.startsWith(prefix);
    }
    return false;
  }

  /**
   * Evaluate 'endsWith' operator.
   */
  private evaluateEndsWith(str: unknown, suffix: unknown): boolean {
    if (typeof str === 'string' && typeof suffix === 'string') {
      return str.endsWith(suffix);
    }
    return false;
  }

  /**
   * Transform an EvaluationContext into a flat data object for evaluation.
   * Extracts derived fields from timestamp (hour, minute, dayOfWeek) and flattens metadata.
   */
  private buildDataFromContext(context: EvaluationContext): EvaluationData {
    const data: EvaluationData = {
      trigger: context.trigger,
      workspaceId: context.workspaceId,
    };

    if (context.actorId !== undefined) {
      data.actorId = context.actorId;
    }

    if (context.deliveryId !== undefined) {
      data.deliveryId = context.deliveryId;
    }

    if (context.riderId !== undefined) {
      data.riderId = context.riderId;
    }

    if (context.businessId !== undefined) {
      data.businessId = context.businessId;
    }

    if (context.saccoId !== undefined) {
      data.saccoId = context.saccoId;
    }

    if (context.timestamp) {
      const ts = context.timestamp;
      data.timestamp = ts.toISOString();
      data.hour = ts.getUTCHours();
      data.minute = ts.getUTCMinutes();
      data.dayOfWeek = ts.getUTCDay();
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
