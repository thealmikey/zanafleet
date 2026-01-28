import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { EventBusService, NatsSubjects } from '../../../../core/event-bus';
import { DeleteOrganizationCommand } from '../../commands/delete-organization.command';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';
import { OrganizationEntity } from '../../entities/organization.entity';
import { OrganizationDeletedEventV1 } from '../../events/organization-deleted.event';
import { DeleteOrganizationCommandHandler } from '../../handlers/delete-organization.handler';

describe('DeleteOrganizationCommandHandler', () => {
  let handler: DeleteOrganizationCommandHandler;
  let findOneMock: jest.Mock;
  let saveMock: jest.Mock;
  let publishMock: jest.Mock;
  let eventBusServicePublishMock: jest.Mock;
  let repository: Repository<OrganizationEntity>;
  let eventBus: EventBus;

  beforeEach(() => {
    findOneMock = jest.fn();
    saveMock = jest.fn();
    publishMock = jest.fn();
    eventBusServicePublishMock = jest.fn();

    repository = {
      findOne: findOneMock,
      save: saveMock,
    } as unknown as Repository<OrganizationEntity>;

    eventBus = {
      publish: publishMock,
    } as unknown as EventBus;

    const eventBusService = {
      publish: eventBusServicePublishMock,
    } as unknown as EventBusService;

    handler = new DeleteOrganizationCommandHandler(
      repository,
      eventBus,
      eventBusService,
    );
  });

  it('soft deletes organization and emits events', async () => {
    const existingOrganization = new OrganizationEntity();
    existingOrganization.id = '4d6d1a78-daa8-4ca4-97e1-8b1e2b030d4f';
    existingOrganization.name = 'Sample Org';
    existingOrganization.status = OrganizationStatus.ACTIVE;
    existingOrganization.type = OrganizationType.SACCO;
    existingOrganization.linkedWallets = [];
    existingOrganization.createdAt = new Date('2023-01-01T00:00:00.000Z');
    existingOrganization.updatedAt = new Date('2023-01-01T00:00:00.000Z');

    findOneMock.mockResolvedValue(existingOrganization);

    const deletedAt = new Date('2023-02-01T12:00:00.000Z');
    saveMock.mockImplementation(async (entity: OrganizationEntity) =>
      Object.assign(entity, { updatedAt: deletedAt }),
    );

    const command = new DeleteOrganizationCommand({
      organizationId: existingOrganization.id,
      deletedByActorId: 'a3aef6bf-9f41-4f35-8249-8145ad8adb7c',
    });

    await handler.execute(command);

    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: command.organizationId },
    });
    expect(saveMock).toHaveBeenCalledTimes(1);

    const savedEntity = saveMock.mock.calls[0][0] as OrganizationEntity;
    expect(savedEntity.status).toBe(OrganizationStatus.DELETED);

    expect(publishMock).toHaveBeenCalledTimes(1);
    const publishedEvent = publishMock.mock.calls[0][0] as OrganizationDeletedEventV1;
    expect(publishedEvent).toBeInstanceOf(OrganizationDeletedEventV1);
    expect(publishedEvent.organizationId).toBe(command.organizationId);
    expect(publishedEvent.deletedAt).toEqual(deletedAt);
    expect(publishedEvent.deletedByActorId).toBe(command.deletedByActorId);

    expect(eventBusServicePublishMock).toHaveBeenCalledTimes(1);
    expect(eventBusServicePublishMock).toHaveBeenCalledWith(
      NatsSubjects.Organization.DELETED_V1,
      publishedEvent,
    );
  });

  it('throws when organization is not found', async () => {
    findOneMock.mockResolvedValue(undefined);

    const command = new DeleteOrganizationCommand({
      organizationId: '9d1d6178-ac5a-4e85-93d3-8c8fcaf7d48f',
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(saveMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
    expect(eventBusServicePublishMock).not.toHaveBeenCalled();
  });

  it('emits event when EventBusService is not provided', async () => {
    handler = new DeleteOrganizationCommandHandler(repository, eventBus, undefined);

    const existingOrganization = new OrganizationEntity();
    existingOrganization.id = '5f5d2df0-90ce-4bbf-8cf9-1bde4b96c989';
    existingOrganization.status = OrganizationStatus.SUSPENDED;
    existingOrganization.type = OrganizationType.BUSINESS;
    existingOrganization.linkedWallets = [];
    existingOrganization.createdAt = new Date('2023-03-01T00:00:00.000Z');
    existingOrganization.updatedAt = new Date('2023-03-01T00:00:00.000Z');

    findOneMock.mockResolvedValue(existingOrganization);

    const deletedAt = new Date('2023-03-05T08:30:00.000Z');
    saveMock.mockImplementation(async (entity: OrganizationEntity) =>
      Object.assign(entity, { updatedAt: deletedAt }),
    );

    const command = new DeleteOrganizationCommand({
      organizationId: existingOrganization.id,
    });

    await handler.execute(command);

    expect(publishMock).toHaveBeenCalledTimes(1);
    const publishedEvent = publishMock.mock.calls[0][0] as OrganizationDeletedEventV1;
    expect(publishedEvent.deletedByActorId).toBeUndefined();

    expect(eventBusServicePublishMock).not.toHaveBeenCalled();
  });
});
