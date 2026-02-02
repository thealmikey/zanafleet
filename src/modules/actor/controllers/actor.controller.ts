import {
  BadRequestException,
  Body,
  Controller,
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

import { hashPassword } from '../../../core/utils/password.util';
import { CreateActorCommand } from '../commands/create-actor.command';
import { UpdateActorCommand } from '../commands/update-actor.command';
import { ActorDto } from '../dto/actor.dto';
import { CreateActorDto } from '../dto/create-actor.dto';
import { UpdateActorDto } from '../dto/update-actor.dto';
import { ActorEntity } from '../entities/actor.entity';

/**
 * ActorController
 *
 * REST API endpoints for managing actors.
 * Follows the CQRS pattern for state changes and direct repository access for queries.
 */
@Controller('actors')
export class ActorController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>
  ) {}

  /**
   * Create a new actor
   * Uses CreateActorCommand with Zod validation
   * Hashes the plaintext password server-side before creating the actor
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateActorDto): Promise<{ actorId: string }> {
    const passwordHash = await hashPassword(body.password);

    let input;
    try {
      input = CreateActorCommand.validate({
        ...body,
        passwordHash,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }

    const command = new CreateActorCommand(input);
    const actorId = await this.commandBus.execute<CreateActorCommand, string>(command);

    return { actorId };
  }

  /**
   * Get an actor by ID
   * Direct read from repository (projection)
   */
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ActorDto> {
    const actor = await this.actorRepository.findOne({
      where: { id },
    });

    if (!actor) {
      throw new NotFoundException(`Actor ${id} not found`);
    }

    return this.mapToDto(actor);
  }

  /**
   * Update an actor's roles and linked wallets
   * Uses UpdateActorCommand with Zod validation
   */
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateActorDto
  ): Promise<ActorDto> {
    let input;
    try {
      input = UpdateActorCommand.validate({
        ...body,
        actorId: id,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }

    const command = new UpdateActorCommand(input);
    await this.commandBus.execute<UpdateActorCommand, void>(command);

    const updatedActor = await this.actorRepository.findOne({
      where: { id },
    });

    if (!updatedActor) {
      throw new NotFoundException(`Actor ${id} not found`);
    }

    return this.mapToDto(updatedActor);
  }

  /**
   * Maps ActorEntity to ActorDto
   */
  private mapToDto(entity: ActorEntity): ActorDto {
    const domain = entity.toDomain();

    return {
      actorId: domain.actorId,
      type: domain.type,
      roles: [...domain.roles],
      workspaceId: domain.workspaceId,
      linkedWallets: [...domain.linkedWallets],
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  /**
   * Creates a BadRequestException from a ZodError
   */
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
