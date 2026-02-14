/**
 * Event Bus Mock
 *
 * Mock implementation for the EventBusService for testing.
 */

import { BaseEvent } from '@api/core/event-bus/interfaces/base-event.interface';

export interface MockEventBusService {
  publish: jest.Mock<Promise<void>, [string, BaseEvent]>;
  publishAsync: jest.Mock<Promise<void>, [string, BaseEvent]>;
  subscribe: jest.Mock<void, [string, (event: BaseEvent) => Promise<void>]>;
  unsubscribe: jest.Mock<void, [string]>;
}

export const createMockEventBusService = (): MockEventBusService => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAsync: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
});

/**
 * Mock implementation of EventBusModule.forFeature().get()
 */
export const mockEventBusService = createMockEventBusService();
