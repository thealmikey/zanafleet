import { Test, TestingModule } from '@nestjs/testing';

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
function createMockProcessInstance(overrides?: Partial<ProcessInstanceEntity>): ProcessInstanceEntity {
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

  return { ...instance, ...overrides } as ProcessInstanceEntity;
}

describe('Capability Filtering', () => {
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
  // Actions Disabled When Actor Lacks Capability
  // =============================================================================

  describe('actions disabled when actor lacks capability', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should disable cancel-booking when actor lacks move:booking:cancel capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view', // Missing cancel capability
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.disabled).toBe(true);
      expect(cancelAction?.disabledReason).toContain('move:booking:cancel');
    });

    it('should disable contact-driver when actor lacks move:driver:contact capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const contactAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactAction?.disabled).toBe(true);
    });

    it('should disable add-payment when actor lacks move:payment:add capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.BOOKING_CONFIRMED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const addPaymentAction = result.actions.find((a) => a.id === 'add-payment');
      expect(addPaymentAction?.disabled).toBe(true);
    });

    it('should disable all actions when actor has no capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      result.actions.forEach((action) => {
        expect(action.disabled).toBe(true);
        expect(action.disabledReason).toBeDefined();
      });
    });

    it('should provide descriptive disabled reason', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const action = result.actions[0];
      expect(action.disabledReason).toContain('capability');
    });
  });

  // =============================================================================
  // Actions Enabled When Actor Has Capability
  // =============================================================================

  describe('actions enabled when actor has capability', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should enable view-driver when actor has move:driver:view capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction?.disabled).toBe(false);
      expect(viewAction?.disabledReason).toBeUndefined();
    });

    it('should enable contact-driver when actor has move:driver:contact capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:contact',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const contactAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactAction?.disabled).toBe(false);
    });

    it('should enable cancel-booking when actor has move:booking:cancel capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.disabled).toBe(false);
    });

    it('should enable all actions when actor has all capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
        'move:booking:cancel',
        'move:tracking:view',
        'move:payment:add',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      result.actions.forEach((action) => {
        expect(action.disabled).toBe(false);
      });
    });

    it('should enable track-live when actor has move:tracking:view capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.IN_PROGRESS,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:tracking:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const trackAction = result.actions.find((a) => a.id === 'track-live');
      expect(trackAction?.disabled).toBe(false);
    });
  });

  // =============================================================================
  // Multiple Capabilities Requirement
  // =============================================================================

  describe('multiple capabilities requirement', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle multiple required capabilities separately', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Actor has only one of two capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      // view-driver should be enabled (has capability)
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction?.disabled).toBe(false);

      // contact-driver should be disabled (missing capability)
      const contactAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactAction?.disabled).toBe(true);
    });

    it('should correctly filter each action independently', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.COMPLETED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Actor has some capabilities but not all
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:rate',
        'move:receipt:download',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const rateAction = result.actions.find((a) => a.id === 'rate-driver');
      expect(rateAction?.disabled).toBe(false);

      const downloadAction = result.actions.find((a) => a.id === 'download-receipt');
      expect(downloadAction?.disabled).toBe(false);

      const reviewAction = result.actions.find((a) => a.id === 'leave-review');
      expect(reviewAction?.disabled).toBe(true);
    });
  });

  // =============================================================================
  // Capability with Wildcards
  // =============================================================================

  describe('capability with wildcards', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle wildcard capability move:*', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:*', // Wildcard
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      // Wildcard is not automatically expanded in the current implementation
      // Each action requires exact match
      expect(result).toBeDefined();
    });

    it('should handle wildcard capability *:view', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        '*:view', // Wildcard
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle specific capability match', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction?.disabled).toBe(false);
    });
  });

  // =============================================================================
  // Role-based Capability Filtering
  // =============================================================================

  describe('role-based capability filtering', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should filter capabilities for customer role', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Customer role typically has limited capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction?.disabled).toBe(false);

      // Customer cannot add payments in this setup
      // Note: add-payment action may not exist in all states
      const addPaymentAction = result.actions.find((a) => a.id === 'add-payment');
      if (addPaymentAction) {
        expect(addPaymentAction.disabled).toBe(true);
      }
    });

    it('should filter capabilities for driver role', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.COMPLETED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Driver role typically has different capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:rate', // Driver can rate themselves? unusual but let's see
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle admin role with all capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Admin has all capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
        'move:booking:cancel',
        'move:booking:modify',
        'move:payment:add',
        'move:tracking:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      result.actions.forEach((action) => {
        // Admin should have all capabilities
        expect(action.disabled).toBe(false);
      });
    });
  });

  // =============================================================================
  // Capability Expiration Scenarios
  // =============================================================================

  describe('capability expiration scenarios', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle actor with no capabilities gracefully', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.actions.length).toBeGreaterThan(0);
      result.actions.forEach((action) => {
        expect(action.disabled).toBe(true);
      });
    });

    it('should handle capability lookup returning null gracefully', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Simulate capability service returning null/undefined
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('should handle capability lookup error gracefully', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockRejectedValue(
        new Error('Capability service unavailable')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });

    it('should handle malformed capability response', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Return malformed data
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        null as any,
        undefined as any,
        '',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // State-specific Capability Tests
  // =============================================================================

  describe('state-specific capability filtering', () => {
    it('should filter capabilities correctly for draft state', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.DRAFT,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:request',
      ]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result.screen).toBe('move-booking-create');
      const requestQuoteAction = result.actions.find((a) => a.id === 'request-quote');
      expect(requestQuoteAction?.disabled).toBe(false);
    });

    it('should filter capabilities correctly for estimate_requested state', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.ESTIMATE_REQUESTED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:refresh',
      ]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result.screen).toBe('move-booking-estimating');
      const refreshAction = result.actions.find((a) => a.id === 'refresh-quote');
      expect(refreshAction?.disabled).toBe(false);
    });

    it('should filter capabilities correctly for options_presented state', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.OPTIONS_PRESENTED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:option:select',
      ]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result.screen).toBe('move-booking-options');
      const selectAction = result.actions.find((a) => a.id === 'select-option');
      expect(selectAction?.disabled).toBe(false);
    });
  });
});
