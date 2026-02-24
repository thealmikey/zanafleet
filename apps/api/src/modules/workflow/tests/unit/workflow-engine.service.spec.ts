import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProcessDefinitionEntity, ProcessState } from '../../entities/process-definition.entity';
import {
  ProcessInstanceEntity,
  ProcessInstanceStatus,
} from '../../entities/process-instance.entity';
import {
  ProcessTransitionEntity,
  TransitionTriggerType,
  GuardType,
} from '../../entities/process-transition.entity';
import { WorkflowEngineService } from '../../services/workflow-engine.service';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let definitionRepository: any;
  let instanceRepository: any;
  let transitionRepository: any;
  let eventBus: any;

  const mockDefinition: Partial<ProcessDefinitionEntity> = {
    definitionId: 'move-booking-v1',
    name: 'MoveBookingProcess',
    description: 'Process for booking a move',
    version: '1.0.0',
    isActive: true,
    initialState: ProcessState.ESTIMATE_REQUESTED,
    terminalStates: ['completed', 'cancelled', 'failed'],
    allowedStates: [
      'draft',
      'estimate_requested',
      'options_presented',
      'booking_confirmed',
      'payment_authorized',
      'driver_assigned',
      'in_progress',
      'completed',
      'cancelled',
      'failed',
    ],
    metadata: {},
  };

  const mockTransition: Partial<ProcessTransitionEntity> = {
    transitionId: 'transition-1',
    definitionId: 'move-booking-v1',
    name: 'PresentOptions',
    description: 'Present options to customer',
    sourceState: ProcessState.ESTIMATE_REQUESTED,
    targetState: ProcessState.OPTIONS_PRESENTED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'EstimateGeneratedEvent-V1',
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        {
          provide: getRepositoryToken(ProcessDefinitionEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProcessInstanceEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProcessTransitionEntity),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(null),
            }),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    definitionRepository = module.get(getRepositoryToken(ProcessDefinitionEntity));
    instanceRepository = module.get(getRepositoryToken(ProcessInstanceEntity));
    transitionRepository = module.get(getRepositoryToken(ProcessTransitionEntity));
    eventBus = module.get(EventBus);
  });

  describe('createProcessInstance', () => {
    it('should create a new process instance successfully', async () => {
      definitionRepository.findOne.mockResolvedValue(mockDefinition);
      instanceRepository.save.mockResolvedValue(undefined);

      const result = await service.createProcessInstance({
        definitionId: 'move-booking-v1',
        name: 'Test Move',
        context: { orderId: 'order-123' },
        triggeredBy: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.definitionId).toBe('move-booking-v1');
      expect(result.name).toBe('Test Move');
      expect(result.currentState).toBe(ProcessState.ESTIMATE_REQUESTED);
      expect(result.status).toBe(ProcessInstanceStatus.ACTIVE);
      expect(instanceRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when definition not found', async () => {
      definitionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createProcessInstance({
          definitionId: 'non-existent',
          name: 'Test',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should create instance with related entities', async () => {
      definitionRepository.findOne.mockResolvedValue(mockDefinition);
      instanceRepository.save.mockResolvedValue(undefined);

      const relatedEntities = [
        {
          entityType: 'Order',
          entityId: 'order-123',
          role: 'primary',
          linkedAt: new Date(),
        },
      ];

      const result = await service.createProcessInstance({
        definitionId: 'move-booking-v1',
        name: 'Test Move',
        relatedEntities,
      });

      expect(result.relatedEntities).toEqual(relatedEntities);
    });

    it('should create instance with correlation and parent IDs', async () => {
      definitionRepository.findOne.mockResolvedValue(mockDefinition);
      instanceRepository.save.mockResolvedValue(undefined);

      const result = await service.createProcessInstance({
        definitionId: 'move-booking-v1',
        name: 'Test Move',
        correlationId: 'correlation-123',
        parentInstanceId: 'parent-instance-456',
      });

      expect(result.correlationId).toBe('correlation-123');
      expect(result.parentInstanceId).toBe('parent-instance-456');
    });
  });

  describe('triggerTransition', () => {
    const mockInstance: Partial<ProcessInstanceEntity> = {
      instanceId: 'instance-123',
      definitionId: 'move-booking-v1',
      name: 'Test Move',
      currentState: ProcessState.ESTIMATE_REQUESTED,
      status: ProcessInstanceStatus.ACTIVE,
      context: {},
      relatedEntities: [],
      triggeredBy: 'user-1',
      transitionCount: 0,
      history: [],
    };

    it('should transition successfully with matching event', async () => {
      instanceRepository.findOne.mockResolvedValue({ ...mockInstance, definition: mockDefinition });
      transitionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTransition),
      });
      instanceRepository.save.mockResolvedValue(undefined);

      const result = await service.triggerTransition({
        instanceId: 'instance-123',
        eventType: 'EstimateGeneratedEvent-V1',
        eventData: { estimateId: 'est-123' },
        triggeredBy: 'system',
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(ProcessState.OPTIONS_PRESENTED);
      expect(instanceRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should return failure when instance not found', async () => {
      instanceRepository.findOne.mockResolvedValue(null);

      const result = await service.triggerTransition({
        instanceId: 'non-existent',
        eventType: 'EstimateGeneratedEvent-V1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return failure when instance is not active', async () => {
      instanceRepository.findOne.mockResolvedValue({
        ...mockInstance,
        status: ProcessInstanceStatus.COMPLETED,
      });

      const result = await service.triggerTransition({
        instanceId: 'instance-123',
        eventType: 'EstimateGeneratedEvent-V1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });

    it('should return failure when no matching transition found', async () => {
      instanceRepository.findOne.mockResolvedValue({ ...mockInstance, definition: mockDefinition });
      transitionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.triggerTransition({
        instanceId: 'instance-123',
        eventType: 'UnknownEvent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No matching transition');
    });

    it('should transition to terminal state when completed', async () => {
      const terminalTransition = {
        ...mockTransition,
        targetState: ProcessState.COMPLETED,
      };

      instanceRepository.findOne.mockResolvedValue({ ...mockInstance, definition: mockDefinition });
      transitionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(terminalTransition),
      });
      definitionRepository.findOne.mockResolvedValue(mockDefinition);
      instanceRepository.save.mockResolvedValue(undefined);

      const result = await service.triggerTransition({
        instanceId: 'instance-123',
        eventType: 'DeliveryCompletedEvent-V1',
        eventData: {},
      });

      expect(result.success).toBe(true);
      expect(result.instance?.status).toBe(ProcessInstanceStatus.COMPLETED);
      expect(result.instance?.completedAt).toBeDefined();
    });
  });

  describe('validateTransition', () => {
    const mockInstance: Partial<ProcessInstanceEntity> = {
      instanceId: 'instance-123',
      definitionId: 'move-booking-v1',
      currentState: ProcessState.ESTIMATE_REQUESTED,
    };

    it('should return possible when transition exists', async () => {
      instanceRepository.findOne.mockResolvedValue(mockInstance);
      transitionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTransition),
      });

      const result = await service.validateTransition(
        'instance-123',
        ProcessState.OPTIONS_PRESENTED
      );

      expect(result.possible).toBe(true);
      expect(result.transition).toBeDefined();
    });

    it('should return not possible when no transition exists', async () => {
      instanceRepository.findOne.mockResolvedValue(mockInstance);
      transitionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.validateTransition('instance-123', ProcessState.COMPLETED);

      expect(result.possible).toBe(false);
      expect(result.reason).toContain('No transition');
    });

    it('should throw NotFoundException when instance not found', async () => {
      instanceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateTransition('non-existent', ProcessState.COMPLETED)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProcessState', () => {
    it('should return the process instance', async () => {
      const mockInstance = {
        instanceId: 'instance-123',
        definitionId: 'move-booking-v1',
        definition: mockDefinition,
      };

      instanceRepository.findOne.mockResolvedValue(mockInstance);

      const result = await service.getProcessState('instance-123');

      expect(result.instanceId).toBe('instance-123');
    });

    it('should throw NotFoundException when instance not found', async () => {
      instanceRepository.findOne.mockResolvedValue(null);

      await expect(service.getProcessState('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveInstances', () => {
    it('should return active instances for definition', async () => {
      const mockInstances = [
        { instanceId: 'instance-1', status: ProcessInstanceStatus.ACTIVE },
        { instanceId: 'instance-2', status: ProcessInstanceStatus.ACTIVE },
      ];

      instanceRepository.find.mockResolvedValue(mockInstances);

      const result = await service.getActiveInstances('move-booking-v1');

      expect(result).toHaveLength(2);
    });
  });

  describe('guard condition evaluation', () => {
    it('should evaluate expression guard conditions', async () => {
      const transitionWithGuard = {
        ...mockTransition,
        guardConditions: [
          {
            guardType: GuardType.EXPRESSION,
            guardName: 'has_estimate',
            expression: 'context.estimateId !== undefined',
            failMessage: 'Estimate is required',
          },
        ],
      };

      const mockInstance = {
        instanceId: 'instance-123',
        definitionId: 'move-booking-v1',
        name: 'Test Move',
        currentState: ProcessState.ESTIMATE_REQUESTED,
        status: ProcessInstanceStatus.ACTIVE,
        context: { estimateId: 'est-123' },
        relatedEntities: [],
        triggeredBy: 'user-1',
        transitionCount: 0,
        history: [],
      };

      instanceRepository.findOne.mockResolvedValue({ ...mockInstance, definition: mockDefinition });
      transitionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(transitionWithGuard),
      });
      instanceRepository.save.mockResolvedValue(undefined);

      const result = await service.triggerTransition({
        instanceId: 'instance-123',
        eventType: 'EstimateGeneratedEvent-V1',
        eventData: {},
      });

      expect(result.success).toBe(true);
    });

    it('should fail when expression guard fails', async () => {
      const transitionWithGuard = {
        ...mockTransition,
        guardConditions: [
          {
            guardType: GuardType.EXPRESSION,
            guardName: 'has_estimate',
            expression: 'context.estimateId !== undefined',
            failMessage: 'Estimate is required',
          },
        ],
      };

      const mockInstance = {
        instanceId: 'instance-123',
        definitionId: 'move-booking-v1',
        name: 'Test Move',
        currentState: ProcessState.ESTIMATE_REQUESTED,
        status: ProcessInstanceStatus.ACTIVE,
        context: {}, // No estimateId
        relatedEntities: [],
        triggeredBy: 'user-1',
        transitionCount: 0,
        history: [],
      };

      instanceRepository.findOne.mockResolvedValue({ ...mockInstance, definition: mockDefinition });
      transitionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(transitionWithGuard),
      });

      const result = await service.triggerTransition({
        instanceId: 'instance-123',
        eventType: 'EstimateGeneratedEvent-V1',
        eventData: {},
      });

      expect(result.success).toBe(false);
      expect(result.guardResults).toBeDefined();
      expect(result.guardResults?.[0].passed).toBe(false);
    });
  });
});
