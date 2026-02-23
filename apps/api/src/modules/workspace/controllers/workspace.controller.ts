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
  Query,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZodError } from 'zod';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { ActorType } from '../../actor/dto/actor.enums';
import { CreateWorkspaceCommand } from '../commands/create-workspace.command';
import { UpdateWorkspaceCommand } from '../commands/update-workspace.command';
import { AllowedWorkspaceTypesQueryDto } from '../dto/allowed-workspace-types-query.dto';
import { CreateWorkspaceDto, WorkspaceDto } from '../dto/create-workspace.dto';
import { ListWorkspacesQueryDto } from '../dto/list-workspaces-query.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { WorkspaceStatus, WorkspaceType } from '../dto/workspace.enums';
import { WorkspaceEntity } from '../entities/workspace.entity';

/**
 * WorkspaceController
 *
 * REST API endpoints for managing workspaces.
 * Follows the CQRS pattern for state changes and direct repository access for queries.
 */
@ApiTags('Workspaces')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy (required for operations within a workspace)',
  required: false,
})
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
  @ApiOperation({ summary: 'Create a new workspace', description: 'Create a new workspace with specified type and configuration' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully', schema: { example: { workspaceId: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
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
   * Get allowed workspace types for a given actor type
   * Centralizes the business rule for actor-workspace type mapping
   */
  @Get('allowed-types')
  @ApiOperation({ summary: 'Get allowed workspace types', description: 'Retrieve workspace types allowed for a specific actor type' })
  @ApiResponse({ status: 200, description: 'Allowed workspace types retrieved successfully' })
  @ApiQuery({ name: 'actorType', required: true, description: 'Actor type to get allowed workspace types for', enum: ActorType })
  getAllowedTypes(@Query() query: AllowedWorkspaceTypesQueryDto): {
    allowedTypes: WorkspaceType[];
  } {
    const allowedTypes = this.getWorkspaceTypesForActor(query.actorType);
    return { allowedTypes };
  }

  /**
   * Get all active workspaces, optionally filtered by type
   * Direct read from repository (projection)
   */
  @Get()
  @ApiOperation({ summary: 'List all workspaces', description: 'Retrieve all active workspaces, optionally filtered by type' })
  @ApiResponse({ status: 200, description: 'Workspaces retrieved successfully', type: [WorkspaceDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by workspace type', enum: WorkspaceType })
  async findAll(@Query() query: ListWorkspacesQueryDto): Promise<WorkspaceDto[]> {
    const workspaces = await this.workspaceRepository.find({
      where: {
        status: WorkspaceStatus.ACTIVE,
        ...(query.type && { type: query.type }),
      },
    });

    return workspaces.map((entity) => this.mapToDto(entity));
  }

  /**
   * Get a workspace by ID
   * Direct read from repository (projection)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID', description: 'Retrieve a specific workspace by its unique identifier' })
  @ApiResponse({ status: 200, description: 'Workspace retrieved successfully', type: WorkspaceDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiParam({ name: 'id', description: 'Workspace unique identifier (UUID)', type: String })
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
  @ApiOperation({ summary: 'Update a workspace', description: 'Update an existing workspace configuration' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully', type: WorkspaceDto })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiParam({ name: 'id', description: 'Workspace unique identifier (UUID)', type: String })
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

  /**
   * Maps an ActorType to the corresponding WorkspaceType(s)
   * Centralizes the business rule for which workspace types are valid for each actor type
   */
  private getWorkspaceTypesForActor(actorType: ActorType): WorkspaceType[] {
    switch (actorType) {
      case ActorType.SaccoAdmin:
      case ActorType.Rider:
        return [WorkspaceType.SACCO];
      case ActorType.Business:
      case ActorType.BusinessOwner:
        return [WorkspaceType.BUSINESS];
      case ActorType.Internal:
      case ActorType.AIService:
        return [WorkspaceType.OPS];
      default:
        return [];
    }
  }
}
