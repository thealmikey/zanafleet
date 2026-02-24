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

describe('UIComposer Integration Tests', () => {
  let service: UIComposerService;
  let componentRegistry: ComponentRegistryService;
  let capabilityController: CapabilityAccessController;
  let workflowEngine: WorkflowEngineService;

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
    capabilityController = module.get<CapabilityAccessController>(CapabilityAccessController);
    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);

    // Register the MoveBooking renderer
    const renderer = module.get<MoveBookingStateRenderer>(MoveBookingStateRenderer);
    service.registerRenderer(renderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // End-to-End Composition Flow Tests
  // =============================================================================

  describe('end-to-end composition flow', () => {
    it('should compose full UI response', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(request);

      // Assert - Full response verification
      expect(result.screen).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.contextId).toBe('instance-123');
      expect(result.metadata.definitionId).toBe('move-booking-process');
      expect(result.metadata.currentState).toBe(ProcessState.DRIVER_ASSIGNED);
      expect(result.components).toBeDefined();
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('should integrate with WorkflowEngine correctly', async () => {
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
      await service.compose(request);

      // Assert - Verify WorkflowEngine was called correctly
      expect(mockWorkflowEngine.getProcessState).toHaveBeenCalledWith('instance-123');
    });

    it('should integrate with CapabilityAccessController correctly', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
      ]);

      // Act
      await service.compose(request);

      // Assert - Verify CapabilityAccessController was called correctly
      expect(mockCapabilityAccessController.getCapabilitiesForActor).toHaveBeenCalledWith(
        'actor-123'
      );
    });

    it('should correctly map process state to screen', async () => {
      // Test all major states
      const stateToScreen: Record<string, string> = {
        draft: 'move-booking-create',
        estimate_requested: 'move-booking-estimating',
        options_presented: 'move-booking-options',
        booking_confirmed: 'move-booking-confirmed',
        driver_assigned: 'move-booking-driver-assigned',
        in_progress: 'move-booking-active',
        completed: 'move-booking-completed',
        cancelled: 'move-booking-cancelled',
      };

      for (const [state, expectedScreen] of Object.entries(stateToScreen)) {
        // Arrange
        const request: UIComposeRequest = {
          actorId: 'actor-123',
          contextType: 'MOVE_BOOKING',
          contextId: 'instance-123',
        };

        const mockProcessInstance = createMockProcessInstance({
          currentState: state as ProcessState,
        });
        mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
        mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

        // Act
        const result = await service.compose(request);

        // Assert
        expect(result.screen).toBe(expectedScreen);
      }
    });
  });

  // =============================================================================
  // Module Dependencies Tests
  // =============================================================================

  describe('module imports and dependencies', () => {
    it('should have UIComposerService properly instantiated', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(UIComposerService);
    });

    it('should have ComponentRegistryService properly instantiated', () => {
      expect(componentRegistry).toBeDefined();
      expect(componentRegistry).toBeInstanceOf(ComponentRegistryService);
    });

    it('should have MoveBookingStateRenderer registered', () => {
      expect(service.hasRenderer('MOVE_BOOKING')).toBe(true);
    });

    it('should have access to WorkflowEngine', () => {
      expect(workflowEngine).toBeDefined();
    });

    it('should have access to CapabilityAccessController', () => {
      expect(capabilityController).toBeDefined();
    });

    it('should have ComponentRegistry with 29+ components', () => {
      const components = componentRegistry.getAllComponents();
      expect(components.length).toBeGreaterThanOrEqual(29);
    });
  });

  // =============================================================================
  // Full Workflow Tests
  // =============================================================================

  describe('full workflow from draft to completion', () => {
    const actorId = 'actor-123';
    const contextId = 'instance-123';

    it('should handle complete booking workflow', async () => {
      // Simulate a complete workflow from DRAFT to COMPLETED

      // 1. DRAFT state
      let mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.DRAFT,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:request',
        'move:draft:save',
      ]);

      let result = await service.compose({
        actorId,
        contextType: 'MOVE_BOOKING',
        contextId,
      });

      expect(result.screen).toBe('move-booking-create');
      expect(result.actions.some((a) => a.id === 'request-quote')).toBe(true);

      // 2. ESTIMATE_REQUESTED state
      mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.ESTIMATE_REQUESTED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:refresh',
        'move:quote:cancel',
      ]);

      result = await service.compose({
        actorId,
        contextType: 'MOVE_BOOKING',
        contextId,
      });

      expect(result.screen).toBe('move-booking-estimating');

      // 3. OPTIONS_PRESENTED state
      mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.OPTIONS_PRESENTED,
        context: {
          ...mockProcessInstance.context,
          quoteOptions: [
            { id: 'option-1', price: 100 },
            { id: 'option-2', price: 150 },
          ],
        },
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:option:select',
        'move:quote:request',
      ]);

      result = await service.compose({
        actorId,
        contextType: 'MOVE_BOOKING',
        contextId,
      });

      expect(result.screen).toBe('move-booking-options');

      // 4. BOOKING_CONFIRMED state
      mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.BOOKING_CONFIRMED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:payment:add',
        'move:booking:modify',
        'move:booking:cancel',
      ]);

      result = await service.compose({
        actorId,
        contextType: 'MOVE_BOOKING',
        contextId,
      });

      expect(result.screen).toBe('move-booking-confirmed');

      // 5. DRIVER_ASSIGNED state
      mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.DRIVER_ASSIGNED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
        'move:booking:cancel',
      ]);

      result = await service.compose({
        actorId,
        contextType: 'MOVE_BOOKING',
        contextId,
      });

      expect(result.screen).toBe('move-booking-driver-assigned');

      // 6. IN_PROGRESS state
      mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.IN_PROGRESS,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:tracking:view',
        'move:driver:contact',
        'move:issue:report',
      ]);

      result = await service.compose({
        actorId,
        contextType: 'MOVE_BOOKING',
        contextId,
      });

      expect(result.screen).toBe('move-booking-active');

      // 7. COMPLETED state
      mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.COMPLETED,
        status: ProcessInstanceStatus.COMPLETED,
        context: {
          ...mockProcessInstance.context,
          completedAt: '2024-01-15T12:00:00Z',
          totalPrice: 200,
          paymentMethod: 'card',
        },
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:rate',
        'move:review:create',
        'move:booking:create',
        'move:receipt:download',
      ]);

      result = await service.compose({
        actorId,
        contextType: 'MOVE_BOOKING',
        contextId,
      });

      expect(result.screen).toBe('move-booking-completed');
    });
  });

  // =============================================================================
  // Service Communication Tests
  // =============================================================================

  describe('service communication', () => {
    it('should properly pass context from WorkflowEngine to renderer', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const customContext = {
        bookingId: 'custom-booking',
        driverId: 'custom-driver',
        driverName: 'Jane Doe',
        pickupAddress: '789 Pickup Ave',
        dropoffAddress: '321 Dropoff Blvd',
        customField: 'customValue',
      };

      const mockProcessInstance = createMockProcessInstance({
        context: customContext,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert
      expect(result).toBeDefined();
      // Components should be rendered with context
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should properly filter capabilities before rendering actions', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);

      // Only give partial capabilities
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view', // Has this
        // Missing: move:driver:contact, move:booking:cancel
      ]);

      // Act
      const result = await service.compose(request);

      // Assert
      const viewDriverAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewDriverAction?.disabled).toBe(false);

      const contactDriverAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactDriverAction?.disabled).toBe(true);

      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.disabled).toBe(true);
    });

    it('should return all components for a given state', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };

      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.DRIVER_ASSIGNED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(request);

      // Assert - Driver assigned state should have multiple components
      expect(result.components.length).toBeGreaterThanOrEqual(4);
      // Should have DriverCard, LiveMap, BookingSummary, TimeWindow
      const componentTypes = result.components.map((c) => c.type);
      expect(componentTypes).toContain('DriverCard');
      expect(componentTypes).toContain('LiveMap');
    });
  });

  // =============================================================================
  // Renderer Integration Tests
  // =============================================================================

  describe('renderer integration', () => {
    it('should use MoveBookingStateRenderer correctly', async () => {
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
      expect(result.screen).toBe('move-booking-driver-assigned');
      expect(result.metadata.title).toBe('Driver Assigned');
    });

    it('should correctly pass state to renderer', async () => {
      // Test multiple states
      const states = [
        ProcessState.DRAFT,
        ProcessState.ESTIMATE_REQUESTED,
        ProcessState.OPTIONS_PRESENTED,
        ProcessState.BOOKING_CONFIRMED,
        ProcessState.DRIVER_ASSIGNED,
        ProcessState.IN_PROGRESS,
        ProcessState.COMPLETED,
        ProcessState.CANCELLED,
      ];

      for (const state of states) {
        // Arrange
        const request: UIComposeRequest = {
          actorId: 'actor-123',
          contextType: 'MOVE_BOOKING',
          contextId: 'instance-123',
        };

        const mockProcessInstance = createMockProcessInstance({ currentState: state });
        mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
        mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

        // Act
        const result = await service.compose(request);

        // Assert - Each state should produce a valid response
        expect(result).toBeDefined();
        expect(result.screen).toBeDefined();
        expect(result.metadata.currentState).toBe(state);
      }
    });
  });
});
