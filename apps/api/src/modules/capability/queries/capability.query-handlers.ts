import { Injectable, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  CapabilityResponseDto,
  ActorCapabilitiesDto,
  CapabilityListResponseDto,
  CapabilityListQueryDto,
} from '../dto/capability.dto';
import { CapabilityRepository } from '../repositories/capability.repository';

/**
 * GetAllCapabilitiesQuery
 * Query to retrieve all capabilities with optional filtering
 */
export class GetAllCapabilitiesQuery {
  constructor(
    public readonly options: CapabilityListQueryDto = {}
  ) {}
}

/**
 * GetCapabilityByIdQuery
 * Query to retrieve a single capability by ID
 */
export class GetCapabilityByIdQuery {
  constructor(public readonly capabilityId: string) {}
}

/**
 * GetCapabilityByNameQuery
 * Query to retrieve a single capability by name
 */
export class GetCapabilityByNameQuery {
  constructor(public readonly capabilityName: string) {}
}

/**
 * GetActorCapabilitiesQuery
 * Query to retrieve all capabilities for a specific actor
 */
export class GetActorCapabilitiesQuery {
  constructor(public readonly actorId: string) {}
}

/**
 * CheckActorCapabilityQuery
 * Query to check if an actor has a specific capability
 */
export class CheckActorCapabilityQuery {
  constructor(
    public readonly actorId: string,
    public readonly capabilityName: string
  ) {}
}

/**
 * GetCapabilitiesByCategoryQuery
 * Query to retrieve capabilities by category
 */
export class GetCapabilitiesByCategoryQuery {
  constructor(public readonly category: string) {}
}

/**
 * GetCapabilitiesRequiringConsentQuery
 * Query to retrieve capabilities that require consent
 */
export class GetCapabilitiesRequiringConsentQuery {}

/**
 * GetAllCapabilitiesQueryHandler
 * Handles retrieval of all capabilities with filtering and pagination
 */
@QueryHandler(GetAllCapabilitiesQuery)
@Injectable()
export class GetAllCapabilitiesQueryHandler implements IQueryHandler<GetAllCapabilitiesQuery> {
  private readonly logger = new Logger(GetAllCapabilitiesQueryHandler.name);

  constructor(private readonly capabilityRepository: CapabilityRepository) {}

  async execute(query: GetAllCapabilitiesQuery): Promise<CapabilityListResponseDto> {
    const { options } = query;
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    this.logger.debug(`Getting capabilities: page=${page}, limit=${limit}, category=${String(options.category)}`);

    let capabilities;
    let total;

    if (options.category) {
      capabilities = await this.capabilityRepository.findByCategory(options.category);
      total = capabilities.length;
      capabilities = capabilities.slice(skip, skip + limit);
    } else if (options.requiresConsent !== undefined) {
      const all = await this.capabilityRepository.findAll();
      capabilities = all.filter(c => c.requiresConsent === options.requiresConsent);
      total = capabilities.length;
      capabilities = capabilities.slice(skip, skip + limit);
    } else {
      capabilities = await this.capabilityRepository.findAll();
      total = capabilities.length;

      // Apply search filter if provided
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        capabilities = capabilities.filter(
          c => c.name.toLowerCase().includes(searchLower) ||
               (c.description?.toLowerCase().includes(searchLower) ?? false)
        );
        total = capabilities.length;
      }

      capabilities = capabilities.slice(skip, skip + limit);
    }

    const dtos = capabilities.map(c => CapabilityResponseDto.fromEntity({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      requiresConsent: c.requiresConsent,
      version: c.version,
      metadata: c.metadata,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return new CapabilityListResponseDto({
      capabilities: dtos,
      total,
      page,
      limit,
    });
  }
}

/**
 * GetCapabilityByIdQueryHandler
 */
@QueryHandler(GetCapabilityByIdQuery)
@Injectable()
export class GetCapabilityByIdQueryHandler implements IQueryHandler<GetCapabilityByIdQuery> {
  private readonly logger = new Logger(GetCapabilityByIdQueryHandler.name);

  constructor(private readonly capabilityRepository: CapabilityRepository) {}

  async execute(query: GetCapabilityByIdQuery): Promise<CapabilityResponseDto | null> {
    const capability = await this.capabilityRepository.findById(query.capabilityId);

    if (!capability) {
      return null;
    }

    return CapabilityResponseDto.fromEntity({
      id: capability.id,
      name: capability.name,
      description: capability.description,
      category: capability.category,
      requiresConsent: capability.requiresConsent,
      version: capability.version,
      metadata: capability.metadata,
      createdAt: capability.createdAt,
      updatedAt: capability.updatedAt,
    });
  }
}

/**
 * GetCapabilityByNameQueryHandler
 */
@QueryHandler(GetCapabilityByNameQuery)
@Injectable()
export class GetCapabilityByNameQueryHandler implements IQueryHandler<GetCapabilityByNameQuery> {
  private readonly logger = new Logger(GetCapabilityByNameQueryHandler.name);

  constructor(private readonly capabilityRepository: CapabilityRepository) {}

  async execute(query: GetCapabilityByNameQuery): Promise<CapabilityResponseDto | null> {
    const capability = await this.capabilityRepository.findByName(query.capabilityName);

    if (!capability) {
      return null;
    }

    return CapabilityResponseDto.fromEntity({
      id: capability.id,
      name: capability.name,
      description: capability.description,
      category: capability.category,
      requiresConsent: capability.requiresConsent,
      version: capability.version,
      metadata: capability.metadata,
      createdAt: capability.createdAt,
      updatedAt: capability.updatedAt,
    });
  }
}

/**
 * GetActorCapabilitiesQueryHandler
 * Returns all capabilities for an actor
 */
@QueryHandler(GetActorCapabilitiesQuery)
@Injectable()
export class GetActorCapabilitiesQueryHandler implements IQueryHandler<GetActorCapabilitiesQuery> {
  private readonly logger = new Logger(GetActorCapabilitiesQueryHandler.name);

  constructor(private readonly capabilityRepository: CapabilityRepository) {}

  async execute(query: GetActorCapabilitiesQuery): Promise<ActorCapabilitiesDto> {
    const capabilities = await this.capabilityRepository.getCapabilitiesForActor(query.actorId);

    return new ActorCapabilitiesDto({
      actorId: query.actorId,
      capabilities,
    });
  }
}

/**
 * CheckActorCapabilityQueryHandler
 */
@QueryHandler(CheckActorCapabilityQuery)
@Injectable()
export class CheckActorCapabilityQueryHandler implements IQueryHandler<CheckActorCapabilityQuery> {
  private readonly logger = new Logger(CheckActorCapabilityQueryHandler.name);

  constructor(private readonly capabilityRepository: CapabilityRepository) {}

  async execute(query: CheckActorCapabilityQuery): Promise<boolean> {
    const hasCapability = await this.capabilityRepository.actorHasCapabilityViaPersonas(
      query.actorId,
      query.capabilityName
    );

    return hasCapability;
  }
}

/**
 * GetCapabilitiesByCategoryQueryHandler
 */
@QueryHandler(GetCapabilitiesByCategoryQuery)
@Injectable()
export class GetCapabilitiesByCategoryQueryHandler
  implements IQueryHandler<GetCapabilitiesByCategoryQuery>
{
  private readonly logger = new Logger(GetCapabilitiesByCategoryQueryHandler.name);

  constructor(private readonly capabilityRepository: CapabilityRepository) {}

  async execute(query: GetCapabilitiesByCategoryQuery): Promise<CapabilityResponseDto[]> {
    const capabilities = await this.capabilityRepository.findByCategory(query.category);

    return capabilities.map(c => CapabilityResponseDto.fromEntity({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      requiresConsent: c.requiresConsent,
      version: c.version,
      metadata: c.metadata,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
}

/**
 * GetCapabilitiesRequiringConsentQueryHandler
 */
@QueryHandler(GetCapabilitiesRequiringConsentQuery)
@Injectable()
export class GetCapabilitiesRequiringConsentQueryHandler
  implements IQueryHandler<GetCapabilitiesRequiringConsentQuery>
{
  private readonly logger = new Logger(GetCapabilitiesRequiringConsentQueryHandler.name);

  constructor(private readonly capabilityRepository: CapabilityRepository) {}

  async execute(): Promise<CapabilityResponseDto[]> {
    const capabilities = await this.capabilityRepository.findRequiringConsent();

    return capabilities.map(c => CapabilityResponseDto.fromEntity({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      requiresConsent: c.requiresConsent,
      version: c.version,
      metadata: c.metadata,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
}

/**
 * Export all query handlers
 */
export const CapabilityQueryHandlers = [
  GetAllCapabilitiesQueryHandler,
  GetCapabilityByIdQueryHandler,
  GetCapabilityByNameQueryHandler,
  GetActorCapabilitiesQueryHandler,
  CheckActorCapabilityQueryHandler,
  GetCapabilitiesByCategoryQueryHandler,
  GetCapabilitiesRequiringConsentQueryHandler,
];
