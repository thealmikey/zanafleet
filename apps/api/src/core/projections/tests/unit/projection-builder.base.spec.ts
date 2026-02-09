import { Neo4jService } from '@api/core/neo4j';
import { BaseEvent } from '@api/core/event-bus/interfaces/base-event.interface';

import { ProjectionBuilder } from '../../projection-builder.base';

class TestProjection extends ProjectionBuilder<BaseEvent> {
  protected readonly projectionName = 'TestProjection';
  public handleEventCalled = false;
  public rebuildCalled = false;
  public lastHandledEvent: BaseEvent | null = null;

  protected async handleEvent(event: BaseEvent): Promise<void> {
    this.handleEventCalled = true;
    this.lastHandledEvent = event;
  }

  async rebuild(): Promise<void> {
    this.rebuildCalled = true;
  }

  public async testUpsertNode(
    label: string,
    idField: string,
    idValue: string,
    properties: Record<string, unknown>
  ): Promise<void> {
    return this.upsertNode(label, idField, idValue, properties);
  }

  public async testUpsertRelationship(
    fromLabel: string,
    fromIdField: string,
    fromIdValue: string,
    toLabel: string,
    toIdField: string,
    toIdValue: string,
    relationType: string
  ): Promise<void> {
    return this.upsertRelationship(
      fromLabel,
      fromIdField,
      fromIdValue,
      toLabel,
      toIdField,
      toIdValue,
      relationType
    );
  }

  public async testDeleteNode(label: string, idField: string, idValue: string): Promise<void> {
    return this.deleteNode(label, idField, idValue);
  }

  public async testDeleteRelationship(
    fromLabel: string,
    fromIdField: string,
    fromIdValue: string,
    toLabel: string,
    toIdField: string,
    toIdValue: string,
    relationType: string
  ): Promise<void> {
    return this.deleteRelationship(
      fromLabel,
      fromIdField,
      fromIdValue,
      toLabel,
      toIdField,
      toIdValue,
      relationType
    );
  }

  public async testExecuteQuery(
    query: string,
    params: Record<string, unknown> = {}
  ): Promise<void> {
    return this.executeQuery(query, params);
  }

  public testInitializeState(): void {
    this.initializeState();
  }
}

describe('ProjectionBuilder', () => {
  let projection: TestProjection;
  let mockNeo4jService: jest.Mocked<Neo4jService>;
  let mockSession: {
    run: jest.Mock;
    close: jest.Mock;
  };

  const createMockEvent = (overrides: Partial<BaseEvent> = {}): BaseEvent => ({
    eventId: 'test-event-id',
    eventType: 'TestEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2024-01-01T00:00:00Z'),
    aggregateId: 'test-123',
    aggregateType: 'Test',
    ...overrides,
  });

  beforeEach(() => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockNeo4jService = {
      getWriteSession: jest.fn().mockReturnValue(mockSession),
      getReadSession: jest.fn().mockReturnValue(mockSession),
    } as unknown as jest.Mocked<Neo4jService>;

    projection = new TestProjection(mockNeo4jService);
  });

  describe('handle', () => {
    it('should call handleEvent with the event', async () => {
      const event = createMockEvent();

      await projection.handle(event);

      expect(projection.handleEventCalled).toBe(true);
      expect(projection.lastHandledEvent).toBe(event);
    });

    it('should track the last processed event ID', async () => {
      const event = createMockEvent({ eventId: 'unique-event-id' });

      await projection.handle(event);

      expect(projection.getLastProcessedEventId()).toBe('unique-event-id');
    });

    it('should increment processed count', async () => {
      const event1 = createMockEvent({ eventId: 'event-1' });
      const event2 = createMockEvent({ eventId: 'event-2' });

      await projection.handle(event1);
      await projection.handle(event2);

      const state = projection.getState();
      expect(state.processedCount).toBe(2);
    });

    it('should throw and not update state if handleEvent fails', async () => {
      const failingProjection = new (class extends ProjectionBuilder<BaseEvent> {
        protected readonly projectionName = 'FailingProjection';
        protected async handleEvent(_event: BaseEvent): Promise<void> {
          throw new Error('Handler failed');
        }
        async rebuild(): Promise<void> {}
      })(mockNeo4jService);

      const event = createMockEvent();

      await expect(failingProjection.handle(event)).rejects.toThrow('Handler failed');
      expect(failingProjection.getLastProcessedEventId()).toBeNull();
    });

    it('should update lastProcessedAt timestamp', async () => {
      const event = createMockEvent();
      const beforeHandle = new Date();

      await projection.handle(event);

      const state = projection.getState();
      expect(state.lastProcessedAt).toBeInstanceOf(Date);
      expect(state.lastProcessedAt!.getTime()).toBeGreaterThanOrEqual(beforeHandle.getTime());
    });
  });

  describe('getState', () => {
    it('should return initial state before any events', () => {
      const state = projection.getState();

      expect(state.lastProcessedEventId).toBeNull();
      expect(state.lastProcessedAt).toBeNull();
      expect(state.processedCount).toBe(0);
    });

    it('should return updated state after processing events', async () => {
      const event = createMockEvent({ eventId: 'processed-event' });

      await projection.handle(event);
      const state = projection.getState();

      expect(state.lastProcessedEventId).toBe('processed-event');
      expect(state.lastProcessedAt).toBeInstanceOf(Date);
      expect(state.processedCount).toBe(1);
    });

    it('should return a copy of state (not mutable reference)', () => {
      const state1 = projection.getState();
      const state2 = projection.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('should not allow external mutation of state', async () => {
      const event = createMockEvent({ eventId: 'event-1' });
      await projection.handle(event);

      const state = projection.getState();
      state.processedCount = 999;
      state.lastProcessedEventId = 'tampered';

      const freshState = projection.getState();
      expect(freshState.processedCount).toBe(1);
      expect(freshState.lastProcessedEventId).toBe('event-1');
    });
  });

  describe('initializeState', () => {
    it('should set projectionName in state', () => {
      projection.testInitializeState();
      const state = projection.getState();

      expect(state.projectionName).toBe('TestProjection');
    });
  });

  describe('upsertNode', () => {
    it('should execute MERGE query with correct parameters', async () => {
      await projection.testUpsertNode('Actor', 'id', 'actor-123', {
        name: 'Test Actor',
        email: 'test@example.com',
      });

      expect(mockNeo4jService.getWriteSession).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (n:Actor {id: $idValue})'),
        expect.objectContaining({
          idValue: 'actor-123',
          name: 'Test Actor',
          email: 'test@example.com',
        })
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even if query fails', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Query failed'));

      await expect(
        projection.testUpsertNode('Actor', 'id', 'actor-123', { name: 'Test' })
      ).rejects.toThrow('Query failed');

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should include SET clause for all properties', async () => {
      await projection.testUpsertNode('Delivery', 'id', 'delivery-456', {
        status: 'pending',
        createdAt: '2024-01-01',
        priority: 1,
      });

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('SET'),
        expect.objectContaining({
          status: 'pending',
          createdAt: '2024-01-01',
          priority: 1,
        })
      );
    });
  });

  describe('upsertRelationship', () => {
    it('should execute MERGE query for relationship', async () => {
      await projection.testUpsertRelationship(
        'Actor',
        'id',
        'actor-123',
        'Workspace',
        'id',
        'workspace-456',
        'MEMBER_OF'
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (from)-[r:MEMBER_OF]->(to)'),
        expect.objectContaining({
          fromId: 'actor-123',
          toId: 'workspace-456',
        })
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even if relationship query fails', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Relationship query failed'));

      await expect(
        projection.testUpsertRelationship(
          'Actor',
          'id',
          'actor-123',
          'Workspace',
          'id',
          'workspace-456',
          'MEMBER_OF'
        )
      ).rejects.toThrow('Relationship query failed');

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should match both nodes before creating relationship', async () => {
      await projection.testUpsertRelationship(
        'Rider',
        'riderId',
        'rider-1',
        'Delivery',
        'deliveryId',
        'delivery-1',
        'ASSIGNED_TO'
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (from:Rider {riderId: $fromId})'),
        expect.any(Object)
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (to:Delivery {deliveryId: $toId})'),
        expect.any(Object)
      );
    });
  });

  describe('deleteNode', () => {
    it('should execute DETACH DELETE by default', async () => {
      await projection.testDeleteNode('Actor', 'id', 'actor-123');

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('DETACH DELETE n'),
        expect.objectContaining({ idValue: 'actor-123' })
      );
    });

    it('should close session after delete', async () => {
      await projection.testDeleteNode('Actor', 'id', 'actor-123');

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even if delete fails', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(projection.testDeleteNode('Actor', 'id', 'actor-123')).rejects.toThrow(
        'Delete failed'
      );

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('deleteRelationship', () => {
    it('should execute DELETE query for relationship', async () => {
      await projection.testDeleteRelationship(
        'Actor',
        'id',
        'actor-123',
        'Workspace',
        'id',
        'workspace-456',
        'MEMBER_OF'
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE r'),
        expect.objectContaining({
          fromId: 'actor-123',
          toId: 'workspace-456',
        })
      );
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('executeQuery', () => {
    it('should execute custom query with parameters', async () => {
      const query = 'MATCH (n:Test) WHERE n.value = $value RETURN n';
      const params = { value: 'test-value' };

      await projection.testExecuteQuery(query, params);

      expect(mockSession.run).toHaveBeenCalledWith(query, params);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should execute query without parameters', async () => {
      const query = 'MATCH (n:Test) RETURN count(n)';

      await projection.testExecuteQuery(query);

      expect(mockSession.run).toHaveBeenCalledWith(query, {});
    });
  });

  describe('rebuild', () => {
    it('should be callable on concrete implementation', async () => {
      await projection.rebuild();

      expect(projection.rebuildCalled).toBe(true);
    });
  });

  describe('getLastProcessedEventId', () => {
    it('should return null initially', () => {
      expect(projection.getLastProcessedEventId()).toBeNull();
    });

    it('should return the last processed event ID after handling events', async () => {
      await projection.handle(createMockEvent({ eventId: 'first-event' }));
      await projection.handle(createMockEvent({ eventId: 'second-event' }));

      expect(projection.getLastProcessedEventId()).toBe('second-event');
    });
  });

  describe('session management', () => {
    it('should get write session for upsert operations', async () => {
      await projection.testUpsertNode('Test', 'id', 'test-1', { name: 'test' });

      expect(mockNeo4jService.getWriteSession).toHaveBeenCalled();
      expect(mockNeo4jService.getReadSession).not.toHaveBeenCalled();
    });

    it('should get write session for delete operations', async () => {
      await projection.testDeleteNode('Test', 'id', 'test-1');

      expect(mockNeo4jService.getWriteSession).toHaveBeenCalled();
    });
  });
});
