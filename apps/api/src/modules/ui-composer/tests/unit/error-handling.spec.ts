import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { UIComposerService } from '../../services/ui-composer.service';
import { ComponentRegistryService } from '../../services/component-registry.service';
import { MoveBookingStateRenderer } from '../../strategies/move-booking-renderer';
import { CapabilityAccessController } from '../../../capability/services/capability-access.controller';
import { WorkflowEngineService } from '../../../workflow/services/workflow-engine.service';
import { ProcessInstanceEntity, ProcessInstanceStatus } from '../../../workflow/entities/process-instance.entity';
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
function createMockProcessInstance(): ProcessInstanceEntity {
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
    items: [
      { id: 'item-1', name: 'Sofa', quantity: 1 },
    ],
  };
  instance.relatedEntities = [];
  instance.triggeredBy = 'system';
  instance.transitionCount = 0;
  instance.history = [];
  instance.createdAt = new Date();
  instance.updatedAt = new Date();

  return instance;
}

describe('Error Handling', () => {
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
  // WorkflowEngine Failure Tests
  // =============================================================================

  describe('WorkflowEngine failures', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should throw NotFoundException when process instance not found', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new NotFoundException('Process instance not found: instance-123')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when workflow engine is down', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new ServiceUnavailableException('Workflow engine unavailable')
      );

      // Act & Assert - Service converts all errors to NotFoundException
      await expect(service.compose(mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('should handle generic workflow engine errors', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });

    it('should handle timeout from workflow engine', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new Error('Request timeout after 30000ms')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });

    it('should handle empty response from workflow engine', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockResolvedValue(null);

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });
  });

  // =============================================================================
  // CapabilityAccessController Failure Tests
  // =============================================================================

  describe('CapabilityAccessController failures', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle capability service unavailable', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockRejectedValue(
        new ServiceUnavailableException('Capability service unavailable')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle capability lookup timeout', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockRejectedValue(
        new Error('Capability lookup timeout')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });

    it('should handle database error during capability lookup', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockRejectedValue(
        new Error('PostgreSQL connection error')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });
  });

  // =============================================================================
  // Invalid Input Tests
  // =============================================================================

  describe('invalid input handling', () => {
    it('should throw error for invalid context type', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: '',
        contextId: 'instance-123',
      };

      // Act & Assert
      await expect(service.compose(request)).rejects.toThrow();
    });

    it('should throw error for invalid contextId', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: '',
      };

      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new NotFoundException('Process instance not found')
      );

      // Act & Assert
      await expect(service.compose(request)).rejects.toThrow();
    });

    it('should handle undefined actorId', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: undefined as any,
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert - should still work but with empty capabilities
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Missing Data Tests
  // =============================================================================

  describe('missing data handling', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle process instance with empty context', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.context = {}; // Empty context
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.components).toBeDefined();
    });

    it('should handle process instance with undefined context', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.context = undefined as any;
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle process instance with null context', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.context = null as any;
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle process instance with missing currentState', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.currentState = undefined as any;
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act - Service handles missing currentState gracefully
      const result = await service.compose(mockRequest);

      // Assert - Service returns a response with undefined state
      expect(result).toBeDefined();
      expect(result.metadata.currentState).toBeUndefined();
    });

    it('should handle process instance with missing status', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.status = undefined as any;
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Timeout Handling Tests
  // =============================================================================

  describe('timeout handling', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle workflow engine timeout', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    }, 10000);

    it('should handle capability controller timeout', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    }, 10000);
  });

  // =============================================================================
  // Malformed Data Handling Tests
  // =============================================================================

  describe('malformed data handling', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle process instance with malformed context', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.context = 'invalid' as any; // String instead of object
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act - Service handles malformed context gracefully
      const result = await service.compose(mockRequest);

      // Assert - Service returns a response
      expect(result).toBeDefined();
    });

    it('should handle process instance with circular reference in context', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      const circular: any = { value: 'test' };
      circular.self = circular; // Circular reference
      mockProcessInstance.context = { circular };
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle very large context data', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      // Create large context
      mockProcessInstance.context = {
        largeData: 'x'.repeat(1000000), // 1MB string
      };
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle special characters in actor ID', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor<script>alert(1)</script>',
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

    it('should handle unicode characters in context', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.context = {
        pickupAddress: '123 📍 Street 🎉',
        dropoffAddress: '456 🏠 Avenue ©',
      };
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Fallback Behavior Tests
  // =============================================================================

  describe('fallback behavior', () => {
    it('should handle unknown state with default components', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockProcessInstance.currentState = 'unknown_state' as any;
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.screen).toContain('move-booking');
    });

    it('should return valid response even with empty capabilities', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
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
      expect(result.screen).toBeDefined();
      expect(result.components).toBeDefined();
      expect(result.actions).toBeDefined();
      // All actions should be disabled
      result.actions.forEach((action) => {
        expect(action.disabled).toBe(true);
      });
    });
  });

  // =============================================================================
  // Renderer Error Tests
  // =============================================================================

  describe('renderer errors', () => {
    it('should handle renderer throwing error', async () => {
      // Register a failing renderer by extending and overriding
      const failingRenderer = Object.assign(
        new MoveBookingStateRenderer(new ComponentRegistryService()),
        {
          renderComponents: (_state: string, _context: Record<string, unknown>) => {
            throw new Error('Renderer component error');
          },
        }
      );
      
      service.registerRenderer(failingRenderer);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act & Assert
      await expect(service.compose(request)).rejects.toThrow('Renderer component error');
    });

    it('should handle renderer returning invalid components', async () => {
      // Register a renderer that returns invalid data
      const invalidRenderer = Object.assign(
        new MoveBookingStateRenderer(new ComponentRegistryService()),
        {
          renderComponents: (_state: string, _context: Record<string, unknown>) => {
            return null as any; // Invalid return
          },
        }
      );
      
      service.registerRenderer(invalidRenderer);

      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act & Assert
      await expect(service.compose(request)).rejects.toThrow();
    });
  });
});
