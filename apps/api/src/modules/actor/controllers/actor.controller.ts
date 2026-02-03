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

import { CreateActorCommand } from '../commands/create-actor.command';
import { UpdateActorCommand } from '../commands/update-actor.command';
import { ActorResponseDto } from '../dto/actor-response.dto';
import { CreateActorDto } from '../dto/create-actor.dto';
import { UpdateActorDto } from '../dto/update-actor.dto';
import { ActorEntity } from '../entities/actor.entity';

/**
 * ActorController
 *
 * REST controller for actor CRUD operations.
 * Implements the following endpoints:
 * - POST /actors - Create a new actor
 * - GET /actors - List all actors
 * - GET /actors/:id - Get actor by ID
 * - PATCH /actors/:id - Update an actor
 * - DELETE /actors/:id - Delete an actor
 */
@Controller('actors')
export class ActorController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateActorDto): Promise<{ actorId: string }> {
    try {
      const input = CreateActorCommand.validate(body);
      const command = new CreateActorCommand(input);
      const actorId = await this.commandBus.execute<CreateActorCommand, string>(command);
      return { actorId };
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  @Get()
  async findAll(): Promise<ActorResponseDto[]> {
    const actors = await this.actorRepository.find({
      order: { createdAt: 'DESC' },
    });

    return actors.map((actor) => this.mapEntityToDto(actor));
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ActorResponseDto> {
    const actor = await this.actorRepository.findOne({
      where: { id },
    });

    if (!actor) {
      throw new NotFoundException(`Actor with ID "${id}" not found`);
    }

    return this.mapEntityToDto(actor);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateActorDto
  ): Promise<{ actorId: string }> {
    try {
      const input = UpdateActorCommand.validate({
        ...body,
        actorId: id,
      });
      const command = new UpdateActorCommand(input);
      const actorId = await this.commandBus.execute<UpdateActorCommand, string>(command);
      return { actorId };
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    const actor = await this.actorRepository.findOne({
      where: { id },
    });

    if (!actor) {
      throw new NotFoundException(`Actor with ID "${id}" not found`);
    }

    await this.actorRepository.remove(actor);
  }

  private mapEntityToDto(entity: ActorEntity): ActorResponseDto {
    const domain = entity.toDomain();
    const dto = new ActorResponseDto();
    dto.actorId = domain.actorId;
    dto.email = domain.email;
    dto.username = domain.username;
    dto.type = domain.type;
    dto.workspaceId = domain.workspaceId;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
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
