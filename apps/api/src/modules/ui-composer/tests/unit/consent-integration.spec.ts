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

describe('Consent Integration', () => {
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
  // RequiresConsent Flag Tests
  // =============================================================================

  describe('requiresConsent flag set correctly', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should mark cancel-booking action as requiring consent', async () => {
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
      expect(cancelAction?.requiresConsent).toBe(true);
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
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.BOOKING_CONFIRMED,
      });
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

    it('should mark request-quote action as requiring consent', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.DRAFT,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:request',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const requestQuoteAction = result.actions.find((a) => a.id === 'request-quote');
      expect(requestQuoteAction?.requiresConsent).toBe(true);
    });

    it('should preserve requiresConsent from action definition', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:booking:cancel',
        'move:driver:contact',
        'move:payment:add',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      // Check multiple consent-required actions
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.requiresConsent).toBe(true);
      expect(cancelAction?.requiresConfirmation).toBe(true);
    });
  });

  // =============================================================================
  // RequiresConsent with Different Capability Types
  // =============================================================================

  describe('requiresConsent with different capability types', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should handle booking-related capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.BOOKING_CONFIRMED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:booking:cancel',
        'move:booking:modify',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.requiresConsent).toBe(true);

      const modifyAction = result.actions.find((a) => a.id === 'modify-booking');
      expect(modifyAction?.requiresConsent).toBeUndefined();
    });

    it('should handle driver-related capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view',
        'move:driver:contact',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction?.requiresConsent).toBeUndefined();

      const contactAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactAction?.requiresConsent).toBe(true);
    });

    it('should handle payment-related capabilities', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.BOOKING_CONFIRMED,
      });
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
  // Consent Required for Sensitive Operations
  // =============================================================================

  describe('consent required for sensitive operations', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should require consent for cancelling a booking', async () => {
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
      expect(cancelAction?.requiresConsent).toBe(true);
      expect(cancelAction?.requiresConfirmation).toBe(true);
      expect(cancelAction?.confirmationMessage).toBeDefined();
    });

    it('should require consent for contacting driver', async () => {
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

    it('should require consent for adding payment', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.BOOKING_CONFIRMED,
      });
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

    it('should require consent for quote requests', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.DRAFT,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:request',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const requestQuoteAction = result.actions.find((a) => a.id === 'request-quote');
      expect(requestQuoteAction?.requiresConsent).toBe(true);
    });
  });

  // =============================================================================
  // Consent Not Required for Read Operations
  // =============================================================================

  describe('consent not required for read operations', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should not require consent for viewing driver details', async () => {
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

    it('should not require consent for viewing tracking', async () => {
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
      expect(trackAction?.requiresConsent).toBeUndefined();
    });

    it('should not require consent for refreshing quote', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.ESTIMATE_REQUESTED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:quote:refresh',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const refreshAction = result.actions.find((a) => a.id === 'refresh-quote');
      expect(refreshAction?.requiresConsent).toBeUndefined();
    });

    it('should not require consent for downloading receipt', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.COMPLETED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:receipt:download',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const downloadAction = result.actions.find((a) => a.id === 'download-receipt');
      expect(downloadAction?.requiresConsent).toBeUndefined();
    });

    it('should not require consent for viewing options', async () => {
      // Arrange
      const mockProcessInstance = createMockProcessInstance({
        currentState: ProcessState.OPTIONS_PRESENTED,
      });
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:option:select',
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const selectAction = result.actions.find((a) => a.id === 'select-option');
      expect(selectAction?.requiresConsent).toBeUndefined();
    });
  });

  // =============================================================================
  // Consent and Capability Combined
  // =============================================================================

  describe('consent and capability combined scenarios', () => {
    const mockRequest: UIComposeRequest = {
      actorId: 'actor-123',
      contextType: 'MOVE_BOOKING',
      contextId: 'instance-123',
    };

    it('should have both disabled and requiresConsent set correctly', async () => {
      // Arrange - Actor lacks capability
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.disabled).toBe(true);
      expect(cancelAction?.requiresConsent).toBe(true); // Still marked as requiring consent
    });

    it('should have enabled action with requiresConsent set correctly', async () => {
      // Arrange - Actor has capability
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
      expect(cancelAction?.requiresConsent).toBe(true);
    });

    it('should handle mixed capability and consent scenarios', async () => {
      // Arrange - Actor has some but not all capabilities
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:driver:view', // Has view - no consent needed
        // Missing contact - would require consent if they had it
      ]);

      // Act
      const result = await service.compose(mockRequest);

      // Assert
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction?.disabled).toBe(false);
      expect(viewAction?.requiresConsent).toBeUndefined();

      const contactAction = result.actions.find((a) => a.id === 'contact-driver');
      expect(contactAction?.disabled).toBe(true);
      expect(contactAction?.requiresConsent).toBe(true); // Would need consent if they had capability
    });
  });

  // =============================================================================
  // Consent Metadata
  // =============================================================================

  describe('consent metadata', () => {
    it('should include confirmation message when requiresConfirmation is true', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(request);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.requiresConfirmation).toBe(true);
      expect(cancelAction?.confirmationMessage).toContain('cancel');
    });

    it('should have correct action style for consent-required actions', async () => {
      // Arrange
      const request: UIComposeRequest = {
        actorId: 'actor-123',
        contextType: 'MOVE_BOOKING',
        contextId: 'instance-123',
      };
      const mockProcessInstance = createMockProcessInstance();
      mockWorkflowEngine.getProcessState.mockResolvedValue(mockProcessInstance);
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([
        'move:booking:cancel',
      ]);

      // Act
      const result = await service.compose(request);

      // Assert
      const cancelAction = result.actions.find((a) => a.id === 'cancel-booking');
      expect(cancelAction?.style).toBe('danger');
    });

    it('should have correct action style for non-consent actions', async () => {
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
      const result = await service.compose(request);

      // Assert
      const viewAction = result.actions.find((a) => a.id === 'view-driver');
      expect(viewAction?.style).toBe('ghost');
    });
  });
});
