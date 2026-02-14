import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CapabilityEntity } from '../entities/capability.entity';
import { PersonaCapabilityEntity } from '../entities/persona-capability.entity';

/**
 * Capability lookup result
 */
export interface CapabilityLookupResult {
  capabilityId: string;
  name: string;
  hasCapability: boolean;
}

/**
 * Actor capability context for lookups
 */
export interface ActorCapabilityContext {
  actorId: string;
  workspaceId?: string;
  personaIds?: string[];
}

/**
 * CapabilityRepository
 *
 * Provides data access methods for capability lookups.
 * Supports both direct capability checks and bulk capability queries.
 */
@Injectable()
export class CapabilityRepository {
  private readonly logger = new Logger(CapabilityRepository.name);

  constructor(
    @InjectRepository(CapabilityEntity)
    private readonly capabilityRepository: Repository<CapabilityEntity>,
    @InjectRepository(PersonaCapabilityEntity)
    private readonly personaCapabilityRepository: Repository<PersonaCapabilityEntity>
  ) {}

  /**
   * Find capability by name
   */
  async findByName(name: string): Promise<CapabilityEntity | null> {
    return this.capabilityRepository.findOne({ where: { name } });
  }

  /**
   * Find capability by ID
   */
  async findById(id: string): Promise<CapabilityEntity | null> {
    return this.capabilityRepository.findOne({ where: { id } });
  }

  /**
   * Find all capabilities
   */
  async findAll(): Promise<CapabilityEntity[]> {
    return this.capabilityRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Find capabilities by IDs
   */
  async findByIds(ids: string[]): Promise<CapabilityEntity[]> {
    return this.capabilityRepository.findByIds(ids);
  }

  /**
   * Find all persona-capability relationships for a persona
   */
  async findCapabilitiesForPersona(personaId: string): Promise<PersonaCapabilityEntity[]> {
    return this.personaCapabilityRepository.find({
      where: { personaId },
      relations: ['capability'],
    });
  }

  /**
   * Find persona IDs for an actor
   * This queries the actor_personas table to get all personas assigned to an actor
   */
  async findPersonaIdsForActor(actorId: string, workspaceId?: string): Promise<string[]> {
    const query = this.personaCapabilityRepository
      .createQueryBuilder('pc')
      .select('DISTINCT pc.personaId', 'personaId')
      .where('pc.actorId = :actorId', { actorId });

    if (workspaceId) {
      query.andWhere('pc.workspaceId = :workspaceId', { workspaceId });
    }

    const result = await query.getRawMany();
    return result.map((r) => r.personaId);
  }

  /**
   * Check if persona has a specific capability
   */
  async personaHasCapability(personaId: string, capabilityName: string): Promise<boolean> {
    const result = await this.personaCapabilityRepository
      .createQueryBuilder('pc')
      .innerJoin('pc.capability', 'c')
      .where('pc.personaId = :personaId', { personaId })
      .andWhere('c.name = :capabilityName', { capabilityName })
      .getCount();

    return result > 0;
  }

  /**
   * Get all capability names for a persona
   */
  async getCapabilityNamesForPersona(personaId: string): Promise<string[]> {
    const result = await this.personaCapabilityRepository
      .createQueryBuilder('pc')
      .innerJoin('capabilities', 'c', 'c.id = pc.capabilityId')
      .select('c.name', 'name')
      .where('pc.personaId = :personaId', { personaId })
      .getRawMany();

    return result.map((r) => r.name);
  }

  /**
   * Get all capabilities for an actor via their personas
   * This is the main method used by the access controller
   */
  async getCapabilitiesForActor(actorId: string): Promise<string[]> {
    // First get all persona IDs for the actor
    const personaIds = await this.findPersonaIdsForActor(actorId);

    if (personaIds.length === 0) {
      return [];
    }

    // Get all unique capability names across all personas
    const allCapabilities = new Set<string>();

    await Promise.all(
      personaIds.map(async (personaId) => {
        const capabilities = await this.getCapabilityNamesForPersona(personaId);
        capabilities.forEach((cap) => allCapabilities.add(cap));
      })
    );

    return Array.from(allCapabilities);
  }

  /**
   * Check if actor has capability via any of their personas
   */
  async actorHasCapabilityViaPersonas(
    actorId: string,
    capabilityName: string,
    workspaceId?: string
  ): Promise<boolean> {
    const personaIds = await this.findPersonaIdsForActor(actorId, workspaceId);

    if (personaIds.length === 0) {
      return false;
    }

    const result = await this.personaCapabilityRepository
      .createQueryBuilder('pc')
      .innerJoin('capabilities', 'c', 'c.id = pc.capabilityId')
      .select('COUNT(*)', 'count')
      .where('pc.personaId IN (:...personaIds)', { personaIds })
      .andWhere('c.name = :capabilityName', { capabilityName })
      .getRawOne();

    return parseInt(result?.count || '0', 10) > 0;
  }

  /**
   * Get all capabilities with their metadata
   */
  async findAllWithMetadata(): Promise<CapabilityEntity[]> {
    return this.capabilityRepository.find({
      order: { name: 'ASC' },
      relations: [],
    });
  }

  /**
   * Find capabilities by category
   */
  async findByCategory(category: string): Promise<CapabilityEntity[]> {
    return this.capabilityRepository
      .createQueryBuilder('capability')
      .where('capability.metadata ->> \'category\' = :category', { category })
      .orderBy('capability.name', 'ASC')
      .getMany();
  }

  /**
   * Find capabilities that require consent
   */
  async findRequiringConsent(): Promise<CapabilityEntity[]> {
    return this.capabilityRepository
      .createQueryBuilder('capability')
      .where('capability.metadata ->> \'requiresConsent\' = \'true\'')
      .orderBy('capability.name', 'ASC')
      .getMany();
  }
}
