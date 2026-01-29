import { NotFoundException } from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateRequirementCommand } from '../../commands/create-requirement.command';
import { EvaluateFormationCommand } from '../../commands/evaluate-formation.command';
import { SatisfyRequirementCommand } from '../../commands/satisfy-requirement.command';
import { FormationState, RequirementType } from '../../dto/formation.enums';
import { FormationStatusEntity } from '../../entities/formation-status.entity';
import { RequirementEntity } from '../../entities/requirement.entity';
import { FormationStatusChangedEventV1 } from '../../events/formation-status-changed.event';
import { RequirementCreatedEventV1 } from '../../events/requirement-created.event';
import { RequirementSatisfiedEventV1 } from '../../events/requirement-satisfied.event';
import { CreateRequirementCommandHandler } from '../../handlers/create-requirement.handler';
import { EvaluateFormationCommandHandler } from '../../handlers/evaluate-formation.handler';
import { SatisfyRequirementCommandHandler } from '../../handlers/satisfy-requirement.handler';
import { FormationService } from '../../services/formation.service';

describe('Formation Handlers', () => {
  describe('EvaluateFormationCommandHandler', () => {
    const command = new EvaluateFormationCommand({
      entityType: 'Workspace',
      entityId: '11111111-1111-1111-1111-111111111111',
    });

    let formationServiceMock: {
      evaluateState: jest.Mock;
      getUnsatisfiedRequirements: jest.Mock;
    };

    let formationStatusRepositoryMock: {
      findOne: jest.Mock;
      save: jest.Mock;
    };

    let eventBusMock: {
      publish: jest.Mock;
    };

    let eventBusServiceMock: {
      publishEvent: jest.Mock;
    };

    let handler: EvaluateFormationCommandHandler;

    beforeEach(() => {
      formationServiceMock = {
        evaluateState: jest.fn(),
        getUnsatisfiedRequirements: jest.fn(),
      };

      formationStatusRepositoryMock = {
        findOne: jest.fn(),
        save: jest.fn(),
      };

      eventBusMock = {
        publish: jest.fn(),
      };

      eventBusServiceMock = {
        publishEvent: jest.fn().mockResolvedValue(undefined),
      };

      handler = new EvaluateFormationCommandHandler(
        formationServiceMock as unknown as FormationService,
        formationStatusRepositoryMock as unknown as Repository<FormationStatusEntity>,
        eventBusMock as unknown as EventBus,
        eventBusServiceMock as any
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('updates status and emits event when state changes', async () => {
      const existingStatus = {
        id: 'status-1',
        entityType: command.entityType,
        entityId: command.entityId,
        state: FormationState.DRAFT,
        lastEvaluatedAt: new Date('2024-01-01T00:00:00.000Z'),
      } as FormationStatusEntity;

      formationStatusRepositoryMock.findOne.mockResolvedValue(existingStatus);
      formationStatusRepositoryMock.save.mockImplementation(async (entity) => entity);

      formationServiceMock.evaluateState.mockResolvedValue(FormationState.ACTIVE);
      formationServiceMock.getUnsatisfiedRequirements.mockResolvedValue([]);

      const result = await handler.execute(command);

      expect(existingStatus.state).toBe(FormationState.ACTIVE);
      expect(formationStatusRepositoryMock.save).toHaveBeenCalledWith(existingStatus);
      expect(eventBusMock.publish).toHaveBeenCalledTimes(1);

      const event = eventBusMock.publish.mock.calls[0][0] as FormationStatusChangedEventV1;
      expect(event).toBeInstanceOf(FormationStatusChangedEventV1);
      expect(event.newState).toBe(FormationState.ACTIVE);
      expect(event.previousState).toBe(FormationState.DRAFT);
      expect(event.entityId).toBe(command.entityId);
      expect(eventBusServiceMock.publishEvent).toHaveBeenCalledWith(event);

      expect(result).toEqual({
        entityType: command.entityType,
        entityId: command.entityId,
        state: FormationState.ACTIVE,
        unsatisfiedRequirements: [],
      });
    });

    it('does not emit event when state is unchanged', async () => {
      const existingStatus = {
        id: 'status-2',
        entityType: command.entityType,
        entityId: command.entityId,
        state: FormationState.ACTIVE,
        lastEvaluatedAt: new Date('2024-02-01T00:00:00.000Z'),
      } as FormationStatusEntity;

      formationStatusRepositoryMock.findOne.mockResolvedValue(existingStatus);
      formationStatusRepositoryMock.save.mockImplementation(async (entity) => entity);

      formationServiceMock.evaluateState.mockResolvedValue(FormationState.ACTIVE);
      formationServiceMock.getUnsatisfiedRequirements.mockResolvedValue([]);

      const result = await handler.execute(command);

      expect(eventBusMock.publish).not.toHaveBeenCalled();
      expect(eventBusServiceMock.publishEvent).not.toHaveBeenCalled();
      expect(result.state).toBe(FormationState.ACTIVE);
    });

    it('creates status when missing and maps unsatisfied requirements', async () => {
      formationStatusRepositoryMock.findOne.mockResolvedValue(null);
      formationStatusRepositoryMock.save.mockImplementation(async (entity) => entity);

      formationServiceMock.evaluateState.mockResolvedValue(FormationState.PENDING);

      const requirement = {
        toDomain: jest.fn().mockReturnValue({ requirementId: 'req-1' }),
      } as unknown as RequirementEntity;

      formationServiceMock.getUnsatisfiedRequirements.mockResolvedValue([requirement]);

      const result = await handler.execute(command);

      expect(formationStatusRepositoryMock.save).toHaveBeenCalledTimes(1);
      const savedStatus = formationStatusRepositoryMock.save.mock
        .calls[0][0] as FormationStatusEntity;
      expect(savedStatus.entityType).toBe(command.entityType);
      expect(savedStatus.entityId).toBe(command.entityId);
      expect(savedStatus.state).toBe(FormationState.PENDING);

      expect(eventBusMock.publish).toHaveBeenCalledTimes(1);
      const event = eventBusMock.publish.mock.calls[0][0] as FormationStatusChangedEventV1;
      expect(event.previousState).toBe(FormationState.DRAFT);
      expect(event.newState).toBe(FormationState.PENDING);
      expect(eventBusServiceMock.publishEvent).toHaveBeenCalledWith(event);
      expect(requirement.toDomain as jest.Mock).toHaveBeenCalled();

      expect(result.unsatisfiedRequirements).toEqual([{ requirementId: 'req-1' }]);
    });
  });

  describe('CreateRequirementCommandHandler', () => {
    const command = new CreateRequirementCommand({
      entityType: 'Workspace',
      entityId: '22222222-2222-2222-2222-222222222222',
      type: RequirementType.FIELD,
      key: 'business_license',
      description: 'Provide a valid business license number',
      blocking: true,
    });

    let requirementRepositoryMock: {
      save: jest.Mock;
    };

    let eventBusMock: {
      publish: jest.Mock;
    };

    let commandBusMock: {
      execute: jest.Mock;
    };

    let eventBusServiceMock: {
      publishEvent: jest.Mock;
    };

    let handler: CreateRequirementCommandHandler;

    beforeEach(() => {
      requirementRepositoryMock = {
        save: jest.fn(),
      };

      eventBusMock = {
        publish: jest.fn(),
      };

      commandBusMock = {
        execute: jest.fn(),
      };

      eventBusServiceMock = {
        publishEvent: jest.fn().mockResolvedValue(undefined),
      };

      handler = new CreateRequirementCommandHandler(
        requirementRepositoryMock as unknown as Repository<RequirementEntity>,
        eventBusMock as unknown as EventBus,
        commandBusMock as unknown as CommandBus,
        eventBusServiceMock as any
      );

      requirementRepositoryMock.save.mockImplementation(async (entity) => entity);
      commandBusMock.execute.mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('persists requirement, emits event, and triggers evaluation', async () => {
      const result = await handler.execute(command);

      expect(requirementRepositoryMock.save).toHaveBeenCalledTimes(1);
      const savedRequirement = requirementRepositoryMock.save.mock.calls[0][0] as RequirementEntity;
      expect(savedRequirement.entityType).toBe(command.entityType);
      expect(savedRequirement.entityId).toBe(command.entityId);
      expect(savedRequirement.blocking).toBe(true);

      expect(typeof result).toBe('string');
      expect(result).toBe(savedRequirement.requirementId);

      expect(eventBusMock.publish).toHaveBeenCalledTimes(1);
      const event = eventBusMock.publish.mock.calls[0][0] as RequirementCreatedEventV1;
      expect(event).toBeInstanceOf(RequirementCreatedEventV1);
      expect(event.requirementId).toBe(savedRequirement.requirementId);
      expect(event.entityId).toBe(command.entityId);
      expect(event.key).toBe(command.key);
      expect(eventBusServiceMock.publishEvent).toHaveBeenCalledWith(event);

      expect(commandBusMock.execute).toHaveBeenCalledTimes(1);
      const evaluateCommand = commandBusMock.execute.mock.calls[0][0] as EvaluateFormationCommand;
      expect(evaluateCommand.entityId).toBe(command.entityId);
      expect(evaluateCommand.entityType).toBe(command.entityType);
    });
  });

  describe('SatisfyRequirementCommandHandler', () => {
    const requirementId = '33333333-3333-3333-3333-333333333333';

    let requirementRepositoryMock: {
      findOne: jest.Mock;
      save: jest.Mock;
    };

    let eventBusMock: {
      publish: jest.Mock;
    };

    let commandBusMock: {
      execute: jest.Mock;
    };

    let eventBusServiceMock: {
      publishEvent: jest.Mock;
    };

    let handler: SatisfyRequirementCommandHandler;

    beforeEach(() => {
      requirementRepositoryMock = {
        findOne: jest.fn(),
        save: jest.fn(),
      };

      eventBusMock = {
        publish: jest.fn(),
      };

      commandBusMock = {
        execute: jest.fn(),
      };

      eventBusServiceMock = {
        publishEvent: jest.fn().mockResolvedValue(undefined),
      };

      handler = new SatisfyRequirementCommandHandler(
        requirementRepositoryMock as unknown as Repository<RequirementEntity>,
        eventBusMock as unknown as EventBus,
        commandBusMock as unknown as CommandBus,
        eventBusServiceMock as any
      );

      requirementRepositoryMock.save.mockImplementation(async (entity) => entity);
      commandBusMock.execute.mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('throws NotFoundException when requirement does not exist', async () => {
      requirementRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        handler.execute(
          new SatisfyRequirementCommand({
            requirementId,
          })
        )
      ).rejects.toThrow(NotFoundException);

      expect(eventBusMock.publish).not.toHaveBeenCalled();
      expect(commandBusMock.execute).not.toHaveBeenCalled();
    });

    it('marks requirement as satisfied, emits event, and triggers evaluation', async () => {
      const requirement = {
        requirementId,
        entityType: 'Workspace',
        entityId: '44444444-4444-4444-4444-444444444444',
        type: RequirementType.FIELD,
        key: 'business_license',
        description: 'Provide a valid business license number',
        blocking: true,
        satisfied: false,
        targetEntityId: null,
        createdAt: new Date('2024-03-01T00:00:00.000Z'),
      } as RequirementEntity;

      requirementRepositoryMock.findOne.mockResolvedValue(requirement);

      const result = await handler.execute(
        new SatisfyRequirementCommand({
          requirementId,
        })
      );

      expect(requirement.satisfied).toBe(true);
      expect(requirementRepositoryMock.save).toHaveBeenCalledWith(requirement);

      expect(eventBusMock.publish).toHaveBeenCalledTimes(1);
      const event = eventBusMock.publish.mock.calls[0][0] as RequirementSatisfiedEventV1;
      expect(event).toBeInstanceOf(RequirementSatisfiedEventV1);
      expect(event.requirementId).toBe(requirementId);
      expect(event.entityId).toBe(requirement.entityId);
      expect(event.key).toBe(requirement.key);
      expect(eventBusServiceMock.publishEvent).toHaveBeenCalledWith(event);

      expect(commandBusMock.execute).toHaveBeenCalledTimes(1);
      const evaluateCommand = commandBusMock.execute.mock.calls[0][0] as EvaluateFormationCommand;
      expect(evaluateCommand.entityId).toBe(requirement.entityId);
      expect(evaluateCommand.entityType).toBe(requirement.entityType);

      expect(result).toBe(requirementId);
    });
  });
});
