import { CapabilityCategory } from '../entities/capability.entity';

/**
 * Capability Metadata DTO
 * Read-only representation of capability metadata for introspection
 */
export class CapabilityMetadataDto {
  /**
   * Human-readable description
   */
  readonly description?: string;

  /**
   * Category for organizing capabilities
   */
  readonly category?: string;

  /**
   * Whether this capability requires explicit consent
   */
  readonly requiresConsent: boolean;

  /**
   * Semantic version for capability schema
   */
  readonly version: string;

  constructor(data: {
    description?: string;
    category?: string;
    requiresConsent?: boolean;
    version?: string;
  }) {
    this.description = data.description;
    this.category = data.category;
    this.requiresConsent = data.requiresConsent ?? false;
    this.version = data.version ?? '1.0.0';
  }

  static fromEntity(data: {
    description: string | null;
    category: string | null;
    requiresConsent: boolean;
    version: string;
  }): CapabilityMetadataDto {
    return new CapabilityMetadataDto({
      description: data.description ?? undefined,
      category: data.category ?? undefined,
      requiresConsent: data.requiresConsent,
      version: data.version,
    });
  }
}

/**
 * Capability Response DTO
 * Full read representation of a capability
 */
export class CapabilityResponseDto {
  /**
   * Unique identifier
   */
  readonly id: string;

  /**
   * Unique capability name
   */
  readonly name: string;

  /**
   * Human-readable description
   */
  readonly description?: string;

  /**
   * Category for organizing capabilities
   */
  readonly category?: string;

  /**
   * Whether this capability requires explicit consent
   */
  readonly requiresConsent: boolean;

  /**
   * Semantic version
   */
  readonly version: string;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;

  /**
   * Creation timestamp
   */
  readonly createdAt: Date;

  /**
   * Last update timestamp
   */
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    requiresConsent?: boolean;
    version?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.requiresConsent = data.requiresConsent ?? false;
    this.version = data.version ?? '1.0.0';
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromEntity(data: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    requiresConsent: boolean;
    version: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  }): CapabilityResponseDto {
    return new CapabilityResponseDto({
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      category: data.category ?? undefined,
      requiresConsent: data.requiresConsent,
      version: data.version,
      metadata: data.metadata ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}

/**
 * Actor Capabilities DTO
 * Lists all capabilities for a specific actor
 */
export class ActorCapabilitiesDto {
  /**
   * Actor ID
   */
  readonly actorId: string;

  /**
   * List of capability names the actor possesses
   */
  readonly capabilities: string[];

  /**
   * Count of capabilities
   */
  readonly count: number;

  constructor(data: { actorId: string; capabilities: string[] }) {
    this.actorId = data.actorId;
    this.capabilities = data.capabilities;
    this.count = data.capabilities.length;
  }
}

/**
 * Capability List Query DTO
 * Query parameters for listing capabilities
 */
export class CapabilityListQueryDto {
  /**
   * Filter by category
   */
  readonly category?: string;

  /**
   * Filter by capability requiring consent
   */
  readonly requiresConsent?: boolean;

  /**
   * Search by name (partial match)
   */
  readonly search?: string;

  /**
   * Pagination: page number (1-based)
   */
  readonly page?: number;

  /**
   * Pagination: items per page
   */
  readonly limit?: number;
}

/**
 * Paginated Capability List Response
 */
export class CapabilityListResponseDto {
  /**
   * List of capabilities
   */
  readonly capabilities: CapabilityResponseDto[];

  /**
   * Total count matching query
   */
  readonly total: number;

  /**
   * Current page number
   */
  readonly page: number;

  /**
   * Items per page
   */
  readonly limit: number;

  /**
   * Total pages
   */
  readonly pages: number;

  constructor(data: {
    capabilities: CapabilityResponseDto[];
    total: number;
    page: number;
    limit: number;
  }) {
    this.capabilities = data.capabilities;
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.pages = Math.ceil(data.total / data.limit);
  }
}

/**
 * Capability Category Summary DTO
 * Summary of capabilities grouped by category
 */
export class CapabilityCategorySummaryDto {
  /**
   * Category name
   */
  readonly category: string;

  /**
   * Count of capabilities in this category
   */
  readonly count: number;

  /**
   * List of capability names in this category
   */
  readonly capabilities: string[];

  constructor(data: { category: string; count: number; capabilities: string[] }) {
    this.category = data.category;
    this.count = data.count;
    this.capabilities = data.capabilities;
  }
}

/**
 * Capability Check Result DTO
 * Result of a capability check operation
 */
export class CapabilityCheckResultDto {
  /**
   * Actor ID checked
   */
  readonly actorId: string;

  /**
   * Capability name checked
   */
  readonly capabilityName: string;

  /**
   * Whether the actor has the capability
   */
  readonly hasCapability: boolean;

  /**
   * Timestamp of the check
   */
  readonly checkedAt: Date;

  constructor(data: {
    actorId: string;
    capabilityName: string;
    hasCapability: boolean;
    checkedAt?: Date;
  }) {
    this.actorId = data.actorId;
    this.capabilityName = data.capabilityName;
    this.hasCapability = data.hasCapability;
    this.checkedAt = data.checkedAt ?? new Date();
  }
}

/**
 * Export all DTOs for convenience
 */
export const CapabilityDto = {
  Metadata: CapabilityMetadataDto,
  Response: CapabilityResponseDto,
  ActorCapabilities: ActorCapabilitiesDto,
  ListQuery: CapabilityListQueryDto,
  ListResponse: CapabilityListResponseDto,
  CategorySummary: CapabilityCategorySummaryDto,
  CheckResult: CapabilityCheckResultDto,
};
