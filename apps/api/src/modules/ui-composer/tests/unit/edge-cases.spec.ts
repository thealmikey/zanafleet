import { Test, TestingModule } from '@nestjs/testing';

import { UIComposerService } from '../../services/ui-composer.service';
import { ComponentRegistryService } from '../../services/component-registry.service';
import { MoveBookingStateRenderer } from '../../strategies/move-booking-renderer';
import { CapabilityAccessController } from '../../../capability/services/capability-access.controller';
import { WorkflowEngineService } from '../../../workflow/services/workflow-engine.service';
import {
  ProcessInstanceEntity,
  ProcessInstanceStatus,
} from '../../../workflow/entities/process-instance.entity';
import { ProcessState } from '../../../workflow/entities/process-definition.entity';
import { UIComposeRequest } from '../../interfaces/ui-composer.interfaces';

/**
 * Mock WorkflowEngineService
 */
const mockWorkflowEngine = {
  getProcessState: jest.fn(),
};

/**
 * Mock CapabilityAccessController
 */
const mockCapabilityAccessController = {
  getCapabilitiesForActor: jest.fn(),
};

/**
 * Create a mock process instance
 */
function createMockProcessInstance(
  overrides?: Partial<ProcessInstanceEntity>
): ProcessInstanceEntity {
  const instance = new ProcessInstanceEntity();
  instance.instanceId = 'instance-123';
  instance.definitionId = 'move-booking-process';
  instance.name = 'MoveBookingProcess';
  instance.currentState = ProcessState.DRIVER_ASSIGNED;
  instance.status = ProcessInstanceStatus.ACTIVE;
  instance.context = {
    bookingId: 'booking-123',
    driverId: 'driver-456',
    driverName: 'John Doe',
    driverRating: 4.8,
    driverPhone: '+1234567890',
    pickupAddress: '123 Pickup St',
    dropoffAddress: '456 Dropoff Ave',
    scheduledDate: '2024-01-15T10:00:00Z',
    items: [{ id: 'item-1', name: 'Sofa', quantity: 1 }],
  };
  instance.relatedEntities = [];
  instance.triggeredBy = 'system';
  instance.transitionCount = 0;
  instance.history = [];
  instance.createdAt = new Date();
  instance.updatedAt = new Date();

  return { ...instance, ...overrides } as ProcessInstanceEntity;
}

describe('Edge Cases', () => {
  let service: UIComposerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UIComposerService,
        ComponentRegistryService,
        MoveBookingStateRenderer,
        {
          provide: WorkflowEngineService,
          useValue: mockWorkflowEngine,
        },
        {
          provide: CapabilityAccessController,
          useValue: mockCapabilityAccessController,
        },
      ],
    }).compile();

    service = module.get<UIComposerService>(UIComposerService);

    // Register the MoveBooking renderer
    const renderer = module.get<MoveBookingStateRenderer>(MoveBookingStateRenderer);
    service.registerRenderer(renderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Empty Capabilities Tests
  // =============================================================================

  describe('empty capabilities list', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle empty capabilities array', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      result.actions.forEach((action) => {
        expect(action.disabled).toBe(true);
      });
    });

    it('should handle null capabilities response', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue(null as any);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle undefined capabilities response', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue(undefined as any);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Null/Undefined Context Tests
  // =============================================================================

  describe('null/undefined context', () => {
    it('should handle undefined context in request', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
        options: undefined,
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle undefined options in request', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
        options: undefined,
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Very Long Context IDs Tests
  // =============================================================================

  describe('very long context IDs', () => {
    it('should handle very long contextId', async () => {
      // Arrange
      const longId = 'a'.repeat(10000);
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: longId,
      };

      mockWorkflowEngine.getProcessState.mockRejectedValue(new Error('Process not found'));

      // Act & Assert
      await expect(service.compose(request)).rejects.toThrow();
    });

    it('should handle very long actorId', async () => {
      // Arrange
      const longId = 'actor-'.repeat(1000);
      const request: UIComposeRequest = {
        actorId: longId,
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle very long contextType', async () => {
      // Arrange
      const longType = 'CONTEXT_'.repeat(100);
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: longType,
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);

      // Act & Assert
      await expect(service.compose(request)).rejects.toThrow();
    });
  });

  // =============================================================================
  // Special Characters in Actor IDs Tests
  // =============================================================================

  describe('special characters in actor IDs', () => {
    it('should handle email-like actor ID', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'user@example.com',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle actor ID with plus sign', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'user+tag@example.com',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle actor ID with hyphen and underscore', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor_123-test',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle UUID format actor ID', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: '550e8400-e29b-41d4-a716-446655440000',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Concurrent Requests Tests
  // =============================================================================

  describe('concurrent requests', () => {
    it('should handle multiple concurrent compose requests', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      const requests: UIComposeRequest[] = [
        { actorId: 'actor-1', contextType: 'MOVE_BOOKING', contextId: 'instance-123' },
        { actorId: 'actor-2', contextType: 'MOVE_BOOKING', contextId: 'instance-123' },
        { actorId: 'actor-3', contextType: 'MOVE_BOOKING', contextId: 'instance-123' },
      ];

      // Act
      const results = await Promise.all(requests.map((req) => service.compose(req)));

      // Assert
      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.screen).toBeDefined();
      });
    });

    it('should handle rapid sequential requests', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act & Assert - Make 10 rapid sequential requests
      for (let i = 0; i < 10; i++) {
        const result = await service.compose(request);
        expect(result).toBeDefined();
      }
    });
  });

  // =============================================================================
  // State Transitions During Composition Tests
  // =============================================================================

  describe('state transitions during composition', () => {
    it('should use state at beginning of composition', async () => {
      // Arrange - Simulate state changing during composition
      let callCount = 0;
      const mockProcessInstance = createMockProcessInstance();

      mockWorkflowEngine.getProcessState.mockImplementation(() => {
        callCount++;
        // Return different states on subsequent calls
        if (callCount === 1) {
          return Promise.resolve({ ...mockProcessInstance, currentState: ProcessState.DRAFT });
        }
        return Promise.resolve({ ...mockProcessInstance, currentState: ProcessState.COMPLETED });
      });
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert - Should use the state from first call
      expect(result).toBeDefined();
      expect(result.metadata.currentState).toBe(ProcessState.DRAFT);
    });

    it('should handle process instance with transition history', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.history = [
        {
          transitionId: 't1',
          fromState: 'draft',
          toState: 'estimate_requested',
          eventType: 'QUOTE_REQUESTED',
          eventId: 'e1',
          triggeredBy: 'actor-123',
          contextSnapshot: {},
          timestamp: new Date(),
        },
        {
          transitionId: 't2',
          fromState: 'estimate_requested',
          toState: 'options_presented',
          eventType: 'QUOTE_RECEIVED',
          eventId: 'e2',
          triggeredBy: 'system',
          contextSnapshot: {},
          timestamp: new Date(),
        },
      ];
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.currentState).toBe(ProcessState.DRIVER_ASSIGNED);
    });
  });

  // =============================================================================
  // Orphaned Process Instances Tests
  // =============================================================================

  describe('orphaned process instances', () => {
    it('should handle process with no related entities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.relatedEntities = [];
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.components).toBeDefined();
    });

    it('should handle process with empty context', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.context = {};
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle process with missing optional fields', async () => {
      // Arrange - Create process instance with minimal required fields
      const mockProcessInstance = new ProcessInstanceEntity();
      mockProcessInstance.instanceId = 'instance-123';
      mockProcessInstance.definitionId = 'move-booking-process';
      mockProcessInstance.currentState = ProcessState.DRIVER_ASSIGNED;
      mockProcessInstance.status = ProcessInstanceStatus.ACTIVE;
      mockProcessInstance.context = {};
      mockProcessInstance.relatedEntities = [];
      mockProcessInstance.triggeredBy = 'system';
      mockProcessInstance.transitionCount = 0;
      mockProcessInstance.history = [];
      mockProcessInstance.createdAt = new Date();
      mockProcessInstance.updatedAt = new Date();
      // name is optional

      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Various Process Statuses Tests
  // =============================================================================

  describe('various process statuses', () => {
    it('should handle active process', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        status: ProcessInstanceStatus.ACTIVE,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.status).toBe(ProcessInstanceStatus.ACTIVE);
    });

    it('should handle suspended process', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        status: ProcessInstanceStatus.SUSPENDED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.status).toBe(ProcessInstanceStatus.SUSPENDED);
    });

    it('should handle completed process', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        status: ProcessInstanceStatus.COMPLETED,
        currentState: ProcessState.COMPLETED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.status).toBe(ProcessInstanceStatus.COMPLETED);
    });

    it('should handle cancelled process', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        status: ProcessInstanceStatus.CANCELLED,
        currentState: ProcessState.CANCELLED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.status).toBe(ProcessInstanceStatus.CANCELLED);
    });
  });
});
