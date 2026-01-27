import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateRoleCommand } from '../../commands/create-role.command';
import { RoleScope } from '../../dto/role.enums';
import { RoleEntity } from '../../entities/role.entity';
import { RoleCreatedEventV1 } from '../../events/role-created.event';
import { CreateRoleCommandHandler } from '../../handlers/create-role.handler';

describe('CreateRoleCommandHandler', () => {
  let handler: CreateRoleCommandHandler;
  let roleRepository: jest.Mocked<Repository<RoleEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    roleRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<RoleEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateRoleCommandHandler(roleRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create role, persist it, emit event, and return role id', async () => {
      const command = new CreateRoleCommand({
        name: 'Manager',
        permissions: ['read', 'write'],
        scope: RoleScope.Organization,
      });

      const fromDomainSpy = jest.spyOn(RoleEntity, 'fromDomain');
      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.save.mockResolvedValue({} as RoleEntity);

      const roleId = await handler.execute(command);

      expect(typeof roleId).toBe('string');
      expect(roleId).toHaveLength(36);

      expect(roleRepository.findOne).toHaveBeenCalledTimes(1);
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: command.name, scope: command.scope },
      });

      expect(fromDomainSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: expect.any(String),
          name: command.name,
          permissions: command.permissions,
          scope: command.scope,
        }),
      );

      expect(roleRepository.save).toHaveBeenCalledTimes(1);
      expect(roleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: roleId,
          name: command.name,
          permissions: command.permissions,
          scope: command.scope,
        }),
      );

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as RoleCreatedEventV1;

      expect(emittedEvent).toBeInstanceOf(RoleCreatedEventV1);
      expect(emittedEvent.roleId).toBe(roleId);
      expect(emittedEvent.name).toBe(command.name);
      expect(emittedEvent.permissions).toEqual(command.permissions);
      expect(emittedEvent.scope).toBe(command.scope);
      expect(emittedEvent.aggregateType).toBe('Role');
      expect(emittedEvent.eventType).toBe('RoleCreatedEvent-V1');
      expect(emittedEvent.eventId).toEqual(expect.any(String));
      expect(emittedEvent.occurredAt).toBeInstanceOf(Date);
      expect(emittedEvent.createdAt).toBeInstanceOf(Date);
    });

    it('should throw ConflictException when role with same name and scope exists', async () => {
      const command = new CreateRoleCommand({
        name: 'Manager',
        permissions: ['read'],
        scope: RoleScope.Organization,
      });

      roleRepository.findOne.mockResolvedValue({} as RoleEntity);

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);

      expect(roleRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
