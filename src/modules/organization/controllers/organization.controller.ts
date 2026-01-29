import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZodError } from 'zod';

import {
  CreateOrganizationCommand,
  CreateOrganizationCommandInput,
} from '../commands/create-organization.command';
import {
  DeleteOrganizationCommand,
  DeleteOrganizationCommandInput,
} from '../commands/delete-organization.command';
import {
  UpdateOrganizationCommand,
  UpdateOrganizationCommandInput,
} from '../commands/update-organization.command';
import { CreateOrganizationDto, OrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationEntity } from '../entities/organization.entity';

type DeleteOrganizationBodyDto = {
  deletedByActorId?: string;
};

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateOrganizationDto): Promise<{ organizationId: string }> {
    let input: CreateOrganizationCommandInput;
    try {
      input = CreateOrganizationCommand.validate(body);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }

    const command = new CreateOrganizationCommand(input);
    const organizationId = await this.commandBus.execute<CreateOrganizationCommand, string>(
      command
    );

    return { organizationId };
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<OrganizationDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return this.mapToDto(organization);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateOrganizationDto
  ): Promise<OrganizationDto> {
    let input: UpdateOrganizationCommandInput;
    try {
      input = UpdateOrganizationCommand.validate({
        ...body,
        organizationId: id,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }

    const command = new UpdateOrganizationCommand(input);
    await this.commandBus.execute<UpdateOrganizationCommand, void>(command);

    const updatedOrganization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!updatedOrganization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return this.mapToDto(updatedOrganization);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: DeleteOrganizationBodyDto = {}
  ): Promise<void> {
    let input: DeleteOrganizationCommandInput;
    try {
      input = DeleteOrganizationCommand.validate({
        ...body,
        organizationId: id,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }

    const command = new DeleteOrganizationCommand(input);
    await this.commandBus.execute<DeleteOrganizationCommand, void>(command);
  }

  private mapToDto(entity: OrganizationEntity): OrganizationDto {
    const domain = entity.toDomain();

    return {
      organizationId: domain.organizationId,
      name: domain.name,
      type: domain.type,
      status: domain.status,
      linkedWallets: [...domain.linkedWallets],
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  private createValidationException(error: ZodError): BadRequestException {
    return new BadRequestException({
      message: 'Validation failed',
      issues: error.issues.map(({ path, message, code }) => ({
        path,
        message,
        code,
      })),
    });
  }
}
