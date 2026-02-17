/**
 * In-Memory Capability Repository
 *
 * In-memory implementation of CapabilityRepository for sandbox mode.
 */

import { Injectable } from '@nestjs/common';

import { InMemoryStoreBase } from '../../../core/sandbox/in-memory-store.base';
import { CapabilityEntity } from '../entities/capability.entity';
import { PersonaCapabilityEntity } from '../entities/persona-capability.entity';
import { ICapabilityRepository } from './capability.repository';

/**
 * Actor-Persona relationship entity for in-memory store
 */
interface ActorPersonaEntity {
  id: string;
  actorId: string;
  personaId: string;
  workspaceId?: string;
  createdAt: Date;
}

/**
 * In-Memory Capability Repository
 *
 * Provides in-memory data access for capability lookups.
 * Implements the same interface as the TypeORM-based CapabilityRepository.
 */
@Injectable()
export class CapabilityRepositoryInMemory implements ICapabilityRepository {
  /**
   * Store for capabilities
   */
  private readonly capabilityStore: InMemoryStoreBase<CapabilityEntity>;

  /**
   * Store for persona-capability relationships
   */
  private readonly personaCapabilityStore: InMemoryStoreBase<PersonaCapabilityEntity>;

  /**
   * Store for actor-persona relationships
   */
  private readonly actorPersonaStore: InMemoryStoreBase<ActorPersonaEntity>;

  constructor() {
    this.capabilityStore = new InMemoryStoreBase<CapabilityEntity>({
      entityName: 'Capability',
      autoGenerateIds: false,
    });
    this.personaCapabilityStore = new InMemoryStoreBase<PersonaCapabilityEntity>({
      entityName: 'PersonaCapability',
      autoGenerateIds: false,
    });
    this.actorPersonaStore = new InMemoryStoreBase<ActorPersonaEntity>({
      entityName: 'ActorPersona',
      autoGenerateIds: true,
    });
  }

  /**
   * Find capability by name
   */
  async findByName(name: string): Promise<CapabilityEntity | null> {
    const all = await this.capabilityStore.findAll();
    return all.find((c) => c.name === name) || null;
  }

  /**
   * Find capability by ID
   */
  async findById(id: string): Promise<CapabilityEntity | null> {
    return this.capabilityStore.findById(id);
  }

  /**
   * Find all capabilities
   */
  async findAll(): Promise<CapabilityEntity[]> {
    const all = await this.capabilityStore.findAll();
    return all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  /**
   * Find capabilities by IDs
   */
  async findByIds(ids: string[]): Promise<CapabilityEntity[]> {
    return this.capabilityStore.findByIds(ids);
  }

  /**
   * Find all persona-capability relationships for a persona
   */
  async findCapabilitiesForPersona(personaId: string): Promise<PersonaCapabilityEntity[]> {
    const all = await this.personaCapabilityStore.findAll();
    return all.filter((pc) => pc.personaId === personaId);
  }

  /**
   * Find persona IDs for an actor
   */
  async findPersonaIdsForActor(actorId: string, workspaceId?: string): Promise<string[]> {
    const all = await this.actorPersonaStore.findAll();
    const filtered = all.filter((ap) => ap.actorId === actorId);
    if (workspaceId) {
      return filtered
        .filter((ap) => ap.workspaceId === workspaceId)
        .map((ap) => ap.personaId);
    }
    return [...new Set(filtered.map((ap) => ap.personaId))];
  }

  /**
   * Check if persona has a specific capability
   */
  async personaHasCapability(personaId: string, capabilityName: string): Promise<boolean> {
    const personaCaps = await this.findCapabilitiesForPersona(personaId);
    for (const pc of personaCaps) {
      const capability = await this.findById(pc.capabilityId);
      if (capability && capability.name === capabilityName) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all capability names for a persona
   */
  async getCapabilityNamesForPersona(personaId: string): Promise<string[]> {
    const personaCaps = await this.findCapabilitiesForPersona(personaId);
    const names: string[] = [];
    for (const pc of personaCaps) {
      const capability = await this.findById(pc.capabilityId);
      if (capability) {
        names.push(capability.name);
      }
    }
    return names;
  }

  /**
   * Get all capabilities for an actor via their personas
   */
  async getCapabilitiesForActor(actorId: string): Promise<string[]> {
    const personaIds = await this.findPersonaIdsForActor(actorId);
    if (personaIds.length === 0) {
      return [];
    }

    const allCapabilities = new Set<string>();
    for (const personaId of personaIds) {
      const capabilities = await this.getCapabilityNamesForPersona(personaId);
      capabilities.forEach((cap) => allCapabilities.add(cap));
    }

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

    for (const personaId of personaIds) {
      if (await this.personaHasCapability(personaId, capabilityName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all capabilities with their metadata
   */
  async findAllWithMetadata(): Promise<CapabilityEntity[]> {
    return this.findAll();
  }

  /**
   * Find capabilities by category
   */
  async findByCategory(category: string): Promise<CapabilityEntity[]> {
    const all = await this.findAll();
    return all.filter((c) => c.category === category);
  }

  /**
   * Find capabilities that require consent
   */
  async findRequiringConsent(): Promise<CapabilityEntity[]> {
    const all = await this.findAll();
    return all.filter((c) => c.requiresConsent === true);
  }

  /**
   * Seed capabilities
   */
  async seed(capabilities: CapabilityEntity[]): Promise<void> {
    await this.capabilityStore.seed(capabilities);
  }

  /**
   * Seed persona capabilities
   */
  async seedPersonaCapabilities(personaCaps: PersonaCapabilityEntity[]): Promise<void> {
    await this.personaCapabilityStore.seed(personaCaps);
  }

  /**
   * Seed actor-persona relationships
   */
  async seedActorPersonas(actorPersonas: ActorPersonaEntity[]): Promise<void> {
    await this.actorPersonaStore.seed(actorPersonas);
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    await this.capabilityStore.clear();
    await this.personaCapabilityStore.clear();
    await this.actorPersonaStore.clear();
  }
}
