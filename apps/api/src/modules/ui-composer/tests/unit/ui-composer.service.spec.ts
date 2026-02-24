import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

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
 * Create a mock process instance with flexible state
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
    items: [
      { id: 'item-1', name: 'Sofa', quantity: 1 },
      { id: 'item-2', name: 'Table', quantity: 1 },
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

/**
 * Create process instance for specific state
 */
function createProcessInstanceForState(
  state: ProcessState,
  context: Record<string, unknown> = {}
): ProcessInstanceEntity {
  return createMockProcessInstance({
    currentState: state,
    context: {
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
        { id: 'item-2', name: 'Table', quantity: 1 },
      ],
      ...context,
    },
  });
}

describe('UIComposerService', () => {
  let service: UIComposerService;
  let componentRegistry: ComponentRegistryService;

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
    componentRegistry = module.get<ComponentRegistryService>(ComponentRegistryService);

    // Register the MoveBooking renderer
    const renderer = module.get<MoveBookingStateRenderer>(MoveBookingStateRenderer);
    service.registerRenderer(renderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Happy Path Tests - Valid Requests
  // =============================================================================

  describe('compose - Valid Requests', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should compose UI response successfully', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:request',
        'move:driver:view',
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.screen).toBe('move-booking-driver-assigned');
      expect(result.components).toBeDefined();
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.actions).toBeDefined();
      expect(result.metadata.currentState).toBe(ProcessState.DRIVER_ASSIGNED);
    });

    it('should include correct metadata in response', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        instanceId: 'test-instance-id',
        definitionId: 'test-definition-id',
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.metadata).toBeDefined();
      expect(result.metadata.contextId).toBe('test-instance-id');
      expect(result.metadata.definitionId).toBe('test-definition-id');
      expect(result.metadata.currentState).toBe(ProcessState.DRIVER_ASSIGNED);
      expect(result.metadata.status).toBe(ProcessInstanceStatus.ACTIVE);
    });

    it('should return components with correct types', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.components.length).toBeGreaterThan(0);
      result.components.forEach((component) => {
        expect(component.type).toBeDefined();
        expect(component.props).toBeDefined();
      });
    });

    it('should return actions with correct structure', async () => {
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
      expect(result.actions.length).toBeGreaterThan(0);
      result.actions.forEach((action) => {
        expect(action.id).toBeDefined();
        expect(action.label).toBeDefined();
        expect(action.capability).toBeDefined();
        expect(action.disabled).toBeDefined();
      });
    });
  });

  // =============================================================================
  // Invalid Context Type Tests
  // =============================================================================

  describe('compose - Invalid Context Type', () => {
    it('should throw NotFoundException when renderer not found', async () => {
      // Arrange
      const requestWithUnknownContext: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'UNKNOWN_CONTEXT',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);

      // Act & Assert
      await expect(service.compose(requestWithUnknownContext)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with specific message for unknown context', async () => {
      // Arrange
      const requestWithUnknownContext: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'INVALID_TYPE',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);

      // Act & Assert
      await expect(service.compose(requestWithUnknownContext)).rejects.toThrow(
        'No renderer found for context type: INVALID_TYPE'
      );
    });
  });

  // =============================================================================
  // Non-existent Process Instance Tests
  // =============================================================================

  describe('compose - Non-existent Process Instance', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'non-existent-id',
    };

    it('should throw NotFoundException when process not found', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new NotFoundException('Process instance not found')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with contextId in message', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new NotFoundException(`Process instance not found: ${mockRequest.contextId}`)
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow(mockRequest.contextId);
    });

    it('should handle workflow engine errors gracefully', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });
  });

  // =============================================================================
  // Workflow State Tests
  // =============================================================================

  describe('compose - Various Workflow States', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should compose UI for DRAFT state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.DRAFT);
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:request',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-create');
      expect(result.metadata.currentState).toBe(ProcessState.DRAFT);
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should compose UI for ESTIMATE_REQUESTED state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.ESTIMATE_REQUESTED);
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:refresh',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-estimating');
      expect(result.metadata.currentState).toBe(ProcessState.ESTIMATE_REQUESTED);
    });

    it('should compose UI for OPTIONS_PRESENTED state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.OPTIONS_PRESENTED, {
        quoteOptions: [
          { id: 'option-1', price: 100 },
          { id: 'option-2', price: 150 },
        ],
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:option:select',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-options');
      expect(result.metadata.currentState).toBe(ProcessState.OPTIONS_PRESENTED);
    });

    it('should compose UI for BOOKING_CONFIRMED state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.BOOKING_CONFIRMED);
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:payment:add',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-confirmed');
      expect(result.metadata.currentState).toBe(ProcessState.BOOKING_CONFIRMED);
    });

    it('should compose UI for DRIVER_ASSIGNED state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.DRIVER_ASSIGNED);
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-driver-assigned');
      expect(result.metadata.currentState).toBe(ProcessState.DRIVER_ASSIGNED);
    });

    it('should compose UI for IN_PROGRESS state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.IN_PROGRESS);
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:tracking:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-active');
      expect(result.metadata.currentState).toBe(ProcessState.IN_PROGRESS);
    });

    it('should compose UI for COMPLETED state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.COMPLETED, {
        completedAt: '2024-01-15T12:00:00Z',
        totalPrice: 200,
        paymentMethod: 'card',
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:rate',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-completed');
      expect(result.metadata.currentState).toBe(ProcessState.COMPLETED);
    });

    it('should compose UI for CANCELLED state', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.CANCELLED, {
        cancelledAt: '2024-01-15T11:00:00Z',
        cancellationReason: 'User requested cancellation',
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      expect(result.screen).toBe('move-booking-cancelled');
      expect(result.metadata.currentState).toBe(ProcessState.CANCELLED);
    });
  });

  // =============================================================================
  // Actor Capability Tests
  // =============================================================================

  describe('compose - Actor Capabilities', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should filter actions by capability - actor has all capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Actor has all needed capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
        'move:booking:cancel',
        'move:tracking:view',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.disabled).toBe(false);
      expect(cancelAction?.disabledReason).toBeUndefined();

      const contactAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactAction?.disabled).toBe(false);
    });

    it('should filter actions by capability - actor missing capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Actor only has limited capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view', // Only has view capability
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction).toBeDefined();
      expect(cancelAction?.disabled).toBe(true);
      expect(cancelAction?.disabledReason).toContain('move:booking:cancel');

      const contactAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactAction?.disabled).toBe(true);
    });

    it('should enable actions when actor has capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      // Actor has all needed capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction).toBeDefined();
      expect(viewAction?.disabled).toBe(false);
      expect(viewAction?.disabledReason).toBeUndefined();
    });

    it('should handle actor with empty capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      // All actions should be disabled
      result.actions.forEach((action) => {
        expect(action.disabled).toBe(true);
        expect(action.disabledReason).toBeDefined();
      });
    });

    it('should handle actor with wildcard capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:*', // Wildcard capability
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert - wildcards are not automatically expanded
      // The filtering is exact match based
      expect(result).toBeDefined();
    });
  });

  // =============================================================================
  // Consent Requirement Tests
  // =============================================================================

  describe('compose - Consent Requirements', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should mark action as requiring consent for cancel capability', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:booking:cancel',
        'move:driver:contact',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.requiresConsent).toBe(true);
    });

    it('should mark action as not requiring consent for view capability', async () => {
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
      expect(viewAction?.requiresConsent).toBeUndefined();
    });

    it('should mark contact-driver action as requiring consent', async () => {
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
      expect(contactAction?.requiresConsent).toBe(true);
    });

    it('should mark add-payment action as requiring consent', async () => {
      // Arrange
      const mockProcessInstance = createProcessInstanceForState(ProcessState.BOOKING_CONFIRMED);
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:payment:add',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const addPaymentAction = result.actions.find((a) => a.id === 'add-payment');
      expect(addPaymentAction?.requiresConsent).toBe(true);
    });
  });

  // =============================================================================
  // Multiple Context Types Tests
  // =============================================================================

  describe('compose - Multiple Context Types', () => {
    it('should handle different context types', async () => {
      // This test verifies that the system can handle multiple registered context types
      // MOVE_BOOKING is registered by default

      // Verify MOVE_BOOKING works
      const mockRequest: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      const result = await service.compose(mockRequest);
      expect(result).toBeDefined();
      expect(result.screen).toContain('move-booking');
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('compose - Error Handling', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle WorkflowEngine failure gracefully', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new Error('Workflow engine unavailable')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });

    it('should handle CapabilityAccessController failure gracefully', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockRejectedValue(
        new Error('Capability service unavailable')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow();
    });

    it('should handle renderer errors with fallback', async () => {
      // Register a custom renderer that throws
      const failingRenderer = {
        contextType: 'FAILING_RENDERER',
        renderComponents: jest.fn().mockImplementation(() => {
          throw new Error('Renderer failed');
        }),
        renderActions: jest.fn().mockImplementation(() => {
          throw new Error('Renderer failed');
        }),
        getScreenConfig: jest.fn().mockReturnValue({
          screen: 'fallback',
          title: 'Fallback Screen',
        }),
      } as unknown as MoveBookingStateRenderer;

      service.registerRenderer(failingRenderer);

      const failingRequest: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'FAILING_RENDERER',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act & Assert
      await expect(service.compose(failingRequest)).rejects.toThrow();
    });
  });

  // =============================================================================
  // Renderer Registration Tests
  // =============================================================================

  describe('registerRenderer', () => {
    it('should register a renderer', () => {
      // Arrange
      const renderer = new MoveBookingStateRenderer(componentRegistry);

      // Act
      service.registerRenderer(renderer);

      // Assert
      expect(service.hasRenderer('MOVE_BOOKING')).toBe(true);
    });

    it('should allow overriding existing renderer', () => {
      // Arrange
      const renderer1 = new MoveBookingStateRenderer(componentRegistry);
      const renderer2 = new MoveBookingStateRenderer(componentRegistry);

      // Act
      service.registerRenderer(renderer1);
      service.registerRenderer(renderer2); // Override

      // Assert
      expect(service.hasRenderer('MOVE_BOOKING')).toBe(true);
    });

    it('should register multiple different renderers', () => {
      // Act
      service.registerRenderer(new MoveBookingStateRenderer(componentRegistry));

      // Assert - MOVE_BOOKING should be registered
      expect(service.hasRenderer('MOVE_BOOKING')).toBe(true);
    });
  });

  describe('hasRenderer', () => {
    it('should return true for registered renderer', () => {
      expect(service.hasRenderer('MOVE_BOOKING')).toBe(true);
    });

    it('should return false for unregistered renderer', () => {
      expect(service.hasRenderer('UNKNOWN')).toBe(false);
    });

    it('should return false for null/undefined context type', () => {
      // This tests edge case handling
      expect(service.hasRenderer('')).toBe(false);
    });
  });

  describe('getRenderers', () => {
    it('should return all registered renderers', () => {
      const renderers = service.getRenderers();
      expect(renderers.size).toBeGreaterThan(0);
      expect(renderers.has('MOVE_BOOKING')).toBe(true);
    });

    it('should return a copy of renderers map', () => {
      const renderers1 = service.getRenderers();
      const renderers2 = service.getRenderers();
      expect(renderers1).not.toBe(renderers2);
    });
  });
});

// =============================================================================
// ComponentRegistryService Tests
// =============================================================================

describe('ComponentRegistryService', () => {
  let service: ComponentRegistryService;

  beforeEach(() => {
    service = new ComponentRegistryService();
  });

  describe('getComponent', () => {
    it('should return registered component - DriverCard', () => {
      const component = service.getComponent('DriverCard');
      expect(component).toBeDefined();
      expect(component?.type).toBe('DriverCard');
      expect(component?.displayName).toBe('Driver Card');
    });

    it('should return registered component - LiveMap', () => {
      const component = service.getComponent('LiveMap');
      expect(component).toBeDefined();
      expect(component?.type).toBe('LiveMap');
      expect(component?.displayName).toBe('Live Map');
    });

    it('should return registered component - BookingSummary', () => {
      const component = service.getComponent('BookingSummary');
      expect(component).toBeDefined();
      expect(component?.type).toBe('BookingSummary');
    });

    it('should return registered component - StatusTimeline', () => {
      const component = service.getComponent('StatusTimeline');
      expect(component).toBeDefined();
      expect(component?.type).toBe('StatusTimeline');
    });

    it('should return undefined for unknown component', () => {
      const component = service.getComponent('UnknownComponent');
      expect(component).toBeUndefined();
    });

    it('should return undefined for empty type', () => {
      const component = service.getComponent('');
      expect(component).toBeUndefined();
    });
  });

  describe('hasComponent', () => {
    it('should return true for registered component', () => {
      expect(service.hasComponent('LiveMap')).toBe(true);
      expect(service.hasComponent('DriverCard')).toBe(true);
      expect(service.hasComponent('BookingSummary')).toBe(true);
    });

    it('should return false for unregistered component', () => {
      expect(service.hasComponent('UnknownComponent')).toBe(false);
    });

    it('should return false for empty type', () => {
      expect(service.hasComponent('')).toBe(false);
    });
  });

  describe('getAllComponents', () => {
    it('should return all registered components', () => {
      const components = service.getAllComponents();
      expect(components.length).toBeGreaterThan(28); // 29 component types
    });

    it('should return array of ComponentDefinition', () => {
      const components = service.getAllComponents();
      components.forEach((component) => {
        expect(component.type).toBeDefined();
        expect(component.displayName).toBeDefined();
      });
    });
  });

  describe('registerComponent', () => {
    it('should register a new component', () => {
      // Arrange
      const newComponent = {
        type: 'CustomComponent',
        displayName: 'Custom Component',
        description: 'A custom component',
        defaultProps: { customProp: 'value' },
      };

      // Act
      service.register(newComponent);

      // Assert
      expect(service.hasComponent('CustomComponent')).toBe(true);
      expect(service.getComponent('CustomComponent')?.displayName).toBe('Custom Component');
    });

    it('should allow overriding existing component', () => {
      // Arrange
      const overrideComponent = {
        type: 'DriverCard',
        displayName: 'Overridden Driver Card',
      };

      // Act
      service.register(overrideComponent);

      // Assert
      expect(service.getComponent('DriverCard')?.displayName).toBe('Overridden Driver Card');
    });
  });

  describe('createComponent', () => {
    it('should create component with default props', () => {
      const component = service.createComponent('DriverCard', {
        driverName: 'John Doe',
      });

      expect(component.type).toBe('DriverCard');
      expect(component.props.driverName).toBe('John Doe');
      expect(component.props.showRating).toBe(true); // Default prop
    });

    it('should merge custom props with default props', () => {
      const component = service.createComponent(
        'LiveMap',
        { showRoute: false },
        { layout: { colSpan: 6 } }
      );

      expect(component.props.showRoute).toBe(false); // Custom prop
      expect(component.props.autoRefresh).toBe(true); // Default prop
      expect(component.layout?.colSpan).toBe(6);
    });

    it('should handle unknown component type gracefully', () => {
      const component = service.createComponent('UnknownType', { customProp: 'value' });

      expect(component.type).toBe('UnknownType');
      expect(component.props.customProp).toBe('value');
    });

    it('should apply layout overrides', () => {
      const component = service.createComponent(
        'DriverCard',
        {},
        { layout: { colSpan: 6, order: 1 } }
      );

      expect(component.layout?.colSpan).toBe(6);
      expect(component.layout?.order).toBe(1);
    });
  });

  describe('createComponents', () => {
    it('should create multiple components', () => {
      const specs = [
        { type: 'DriverCard', props: { driverName: 'John' } },
        { type: 'LiveMap', props: { showRoute: true } },
        { type: 'BookingSummary', props: { bookingId: '123' } },
      ];

      const components = service.createComponents(specs);

      expect(components.length).toBe(3);
      expect(components[0].type).toBe('DriverCard');
      expect(components[1].type).toBe('LiveMap');
      expect(components[2].type).toBe('BookingSummary');
    });

    it('should handle empty specs array', () => {
      const components = service.createComponents([]);
      expect(components.length).toBe(0);
    });
  });

  describe('getComponentsByCategory', () => {
    it('should return components by category - driver', () => {
      const driverComponents = service.getComponentsByCategory('driver');
      expect(driverComponents.length).toBeGreaterThan(0);
      expect(driverComponents.every((c) => c.type.toLowerCase().startsWith('driver'))).toBe(true);
    });

    it('should return components by category - payment', () => {
      const paymentComponents = service.getComponentsByCategory('payment');
      expect(paymentComponents.length).toBeGreaterThan(0);
    });

    it('should return components by category - booking', () => {
      const bookingComponents = service.getComponentsByCategory('booking');
      expect(bookingComponents.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown category', () => {
      const unknownComponents = service.getComponentsByCategory('unknown');
      expect(unknownComponents.length).toBe(0);
    });
  });
});

// =============================================================================
// MoveBookingStateRenderer Tests
// =============================================================================

describe('MoveBookingStateRenderer', () => {
  let renderer: MoveBookingStateRenderer;
  let componentRegistry: ComponentRegistryService;

  beforeEach(() => {
    componentRegistry = new ComponentRegistryService();
    renderer = new MoveBookingStateRenderer(componentRegistry);
  });

  describe('contextType', () => {
    it('should return MOVE_BOOKING as context type', () => {
      expect(renderer.contextType).toBe('MOVE_BOOKING');
    });
  });

  describe('renderComponents', () => {
    it('should render components for driver_assigned state', () => {
      const context = {
        driverId: 'driver-123',
        driverName: 'John Doe',
        pickupAddress: '123 Pickup St',
        dropoffAddress: '456 Dropoff Ave',
      };

      const components = renderer.renderComponents('driver_assigned', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'DriverCard')).toBe(true);
      expect(components.some((c) => c.type === 'LiveMap')).toBe(true);
    });

    it('should render components for completed state', () => {
      const context = {
        bookingId: 'booking-123',
        completedAt: '2024-01-15T12:00:00Z',
      };

      const components = renderer.renderComponents('completed', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'StatusTimeline')).toBe(true);
      expect(components.some((c) => c.type === 'RatingInput')).toBe(true);
    });

    it('should render components for draft state', () => {
      const context = {
        items: [],
        pickupAddress: '123 Pickup St',
        dropoffAddress: '456 Dropoff Ave',
      };

      const components = renderer.renderComponents('draft', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'BookingDetails')).toBe(true);
      expect(components.some((c) => c.type === 'ItemList')).toBe(true);
    });

    it('should render components for estimate_requested state', () => {
      const context = {
        quoteExpiryTime: '2024-01-15T14:00:00Z',
      };

      const components = renderer.renderComponents('estimate_requested', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'BookingSummary')).toBe(true);
      expect(components.some((c) => c.type === 'ProgressBar')).toBe(true);
    });

    it('should render components for options_presented state', () => {
      const context = {
        quoteOptions: [
          { id: 'option-1', price: 100 },
          { id: 'option-2', price: 150 },
        ],
      };

      const components = renderer.renderComponents('options_presented', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'QuoteCard')).toBe(true);
    });

    it('should render components for booking_confirmed state', () => {
      const context = {
        bookingId: 'booking-123',
        totalPrice: 200,
      };

      const components = renderer.renderComponents('booking_confirmed', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'BookingSummary')).toBe(true);
      expect(components.some((c) => c.type === 'PaymentSummary')).toBe(true);
    });

    it('should render components for in_progress state', () => {
      const context = {
        driverId: 'driver-123',
        currentState: 'in_progress',
      };

      const components = renderer.renderComponents('in_progress', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'LiveMap')).toBe(true);
      expect(components.some((c) => c.type === 'StatusTimeline')).toBe(true);
    });

    it('should render components for cancelled state', () => {
      const context = {
        bookingId: 'booking-123',
        cancellationReason: 'User requested',
      };

      const components = renderer.renderComponents('cancelled', context);

      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.type === 'StatusBadge')).toBe(true);
      expect(components.some((c) => c.type === 'BookingSummary')).toBe(true);
    });

    it('should handle unknown state with default components', () => {
      const context = { bookingId: 'booking-123' };

      const components = renderer.renderComponents('unknown_state', context);

      expect(components.length).toBeGreaterThan(0);
    });
  });

  describe('renderActions', () => {
    it('should render actions for driver_assigned state', () => {
      const context = {
        driverId: 'driver-123',
      };

      const actions = renderer.renderActions('driver_assigned', context);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'contact-driver')).toBe(true);
      expect(actions.some((a) => a.id === 'cancel-booking')).toBe(true);
    });

    it('should render actions for completed state', () => {
      const context = {
        bookingId: 'booking-123',
      };

      const actions = renderer.renderActions('completed', context);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'rate-driver')).toBe(true);
      expect(actions.some((a) => a.id === 'book-again')).toBe(true);
    });

    it('should render actions for draft state', () => {
      const context = {};

      const actions = renderer.renderActions('draft', context);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'request-quote')).toBe(true);
    });

    it('should render actions for in_progress state', () => {
      const context = {};

      const actions = renderer.renderActions('in_progress', context);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'track-live')).toBe(true);
      expect(actions.some((a) => a.id === 'report-issue')).toBe(true);
    });

    it('should render actions for estimate_requested state', () => {
      const context = {};

      const actions = renderer.renderActions('estimate_requested', context);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'refresh-quote')).toBe(true);
    });

    it('should render actions for options_presented state', () => {
      const context = {};

      const actions = renderer.renderActions('options_presented', context);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'select-option')).toBe(true);
    });

    it('should render actions for booking_confirmed state', () => {
      const context = {};

      const actions = renderer.renderActions('booking_confirmed', context);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'add-payment')).toBe(true);
      expect(actions.some((a) => a.id === 'cancel-booking')).toBe(true);
    });
  });

  describe('getScreenConfig', () => {
    it('should return correct screen config for driver_assigned state', () => {
      const config = renderer.getScreenConfig('driver_assigned');

      expect(config.screen).toBe('move-booking-driver-assigned');
      expect(config.title).toBe('Driver Assigned');
      expect(config.breadcrumbs).toBeDefined();
      expect(config.breadcrumbs?.length).toBeGreaterThan(0);
    });

    it('should return correct screen config for completed state', () => {
      const config = renderer.getScreenConfig('completed');

      expect(config.screen).toBe('move-booking-completed');
      expect(config.title).toBe('Move Completed');
    });

    it('should return correct screen config for draft state', () => {
      const config = renderer.getScreenConfig('draft');

      expect(config.screen).toBe('move-booking-create');
      expect(config.title).toBe('Create Move Booking');
    });

    it('should return correct screen config for estimate_requested state', () => {
      const config = renderer.getScreenConfig('estimate_requested');

      expect(config.screen).toBe('move-booking-estimating');
      expect(config.title).toBe('Getting Quote');
    });

    it('should return correct screen config for options_presented state', () => {
      const config = renderer.getScreenConfig('options_presented');

      expect(config.screen).toBe('move-booking-options');
      expect(config.title).toBe('Choose Your Option');
    });

    it('should return correct screen config for booking_confirmed state', () => {
      const config = renderer.getScreenConfig('booking_confirmed');

      expect(config.screen).toBe('move-booking-confirmed');
      expect(config.title).toBe('Booking Confirmed');
    });

    it('should return correct screen config for in_progress state', () => {
      const config = renderer.getScreenConfig('in_progress');

      expect(config.screen).toBe('move-booking-active');
      expect(config.title).toBe('Move In Progress');
    });

    it('should return correct screen config for cancelled state', () => {
      const config = renderer.getScreenConfig('cancelled');

      expect(config.screen).toBe('move-booking-cancelled');
      expect(config.title).toBe('Booking Cancelled');
    });

    it('should return default config for unknown state', () => {
      const config = renderer.getScreenConfig('unknown_state');

      expect(config.screen).toBe('move-booking-unknown');
      expect(config.title).toBe('Booking');
    });

    it('should include breadcrumbs in config', () => {
      const config = renderer.getScreenConfig('driver_assigned');

      expect(config.breadcrumbs).toBeDefined();
      expect(config.breadcrumbs?.length).toBeGreaterThan(0);
      expect(config.breadcrumbs?.[0].label).toBeDefined();
    });
  });
});
