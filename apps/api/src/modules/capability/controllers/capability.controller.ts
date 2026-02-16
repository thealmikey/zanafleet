import { RequireCapability } from '@api/core/api/decorators/require-capability.decorator';
import { CapabilityGuard } from '@api/core/api/guards/capability.guard';
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';


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
  async getCapabilityById(@Param('id') id: string): Promise<CapabilityResponseDto | null> {
    return this.queryBus.execute(new GetCapabilityByIdQuery(id));
  }

  /**
   * Get capability by name
   */
  @Get('name/:name')
  @RequireCapability('capability_read')
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
  async getActorCapabilities(@Param('actorId') actorId: string): Promise<ActorCapabilitiesDto> {
    return this.queryBus.execute(new GetActorCapabilitiesQuery(actorId));
  }

  /**
   * Get capabilities by category
   */
  @Get('category/:category')
  @RequireCapability('capability_read')
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
  async getMyCapabilities(
    @Req() req: { user: { id: string } }
  ): Promise<ActorCapabilitiesDto> {
    return this.queryBus.execute(new GetActorCapabilitiesQuery(req.user.id));
  }
}
