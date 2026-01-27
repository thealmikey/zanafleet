import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateOrganizationCommand } from '../../commands/create-organization.command';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';
import { OrganizationEntity } from '../../entities/organization.entity';
import { OrganizationCreatedEventV1 } from '../../events/organization-created.event';
import { CreateOrganizationCommandHandler } from '../../handlers/create-organization.handler';

describe('CreateOrganizationCommandHandler', () => {
  let handler: CreateOrganizationCommandHandler;
  let organizationRepository: jest.Mocked<Repository<OrganizationEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    organizationRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrganizationEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateOrganizationCommandHandler(
      organizationRepository,
      eventBus,
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
});
