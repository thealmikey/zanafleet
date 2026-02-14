/**
 * Neo4j Service Mock
 *
 * Mock implementation for Neo4jService for testing.
 */

export interface MockNeo4jService {
  write: jest.Mock<Promise<unknown>, [string, Record<string, unknown>]>;
  read: jest.Mock<Promise<unknown>, [string, Record<string, unknown>]>;
  writeTransaction: jest.Mock<Promise<unknown>, [(tx: unknown) => Promise<unknown>]>;
  readTransaction: jest.Mock<Promise<unknown>, [(tx: unknown) => Promise<unknown>]>;
}

export const createMockNeo4jService = (): MockNeo4jService => ({
  write: jest.fn().mockResolvedValue({ records: [] }),
  read: jest.fn().mockResolvedValue({ records: [] }),
  writeTransaction: jest.fn().mockImplementation(async (fn) => {
    const mockTx = {
      run: jest.fn().mockResolvedValue({ records: [] }),
    };
    return fn(mockTx);
  }),
  readTransaction: jest.fn().mockImplementation(async (fn) => {
    const mockTx = {
      run: jest.fn().mockResolvedValue({ records: [] }),
    };
    return fn(mockTx);
  }),
});

/**
 * Create a mock Neo4j query result
 */
export function createMockNeo4jResult<T>(data: T[]): { records: { _fields: T[] }[] } {
  return {
    records: data.map((item) => ({ _fields: [item] })),
  };
}

/**
 * Mock Neo4jService provider
 */
export const mockNeo4jService = createMockNeo4jService();
