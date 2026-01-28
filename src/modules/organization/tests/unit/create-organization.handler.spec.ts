import { CommandBus, EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { AddActorToWorkspaceCommand } from '../../../workspace/commands/add-actor-to-workspace.command';
import { CreateWorkspaceCommand } from '../../../workspace/commands/create-workspace.command';
import { MembershipRole, WorkspaceStatus, WorkspaceType } from '../../../workspace/dto/workspace.enums';
import { CreateOrganizationCommand } from '../../commands/create-organization.command';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';
import { OrganizationEntity } from '../../entities/organization.entity';
import { OrganizationCreatedEventV1 } from '../../events/organization-created.event';
import { CreateOrganizationCommandHandler } from '../../handlers/create-organization.handler';

describe('CreateOrganizationCommandHandler', () => {
  let handler: CreateOrganizationCommandHandler;
  let organizationRepository: jest.Mocked<Repository<OrganizationEntity>>;
  let eventBus: jest.Mocked<EventBus>;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(() => {
    organizationRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrganizationEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    handler = new CreateOrganizationCommandHandler(
      organizationRepository,
      eventBus,
      commandBus,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create organization, persist it, emit event, and return organization id', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Acme Corp',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: ['wallet-1', 'wallet-2'],
      });

      const fromDomainSpy = jest.spyOn(OrganizationEntity, 'fromDomain');
      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);
      commandBus.execute.mockResolvedValue('workspace-id-123');

      const organizationId = await handler.execute(command);

      expect(typeof organizationId).toBe('string');
      expect(organizationId).toHaveLength(36);

      expect(fromDomainSpy).toHaveBeenCalledTimes(1);
      expect(fromDomainSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: expect.any(String),
          name: command.name,
          type: command.type,
          status: command.status,
          linkedWallets: command.linkedWallets,
        }),
      );

      expect(organizationRepository.save).toHaveBeenCalledTimes(1);
      expect(organizationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: organizationId,
          name: command.name,
          type: command.type,
          status: command.status,
          linkedWallets: command.linkedWallets,
        }),
      );

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as OrganizationCreatedEventV1;

      expect(emittedEvent).toBeInstanceOf(OrganizationCreatedEventV1);
      expect(emittedEvent.organizationId).toBe(organizationId);
      expect(emittedEvent.name).toBe(command.name);
      expect(emittedEvent.type).toBe(command.type);
      expect(emittedEvent.status).toBe(command.status);
      expect(emittedEvent.linkedWallets).toEqual(command.linkedWallets);
      expect(emittedEvent.aggregateType).toBe('Organization');
      expect(emittedEvent.eventType).toBe('OrganizationCreatedEvent-V1');
      expect(emittedEvent.eventId).toEqual(expect.any(String));
      expect(emittedEvent.occurredAt).toBeInstanceOf(Date);
      expect(emittedEvent.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('workspace orchestration', () => {
    it('should create workspace with WorkspaceType.SACCO for SACCO organization', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Test SACCO',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
      });

      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);
      commandBus.execute.mockResolvedValue('workspace-id-123');

      await handler.execute(command);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      const createWorkspaceCall =
        commandBus.execute.mock.calls[0][0] as CreateWorkspaceCommand;
      expect(createWorkspaceCall).toBeInstanceOf(CreateWorkspaceCommand);
      expect(createWorkspaceCall).toMatchObject({
        name: 'Test SACCO Workspace',
        type: WorkspaceType.SACCO,
        status: WorkspaceStatus.ACTIVE,
        roleTemplates: [],
      });
    });

    it('should create workspace with WorkspaceType.BUSINESS for BUSINESS organization', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Test Business',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
      });

      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);
      commandBus.execute.mockResolvedValue('workspace-id-123');

      await handler.execute(command);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      const createWorkspaceCall =
        commandBus.execute.mock.calls[0][0] as CreateWorkspaceCommand;
      expect(createWorkspaceCall).toBeInstanceOf(CreateWorkspaceCommand);
      expect(createWorkspaceCall).toMatchObject({
        name: 'Test Business Workspace',
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
        roleTemplates: [],
      });
    });

    it('should NOT create workspace for PLATFORM organization', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Test Platform',
        type: OrganizationType.PLATFORM,
        status: OrganizationStatus.ACTIVE,
      });

      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);

      await handler.execute(command);

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('should NOT create workspace for INTERNAL organization', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Test Internal',
        type: OrganizationType.INTERNAL,
        status: OrganizationStatus.ACTIVE,
      });

      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);

      await handler.execute(command);

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('should add actor as ADMIN when createdByActorId is provided', async () => {
      const actorId = '550e8400-e29b-41d4-a716-446655440000';
      const workspaceId = 'workspace-id-123';

      const command = new CreateOrganizationCommand({
        name: 'Test SACCO',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        createdByActorId: actorId,
      });

      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);
      commandBus.execute
        .mockResolvedValueOnce(workspaceId)
        .mockResolvedValueOnce(undefined);

      await handler.execute(command);

      expect(commandBus.execute).toHaveBeenCalledTimes(2);
      const addActorCall =
        commandBus.execute.mock.calls[1][0] as AddActorToWorkspaceCommand;
      expect(addActorCall).toBeInstanceOf(AddActorToWorkspaceCommand);
      expect(addActorCall).toMatchObject({
        actorId,
        workspaceId,
        role: MembershipRole.ADMIN,
      });
    });

    it('should skip actor assignment when createdByActorId is not provided', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Test SACCO',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
      });

      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);
      commandBus.execute.mockResolvedValue('workspace-id-123');

      await handler.execute(command);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should not fail organization creation if workspace orchestration fails', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Test SACCO',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
      });

      organizationRepository.save.mockResolvedValue({} as OrganizationEntity);
      commandBus.execute.mockRejectedValueOnce(
        new Error('Workspace creation failed'),
      );

      const organizationId = await handler.execute(command);

      expect(typeof organizationId).toBe('string');
      expect(organizationId).toHaveLength(36);
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(organizationRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
