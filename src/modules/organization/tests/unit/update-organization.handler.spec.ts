import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { EventBusService, NatsSubjects } from '../../../../core/event-bus';
import { UpdateOrganizationCommand } from '../../commands/update-organization.command';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';
import { OrganizationEntity } from '../../entities/organization.entity';
import { OrganizationUpdatedEventV1 } from '../../events/organization-updated.event';
import { UpdateOrganizationCommandHandler } from '../../handlers/update-organization.handler';

describe('UpdateOrganizationCommandHandler', () => {
  let handler: UpdateOrganizationCommandHandler;
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

    handler = new UpdateOrganizationCommandHandler(repository, eventBus, eventBusService);
  });

  it('updates organization and emits events', async () => {
    const existingOrganization = new OrganizationEntity();
    existingOrganization.id = 'e0e1ce32-aab7-4e63-912a-6a0e784b46ba';
    existingOrganization.name = 'Old Name';
    existingOrganization.type = OrganizationType.SACCO;
    existingOrganization.status = OrganizationStatus.ACTIVE;
    existingOrganization.linkedWallets = ['11111111-1111-1111-1111-111111111111'];
    existingOrganization.createdAt = new Date('2023-01-01T00:00:00.000Z');
    existingOrganization.updatedAt = new Date('2023-01-01T00:00:00.000Z');

    findOneMock.mockResolvedValue(existingOrganization);

    const updatedAt = new Date('2023-02-01T12:30:00.000Z');
    saveMock.mockImplementation(async (entity: OrganizationEntity) =>
      Object.assign(entity, { updatedAt })
    );

    const command = new UpdateOrganizationCommand({
      organizationId: existingOrganization.id,
      name: 'Updated Name',
      status: OrganizationStatus.SUSPENDED,
      linkedWallets: [
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      ],
    });

    await handler.execute(command);

    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: command.organizationId },
    });
    expect(saveMock).toHaveBeenCalledTimes(1);

    const savedEntity = saveMock.mock.calls[0][0] as OrganizationEntity;
    expect(savedEntity.name).toBe('Updated Name');
    expect(savedEntity.status).toBe(OrganizationStatus.SUSPENDED);
    expect(savedEntity.linkedWallets).toEqual([
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    ]);

    expect(publishMock).toHaveBeenCalledTimes(1);
    const publishedEvent = publishMock.mock.calls[0][0] as OrganizationUpdatedEventV1;
    expect(publishedEvent).toBeInstanceOf(OrganizationUpdatedEventV1);
    expect(publishedEvent.organizationId).toBe(command.organizationId);
    expect(publishedEvent.changes).toEqual({
      name: 'Updated Name',
      status: OrganizationStatus.SUSPENDED,
      linkedWallets: [
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      ],
    });
    expect(publishedEvent.updatedAt).toEqual(updatedAt);

    expect(eventBusServicePublishMock).toHaveBeenCalledTimes(1);
    expect(eventBusServicePublishMock).toHaveBeenCalledWith(
      NatsSubjects.Organization.UPDATED_V1,
      publishedEvent
    );
  });

  it('throws when organization is not found', async () => {
    findOneMock.mockResolvedValue(undefined);

    const command = new UpdateOrganizationCommand({
      organizationId: 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0',
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(NotFoundException);
    expect(saveMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
    expect(eventBusServicePublishMock).not.toHaveBeenCalled();
  });

  it('emits event when EventBusService is not provided', async () => {
    handler = new UpdateOrganizationCommandHandler(repository, eventBus, undefined);

    const existingOrganization = new OrganizationEntity();
    existingOrganization.id = 'd6a7993b-5d8c-45f4-a49b-4fda0e7e4778';
    existingOrganization.name = 'Name';
    existingOrganization.type = OrganizationType.PLATFORM;
    existingOrganization.status = OrganizationStatus.ACTIVE;
    existingOrganization.linkedWallets = [];
    existingOrganization.createdAt = new Date('2023-03-01T00:00:00.000Z');
    existingOrganization.updatedAt = new Date('2023-03-01T00:00:00.000Z');

    findOneMock.mockResolvedValue(existingOrganization);

    const updatedAt = new Date('2023-03-05T08:00:00.000Z');
    saveMock.mockImplementation(async (entity: OrganizationEntity) =>
      Object.assign(entity, { updatedAt })
    );

    const command = new UpdateOrganizationCommand({
      organizationId: existingOrganization.id,
      type: OrganizationType.BUSINESS,
    });

    await handler.execute(command);

    expect(publishMock).toHaveBeenCalledTimes(1);
    const publishedEvent = publishMock.mock.calls[0][0] as OrganizationUpdatedEventV1;
    expect(publishedEvent.changes).toEqual({
      type: OrganizationType.BUSINESS,
    });
    expect(eventBusServicePublishMock).not.toHaveBeenCalled();
  });
});
