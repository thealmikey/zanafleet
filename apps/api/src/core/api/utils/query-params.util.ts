import { BadRequestException } from '@nestjs/common';

/**
 * Pagination parameters extracted from query string.
 */
export interface PaginationParams {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Offset for database queries (calculated from page and limit) */
  offset: number;
}

/**
 * Sort parameter extracted from query string.
 */
export interface SortParam {
  /** Field name to sort by */
  field: string;
  /** Sort direction */
  order: 'ASC' | 'DESC';
}

/**
 * Fully parsed query parameters for list endpoints.
 */
export interface ParsedQueryParams {
  /** Pagination settings */
  pagination: PaginationParams;
  /** Sort settings (null if not specified) */
  sort: SortParam | null;
  /** Filter object (empty object if not specified) */
  filter: Record<string, unknown>;
}

/**
 * Raw query parameters as received from the request.
 */
export interface RawQueryParams {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  filter?: string | Record<string, unknown>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Parse and validate common query parameters for list endpoints.
 *
 * @example
 * ```typescript
 * @Get()
 * async list(@Query() query: RawQueryParams) {
 *   const { pagination, sort, filter } = parseQueryParams(query);
 *   return this.service.findAll({
 *     skip: pagination.offset,
 *     take: pagination.limit,
 *     orderBy: sort ? { [sort.field]: sort.order } : undefined,
 *     where: filter,
 *   });
 * }
 * ```
 *
 * Query string examples:
 * - `?page=2&limit=50` - Page 2 with 50 items
 * - `?sort=-createdAt` - Sort by createdAt descending
 * - `?sort=name` - Sort by name ascending
 * - `?filter={"status":"active"}` - Filter by status
 *
 * @param query - Raw query parameters from request
 * @returns Parsed and validated query parameters
 * @throws BadRequestException if filter JSON is invalid
 */
export function parseQueryParams(query: RawQueryParams): ParsedQueryParams {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const limit = clamp(parsePositiveInt(query.limit, DEFAULT_LIMIT), MIN_LIMIT, MAX_LIMIT);
  const offset = (page - 1) * limit;

  const sort = parseSort(query.sort);
  const filter = parseFilter(query.filter);

  return {
    pagination: { page, limit, offset },
    sort,
    filter,
  };
}

/**
 * Parse a value as a positive integer, returning a default if invalid.
 */
function parsePositiveInt(value: string | number | undefined, defaultValue: number): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

/**
 * Clamp a number between min and max values.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Parse sort parameter.
 *
 * Format: `[+|-]fieldName`
 * - Prefix with `-` for descending order
 * - Prefix with `+` or no prefix for ascending order
 *
 * @example
 * - `createdAt` -> { field: 'createdAt', order: 'ASC' }
 * - `-createdAt` -> { field: 'createdAt', order: 'DESC' }
 * - `+name` -> { field: 'name', order: 'ASC' }
 */
function parseSort(value: string | undefined): SortParam | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('-')) {
    const field = trimmed.slice(1).trim();
    return field ? { field, order: 'DESC' } : null;
  }

  if (trimmed.startsWith('+')) {
    const field = trimmed.slice(1).trim();
    return field ? { field, order: 'ASC' } : null;
  }

  return { field: trimmed, order: 'ASC' };
}

/**
 * Parse filter parameter.
 *
 * Accepts either:
 * - A JSON string representing an object
 * - An already-parsed object (from query parsing middleware)
 *
 * @throws BadRequestException if JSON is invalid or not an object
 */
function parseFilter(value: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      throw new BadRequestException('Filter must be a JSON object');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid filter format: must be valid JSON object');
    }
  }

  return {};
}

/**
 * Create pagination metadata for API responses.
 *
 * @example
 * ```typescript
 * const [items, total] = await this.repo.findAndCount({ ... });
 * return {
 *   data: items,
 *   meta: createPaginationMeta(pagination, total),
 * };
 * ```
 */
export function createPaginationMeta(
  pagination: PaginationParams,
  totalItems: number
): {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const totalPages = Math.ceil(totalItems / pagination.limit);

  return {
    page: pagination.page,
    limit: pagination.limit,
    totalItems,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}
