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

import { CreateWorkspaceCommand } from '../commands/create-workspace.command';
import { UpdateWorkspaceCommand } from '../commands/update-workspace.command';
import { CreateWorkspaceDto, WorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { WorkspaceEntity } from '../entities/workspace.entity';

/**
 * WorkspaceController
 *
 * REST API endpoints for managing workspaces.
 * Follows the CQRS pattern for state changes and direct repository access for queries.
 */
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>
  ) {}

  /**
   * Create a new workspace
   * Uses CreateWorkspaceCommand with Zod validation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateWorkspaceDto): Promise<{ workspaceId: string }> {
    let input;
    try {
      input = CreateWorkspaceCommand.validate(body);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }

    const command = new CreateWorkspaceCommand(input);
    const workspaceId = await this.commandBus.execute<CreateWorkspaceCommand, string>(command);

    return { workspaceId };
  }

  /**
   * Get a workspace by ID
   * Direct read from repository (projection)
   */
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<WorkspaceDto> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }

    return this.mapToDto(workspace);
  }

  /**
   * Update a workspace
   * Uses UpdateWorkspaceCommand with Zod validation
   */
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateWorkspaceDto
  ): Promise<WorkspaceDto> {
    let input;
    try {
      input = UpdateWorkspaceCommand.validate({
        ...body,
        workspaceId: id,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }

    const command = new UpdateWorkspaceCommand(input);
    await this.commandBus.execute<UpdateWorkspaceCommand, void>(command);

    const updatedWorkspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!updatedWorkspace) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }

    return this.mapToDto(updatedWorkspace);
  }

  /**
   * Maps WorkspaceEntity to WorkspaceDto
   */
  private mapToDto(entity: WorkspaceEntity): WorkspaceDto {
    const domain = entity.toDomain();

    return {
      workspaceId: domain.workspaceId,
      orgId: domain.orgId,
      name: domain.name,
      type: domain.type,
      status: domain.status,
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
