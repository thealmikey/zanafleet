import { BadRequestException } from '@nestjs/common';

import {
  parseQueryParams,
  createPaginationMeta,
} from '../../utils/query-params.util';

describe('parseQueryParams', () => {
  describe('pagination', () => {
    it('should return default pagination when no params provided', () => {
      const result = parseQueryParams({});

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      });
    });

    it('should parse page and limit as strings', () => {
      const result = parseQueryParams({ page: '3', limit: '50' });

      expect(result.pagination).toEqual({
        page: 3,
        limit: 50,
        offset: 100,
      });
    });

    it('should parse page and limit as numbers', () => {
      const result = parseQueryParams({ page: 2, limit: 25 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 25,
        offset: 25,
      });
    });

    it('should cap limit at maximum value', () => {
      const result = parseQueryParams({ limit: '500' });

      expect(result.pagination.limit).toBe(100);
    });

    it('should use default for invalid page values', () => {
      expect(parseQueryParams({ page: '0' }).pagination.page).toBe(1);
      expect(parseQueryParams({ page: '-5' }).pagination.page).toBe(1);
      expect(parseQueryParams({ page: 'abc' }).pagination.page).toBe(1);
      expect(parseQueryParams({ page: '' }).pagination.page).toBe(1);
    });

    it('should use default for invalid limit values', () => {
      expect(parseQueryParams({ limit: '0' }).pagination.limit).toBe(20);
      expect(parseQueryParams({ limit: '-10' }).pagination.limit).toBe(20);
      expect(parseQueryParams({ limit: 'xyz' }).pagination.limit).toBe(20);
    });

    it('should calculate correct offset', () => {
      expect(parseQueryParams({ page: '1', limit: '10' }).pagination.offset).toBe(0);
      expect(parseQueryParams({ page: '2', limit: '10' }).pagination.offset).toBe(10);
      expect(parseQueryParams({ page: '5', limit: '20' }).pagination.offset).toBe(80);
    });

    it('should floor decimal page numbers', () => {
      const result = parseQueryParams({ page: 2.7 });

      expect(result.pagination.page).toBe(2);
    });
  });

  describe('sort', () => {
    it('should return null when no sort provided', () => {
      const result = parseQueryParams({});

      expect(result.sort).toBeNull();
    });

    it('should parse ascending sort (default)', () => {
      const result = parseQueryParams({ sort: 'createdAt' });

      expect(result.sort).toEqual({
        field: 'createdAt',
        order: 'ASC',
      });
    });

    it('should parse ascending sort with + prefix', () => {
      const result = parseQueryParams({ sort: '+name' });

      expect(result.sort).toEqual({
        field: 'name',
        order: 'ASC',
      });
    });

    it('should parse descending sort with - prefix', () => {
      const result = parseQueryParams({ sort: '-updatedAt' });

      expect(result.sort).toEqual({
        field: 'updatedAt',
        order: 'DESC',
      });
    });

    it('should trim whitespace from sort field', () => {
      const result = parseQueryParams({ sort: '  name  ' });

      expect(result.sort).toEqual({
        field: 'name',
        order: 'ASC',
      });
    });

    it('should return null for empty sort string', () => {
      expect(parseQueryParams({ sort: '' }).sort).toBeNull();
      expect(parseQueryParams({ sort: '   ' }).sort).toBeNull();
    });

    it('should return null for - or + only', () => {
      expect(parseQueryParams({ sort: '-' }).sort).toBeNull();
      expect(parseQueryParams({ sort: '+' }).sort).toBeNull();
      expect(parseQueryParams({ sort: '-  ' }).sort).toBeNull();
    });
  });

  describe('filter', () => {
    it('should return empty object when no filter provided', () => {
      const result = parseQueryParams({});

      expect(result.filter).toEqual({});
    });

    it('should parse JSON string filter', () => {
      const result = parseQueryParams({
        filter: '{"status":"active","type":"delivery"}',
      });

      expect(result.filter).toEqual({
        status: 'active',
        type: 'delivery',
      });
    });

    it('should accept object filter directly', () => {
      const result = parseQueryParams({
        filter: { status: 'pending', priority: 1 },
      });

      expect(result.filter).toEqual({
        status: 'pending',
        priority: 1,
      });
    });

    it('should return empty object for empty string filter', () => {
      expect(parseQueryParams({ filter: '' }).filter).toEqual({});
      expect(parseQueryParams({ filter: '   ' }).filter).toEqual({});
    });

    it('should throw BadRequestException for invalid JSON', () => {
      expect(() => parseQueryParams({ filter: 'not-json' })).toThrow(BadRequestException);
      expect(() => parseQueryParams({ filter: '{invalid}' })).toThrow(BadRequestException);
      expect(() => parseQueryParams({ filter: '{"unclosed": ' })).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-object JSON', () => {
      expect(() => parseQueryParams({ filter: '"string"' })).toThrow(BadRequestException);
      expect(() => parseQueryParams({ filter: '[1,2,3]' })).toThrow(BadRequestException);
      expect(() => parseQueryParams({ filter: '123' })).toThrow(BadRequestException);
      expect(() => parseQueryParams({ filter: 'null' })).toThrow(BadRequestException);
    });

    it('should parse complex nested filter', () => {
      const result = parseQueryParams({
        filter: '{"user":{"name":"John"},"tags":["a","b"],"count":5}',
      });

      expect(result.filter).toEqual({
        user: { name: 'John' },
        tags: ['a', 'b'],
        count: 5,
      });
    });
  });

  describe('combined params', () => {
    it('should parse all params together', () => {
      const result = parseQueryParams({
        page: '2',
        limit: '15',
        sort: '-createdAt',
        filter: '{"status":"active"}',
      });

      expect(result).toEqual({
        pagination: {
          page: 2,
          limit: 15,
          offset: 15,
        },
        sort: {
          field: 'createdAt',
          order: 'DESC',
        },
        filter: {
          status: 'active',
        },
      });
    });
  });
});

describe('createPaginationMeta', () => {
  it('should create correct meta for first page', () => {
    const result = createPaginationMeta({ page: 1, limit: 10, offset: 0 }, 25);

    expect(result).toEqual({
      page: 1,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('should create correct meta for middle page', () => {
    const result = createPaginationMeta({ page: 2, limit: 10, offset: 10 }, 25);

    expect(result).toEqual({
      page: 2,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('should create correct meta for last page', () => {
    const result = createPaginationMeta({ page: 3, limit: 10, offset: 20 }, 25);

    expect(result).toEqual({
      page: 3,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('should handle empty results', () => {
    const result = createPaginationMeta({ page: 1, limit: 10, offset: 0 }, 0);

    expect(result).toEqual({
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('should handle single page results', () => {
    const result = createPaginationMeta({ page: 1, limit: 20, offset: 0 }, 15);

    expect(result).toEqual({
      page: 1,
      limit: 20,
      totalItems: 15,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('should handle exact page boundary', () => {
    const result = createPaginationMeta({ page: 2, limit: 10, offset: 10 }, 20);

    expect(result).toEqual({
      page: 2,
      limit: 10,
      totalItems: 20,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});
