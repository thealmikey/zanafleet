/**
 * Repository Mock
 *
 * Mock implementation for TypeORM Repository for testing.
 */

export interface MockQueryBuilder {
  andWhere: jest.Mock<MockQueryBuilder, [string, unknown]>;
  orderBy: jest.Mock<MockQueryBuilder, [string, string]>;
  take: jest.Mock<MockQueryBuilder, [number]>;
  getMany: jest.Mock<Promise<unknown[]>, []>;
}

export interface MockRepository<T> {
  save: jest.Mock<Promise<T>, [T]>;
  findOne: jest.Mock<Promise<T | null>, [unknown]>;
  find: jest.Mock<Promise<T[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  createQueryBuilder: jest.Mock<MockQueryBuilder, []>;
  update: jest.Mock<Promise<{ affected?: number }>, [unknown, unknown]>;
  delete: jest.Mock<Promise<{ affected?: number }>, [unknown]>;
}

/**
 * Create a mock repository with all necessary methods
 */
export function createMockRepository<T>(): MockRepository<T> {
  const mockQueryBuilder: MockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  return {
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity as T)),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };
}

/**
 * Create a mock query builder with configurable behavior
 */
export function createMockQueryBuilder(data: unknown[] = []): MockQueryBuilder {
  return {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(data),
  };
}
