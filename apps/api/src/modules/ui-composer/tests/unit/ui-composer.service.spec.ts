import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

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

  describe('compose', () => {
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

    it('should filter actions by capability', async () => {
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
      expect(cancelAction?.disabledReason).toContain("move:booking:cancel");

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

    it('should throw NotFoundException when process not found', async () => {
      // Arrange
      mockWorkflowEngine.getProcessState.mockRejectedValue(
        new NotFoundException('Process instance not found')
      );

      // Act & Assert
      await expect(service.compose(mockRequest)).rejects.toThrow(NotFoundException);
    });

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
      await expect(service.compose(requestWithUnknownContext)).rejects.toThrow(
        NotFoundException
      );
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
  });

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
  });

  describe('hasRenderer', () => {
    it('should return true for registered renderer', () => {
      expect(service.hasRenderer('MOVE_BOOKING')).toBe(true);
    });

    it('should return false for unregistered renderer', () => {
      expect(service.hasRenderer('UNKNOWN')).toBe(false);
    });
  });

  describe('getRenderers', () => {
    it('should return all registered renderers', () => {
      const renderers = service.getRenderers();
      expect(renderers.size).toBeGreaterThan(0);
      expect(renderers.has('MOVE_BOOKING')).toBe(true);
    });
  });
});

describe('ComponentRegistryService', () => {
  let service: ComponentRegistryService;

  beforeEach(() => {
    service = new ComponentRegistryService();
  });

  describe('getComponent', () => {
    it('should return registered component', () => {
      const component = service.getComponent('DriverCard');
      expect(component).toBeDefined();
      expect(component?.type).toBe('DriverCard');
      expect(component?.displayName).toBe('Driver Card');
    });

    it('should return undefined for unknown component', () => {
      const component = service.getComponent('UnknownComponent');
      expect(component).toBeUndefined();
    });
  });

  describe('hasComponent', () => {
    it('should return true for registered component', () => {
      expect(service.hasComponent('LiveMap')).toBe(true);
    });

    it('should return false for unregistered component', () => {
      expect(service.hasComponent('UnknownComponent')).toBe(false);
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
  });

  describe('getComponentsByCategory', () => {
    it('should return components by category', () => {
      const driverComponents = service.getComponentsByCategory('driver');
      expect(driverComponents.length).toBeGreaterThan(0);
      expect(driverComponents.every((c) => c.type.toLowerCase().startsWith('driver'))).toBe(
        true
      );
    });
  });
});

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
  });
});
