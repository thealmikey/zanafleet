import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateOrganizationCommand } from '../../commands/create-organization.command';
import { DeleteOrganizationCommand } from '../../commands/delete-organization.command';
import { UpdateOrganizationCommand } from '../../commands/update-organization.command';
import { OrganizationController } from '../../controllers/organization.controller';
import { CreateOrganizationDto } from '../../dto/create-organization.dto';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';
import { UpdateOrganizationDto } from '../../dto/update-organization.dto';
import { OrganizationEntity } from '../../entities/organization.entity';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let commandBusExecuteMock: jest.Mock;
  let repositoryFindOneMock: jest.Mock;

  beforeEach(() => {
    commandBusExecuteMock = jest.fn();
    repositoryFindOneMock = jest.fn();

    const commandBus = {
      execute: commandBusExecuteMock,
    } as unknown as CommandBus;

    const repository = {
      findOne: repositoryFindOneMock,
    } as unknown as Repository<OrganizationEntity>;

    controller = new OrganizationController(commandBus, repository);
  });

  it('creates organization and returns id', async () => {
    const dto = {
      name: '  Acme Corp  ',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.ACTIVE,
    } as CreateOrganizationDto;

    const organizationId = 'f0b8658c-025c-4c78-ae52-6f31beebb9af';
    commandBusExecuteMock.mockResolvedValue(organizationId);

    const result = await controller.create(dto);

    expect(commandBusExecuteMock).toHaveBeenCalledTimes(1);
    const commandArg =
      commandBusExecuteMock.mock.calls[0][0] as CreateOrganizationCommand;
    expect(commandArg).toBeInstanceOf(CreateOrganizationCommand);
    expect(commandArg).toMatchObject({
      name: 'Acme Corp',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
    });
    expect(result).toEqual({ organizationId });
  });

  it('throws BadRequestException when create validation fails', async () => {
    await expect(
      controller.create({} as CreateOrganizationDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(commandBusExecuteMock).not.toHaveBeenCalled();
  });

  it('returns organization when found', async () => {
    const id = '6f1c3f5c-5918-4ff6-8f41-b01c4ce8a6f2';
    const createdAt = new Date('2023-01-01T00:00:00.000Z');
    const updatedAt = new Date('2023-01-02T00:00:00.000Z');

    const entity = new OrganizationEntity();
    entity.id = id;
    entity.name = 'Sample Org';
    entity.type = OrganizationType.SACCO;
    entity.status = OrganizationStatus.ACTIVE;
    entity.linkedWallets = ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'];
    entity.createdAt = createdAt;
    entity.updatedAt = updatedAt;

    repositoryFindOneMock.mockResolvedValue(entity);

    const result = await controller.findOne(id);

    expect(repositoryFindOneMock).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual({
      organizationId: id,
      name: 'Sample Org',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
      createdAt,
      updatedAt,
    });
    expect(result.linkedWallets).not.toBe(entity.linkedWallets);
  });

  it('throws NotFoundException when organization is missing', async () => {
    const id = '5e3f4c12-7b8d-4dc7-8fa7-d4aa7088b5d4';
    repositoryFindOneMock.mockResolvedValue(undefined);

    await expect(controller.findOne(id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates organization and returns updated dto', async () => {
    const id = '3e6b4c92-4bd8-4c21-8f74-6f6bd2f469f4';
    const dto = {
      name: '  Updated Org  ',
      status: OrganizationStatus.SUSPENDED,
    } as UpdateOrganizationDto;

    commandBusExecuteMock.mockResolvedValue(undefined);

    const createdAt = new Date('2023-01-01T00:00:00.000Z');
    const updatedAt = new Date('2023-01-03T10:00:00.000Z');

    const entity = new OrganizationEntity();
    entity.id = id;
    entity.name = 'Updated Org';
    entity.type = OrganizationType.BUSINESS;
    entity.status = OrganizationStatus.SUSPENDED;
    entity.linkedWallets = ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'];
    entity.createdAt = createdAt;
    entity.updatedAt = updatedAt;

    repositoryFindOneMock.mockResolvedValue(entity);

    const result = await controller.update(id, dto);

    expect(commandBusExecuteMock).toHaveBeenCalledTimes(1);
    const commandArg =
      commandBusExecuteMock.mock.calls[0][0] as UpdateOrganizationCommand;
    expect(commandArg).toBeInstanceOf(UpdateOrganizationCommand);
    expect(commandArg).toMatchObject({
      organizationId: id,
      name: 'Updated Org',
      status: OrganizationStatus.SUSPENDED,
    });
    expect(repositoryFindOneMock).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual({
      organizationId: id,
      name: 'Updated Org',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.SUSPENDED,
      linkedWallets: ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'],
      createdAt,
      updatedAt,
    });
  });

  it('throws BadRequestException when update validation fails', async () => {
    const id = '94d5f873-8f98-4d8c-b15c-10fb1f5a0a51';

    await expect(
      controller.update(
        id,
        { status: 'invalid' } as unknown as UpdateOrganizationDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(commandBusExecuteMock).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updated organization cannot be loaded', async () => {
    const id = '8ff2e8af-3dbf-4fd8-845f-5e3774a5f1d8';
    commandBusExecuteMock.mockResolvedValue(undefined);
    repositoryFindOneMock.mockResolvedValue(undefined);

    await expect(
      controller.update(id, {} as UpdateOrganizationDto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(commandBusExecuteMock).toHaveBeenCalledTimes(1);
  });

  it('deletes organization', async () => {
    const id = 'f1f5d2d5-8b4d-4672-8853-605f12ad9f58';
    const body = {
      deletedByActorId: 'a0a7ec9c-8a6e-4c73-831b-6fdc4de22e6c',
    };

    commandBusExecuteMock.mockResolvedValue(undefined);

    await expect(controller.delete(id, body)).resolves.toBeUndefined();

    expect(commandBusExecuteMock).toHaveBeenCalledTimes(1);
    const commandArg =
      commandBusExecuteMock.mock.calls[0][0] as DeleteOrganizationCommand;
    expect(commandArg).toBeInstanceOf(DeleteOrganizationCommand);
    expect(commandArg).toMatchObject({
      organizationId: id,
      deletedByActorId: body.deletedByActorId,
    });
    expect(repositoryFindOneMock).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when delete validation fails', async () => {
    const id = '2fb1a4f3-1b1b-4ca6-9d57-77aa4d93c8eb';

    await expect(
      controller.delete(id, { deletedByActorId: 'invalid' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(commandBusExecuteMock).not.toHaveBeenCalled();
  });
});
