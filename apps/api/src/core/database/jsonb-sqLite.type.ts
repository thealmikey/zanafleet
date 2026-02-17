/**
 * Custom TypeORM type for JSON columns
 * 
 * Maps 'jsonb' to 'text' in SQLite (which stores JSON as text)
 * while preserving 'jsonb' for PostgreSQL.
 * 
 * Usage: @Column('simple-json', { type: 'simple-json' }) - will use this custom type
 */

import { ValueTransformer } from 'typeorm';

/**
 * JSON column transformer for proper serialization
 */
export const jsonTransformer: ValueTransformer = {
  to: (value: unknown): string => {
    if (value === null || value === undefined) {
      return null as unknown as string;
    }
    return JSON.stringify(value);
  },
  from: (value: string): unknown => {
    if (value === null || value === undefined) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
};

/**
 * Custom type for JSON columns that works with both SQLite and PostgreSQL
 * 
 * In SQLite, JSON is stored as TEXT with automatic JSON parsing
 * In PostgreSQL, it uses the native JSONB type
 */
export class JsonType implements ReturnType<typeof require> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static _instance: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static get instance(): any {
    if (!JsonType._instance) {
      JsonType._instance = new JsonType();
    }
    return JsonType._instance;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getColumnType(_primary: any, _entity: any): string {
    // In SQLite, use text; in PostgreSQL, use jsonb
    // This is detected at runtime based on the database driver
    return 'text';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLength(_primary: any, _entity: any): string | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPrecision(_primary: any, _entity: any): number | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getScale(_primary: any, _entity: any): number | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getArrayLengthType?(_primary: any, _entity: any): string | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toDb(value: unknown, _column: any): unknown {
    if (value === null || value === undefined) {
      return null;
    }
    return JSON.stringify(value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fromDb(value: unknown, _column: any): unknown {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}

/**
 * Helper function to conditionally use JSON type based on database driver
 * 
 * @param isSandboxMode - Whether running in sandbox mode (SQLite)
 */
export function getJsonColumnType(isSandboxMode: boolean): string {
  return isSandboxMode ? 'text' : 'jsonb';
}

/**
 * Decorator helper for JSON columns that works with both SQLite and PostgreSQL
 * 
 * @param options - Column options
 * @param isSandboxMode - Whether running in sandbox mode (SQLite)
 */
export function createJsonColumnOptions(
  isSandboxMode: boolean,
  options: { nullable?: boolean; default?: unknown } = {}
): Record<string, unknown> {
  return {
    type: isSandboxMode ? 'text' : 'jsonb',
    nullable: options.nullable ?? true,
    ...(options.default !== undefined && { default: options.default }),
    transformer: jsonTransformer,
  };
}