import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { RequireCapability } from '@api/core/api/decorators/require-capability.decorator';
import { CapabilityGuard } from '@api/core/api/guards/capability.guard';

import {
  CapabilityResponseDto,
  CapabilityListResponseDto,
  ActorCapabilitiesDto,
  CapabilityListQueryDto,
} from '../dto/capability.dto';
import {
  GetAllCapabilitiesQuery,
  GetCapabilityByIdQuery,
  GetCapabilityByNameQuery,
  GetActorCapabilitiesQuery,
  GetCapabilitiesByCategoryQuery,
  GetCapabilitiesRequiringConsentQuery,
} from '../queries/capability.query-handlers';

/**
 * CapabilityController
 *
 * Provides read-only endpoints for capability introspection.
 * Used by:
 * - UIComposer for rendering available actions
 * - AI reasoning layer for understanding system capabilities
 * - Admin dashboards for capability management
 */
@ApiTags('Capabilities')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
@Controller('capabilities')
@UseGuards(CapabilityGuard)
export class CapabilityController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * List all capabilities with optional filtering
   *
   * @query category - Filter by category
   * @query requiresConsent - Filter by consent requirement
   * @query search - Search by name
   * @query page - Page number (1-based)
   * @query limit - Items per page
   */
  @Get()
  @RequireCapability('capability_read')
  @ApiOperation({
    summary: 'List all capabilities',
    description:
      'Retrieve all capabilities with optional filtering by category, consent requirement, search term, pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Capabilities retrieved successfully',
    type: CapabilityListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by capability category' })
  @ApiQuery({
    name: 'requiresConsent',
    required: false,
    description: 'Filter by consent requirement',
    type: Boolean,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by capability name' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async listCapabilities(
    @Query() query: CapabilityListQueryDto
  ): Promise<CapabilityListResponseDto> {
    return this.queryBus.execute(new GetAllCapabilitiesQuery(query));
  }

  /**
   * Get capability by ID
   */
  @Get(':id')
  @RequireCapability('capability_read')
  @ApiOperation({
    summary: 'Get capability by ID',
    description: 'Retrieve a specific capability by its unique identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'Capability retrieved successfully',
    type: CapabilityResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Capability not found' })
  @ApiParam({ name: 'id', description: 'Capability unique identifier (UUID)', type: String })
  async getCapabilityById(@Param('id') id: string): Promise<CapabilityResponseDto | null> {
    return this.queryBus.execute(new GetCapabilityByIdQuery(id));
  }

  /**
   * Get capability by name
   */
  @Get('name/:name')
  @RequireCapability('capability_read')
  @ApiOperation({
    summary: 'Get capability by name',
    description: 'Retrieve a specific capability by its name',
  })
  @ApiResponse({
    status: 200,
    description: 'Capability retrieved successfully',
    type: CapabilityResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Capability not found' })
  @ApiParam({ name: 'name', description: 'Capability name', type: String })
  async getCapabilityByName(@Param('name') name: string): Promise<CapabilityResponseDto | null> {
    return this.queryBus.execute(new GetCapabilityByNameQuery(name));
  }

  /**
   * Get capabilities for a specific actor
   *
   * Useful for:
   * - UI to show what actions are available to current user
   * - AI to understand what an actor can do
   */
  @Get('actor/:actorId')
  @RequireCapability('capability_read')
  @ApiOperation({
    summary: 'Get actor capabilities',
    description: 'Retrieve all capabilities granted to a specific actor (user)',
  })
  @ApiResponse({
    status: 200,
    description: 'Actor capabilities retrieved successfully',
    type: ActorCapabilitiesDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiParam({ name: 'actorId', description: 'Actor unique identifier (UUID)', type: String })
  async getActorCapabilities(@Param('actorId') actorId: string): Promise<ActorCapabilitiesDto> {
    return this.queryBus.execute(new GetActorCapabilitiesQuery(actorId));
  }

  /**
   * Get capabilities by category
   */
  @Get('category/:category')
  @RequireCapability('capability_read')
  @ApiOperation({
    summary: 'Get capabilities by category',
    description: 'Retrieve all capabilities belonging to a specific category',
  })
  @ApiResponse({
    status: 200,
    description: 'Capabilities retrieved successfully',
    type: [CapabilityResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiParam({ name: 'category', description: 'Capability category', type: String })
  async getCapabilitiesByCategory(
    @Param('category') category: string
  ): Promise<CapabilityResponseDto[]> {
    return this.queryBus.execute(new GetCapabilitiesByCategoryQuery(category));
  }

  /**
   * Get capabilities that require consent
   */
  @Get('consent/required')
  @RequireCapability('capability_read')
  @ApiOperation({
    summary: 'Get capabilities requiring consent',
    description: 'Retrieve all capabilities that require user consent before being granted',
  })
  @ApiResponse({
    status: 200,
    description: 'Capabilities retrieved successfully',
    type: [CapabilityResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async getCapabilitiesRequiringConsent(): Promise<CapabilityResponseDto[]> {
    return this.queryBus.execute(new GetCapabilitiesRequiringConsentQuery());
  }

  /**
   * Get current user's capabilities
   *
   * Convenience endpoint that uses the authenticated user from request
   */
  @Get('me/capabilities')
  @RequireCapability('capability_read')
  @ApiOperation({
    summary: 'Get current user capabilities',
    description: 'Retrieve capabilities for the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user capabilities retrieved successfully',
    type: ActorCapabilitiesDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async getMyCapabilities(@Req() req: { user: { id: string } }): Promise<ActorCapabilitiesDto> {
    return this.queryBus.execute(new GetActorCapabilitiesQuery(req.user.id));
  }
}
