import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { RelationshipType } from '../dto/contact-graph.enums';
import { ContactRelationship } from '../entities/contact-relationship.entity';
import { Contact } from '../entities/contact.entity';

/**
 * RelationshipStats: Statistics about a contact's relationships
 */
export interface RelationshipStats {
  totalRelationships: number;
  byType: Record<RelationshipType, number>;
  strongRelationships: number; // strength >= 70
  weakRelationships: number; // strength < 30
}

/**
 * PathResult: Result of path finding between contacts
 */
export interface PathResult {
  path: string[]; // Contact IDs
  totalStrength: number;
  relationshipTypes: RelationshipType[];
}

/**
 * ContactRelationshipService
 *
 * Manages the relationship graph between contacts:
 * - Creating and updating relationships
 * - Path finding between contacts
 * - Relationship strength calculations
 * - Graph traversal and analytics
 */
@Injectable()
export class ContactRelationshipService {
  private readonly logger = new Logger(ContactRelationshipService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactRelationship)
    private readonly relationshipRepository: Repository<ContactRelationship>
  ) {}

  /**
   * Create a relationship between two contacts
   */
  async createRelationship(
    fromContactId: string,
    toContactId: string,
    relationshipType: RelationshipType,
    strength: number = 50,
    metadata?: Record<string, unknown>
  ): Promise<ContactRelationship> {
    // Check if relationship already exists
    const existing = await this.relationshipRepository.findOne({
      where: {
        fromContactId,
        toContactId,
        relationshipType,
      },
    });

    if (existing) {
      // Update existing relationship
      existing.strength = Math.max(existing.strength, strength);
      existing.metadata = { ...existing.metadata, ...metadata };
      return this.relationshipRepository.save(existing);
    }

    // Create new relationship
    const relationship = this.relationshipRepository.create({
      fromContactId,
      toContactId,
      relationshipType,
      strength,
      metadata,
    });

    return this.relationshipRepository.save(relationship);
  }

  /**
   * Get all relationships for a contact
   */
  async getRelationships(contactId: string): Promise<ContactRelationship[]> {
    return this.relationshipRepository.find({
      where: [{ fromContactId: contactId }, { toContactId: contactId }],
      order: { strength: 'DESC' },
    });
  }

  /**
   * Get relationship statistics for a contact
   */
  async getRelationshipStats(contactId: string): Promise<RelationshipStats> {
    const relationships = await this.getRelationships(contactId);

    const stats: RelationshipStats = {
      totalRelationships: relationships.length,
      byType: {} as Record<RelationshipType, number>,
      strongRelationships: 0,
      weakRelationships: 0,
    };

    // Initialize type counts
    Object.values(RelationshipType).forEach((type) => {
      stats.byType[type] = 0;
    });

    // Calculate stats
    for (const rel of relationships) {
      stats.byType[rel.relationshipType]++;

      if (rel.strength >= 70) {
        stats.strongRelationships++;
      } else if (rel.strength < 30) {
        stats.weakRelationships++;
      }
    }

    return stats;
  }

  /**
   * Get contacts related to a specific contact
   */
  async getRelatedContacts(
    contactId: string,
    relationshipType?: RelationshipType
  ): Promise<Contact[]> {
    const query = this.relationshipRepository
      .createQueryBuilder('rel')
      .leftJoinAndSelect(
        'contact',
        'related',
        'rel.toContactId = related.id OR rel.fromContactId = related.id'
      )
      .where('(rel.fromContactId = :contactId OR rel.toContactId = :contactId)', { contactId })
      .andWhere('related.id != :contactId', { contactId });

    if (relationshipType) {
      query.andWhere('rel.relationshipType = :type', { type: relationshipType });
    }

    const results = await query.getMany();

    // Extract related contact IDs
    const relatedIds: string[] = [];
    const seen = new Set<string>();
    for (const rel of results) {
      if (rel.fromContactId !== contactId && !seen.has(rel.fromContactId)) {
        relatedIds.push(rel.fromContactId);
        seen.add(rel.fromContactId);
      }
      if (rel.toContactId !== contactId && !seen.has(rel.toContactId)) {
        relatedIds.push(rel.toContactId);
        seen.add(rel.toContactId);
      }
    }

    if (relatedIds.length === 0) return [];

    // Fetch full contact data using In operator
    return this.contactRepository.findBy({ id: In(relatedIds) });
  }

  /**
   * Find common contacts between two contacts
   */
  async findCommonContacts(contactId1: string, contactId2: string): Promise<Contact[]> {
    // Get relationships for both contacts
    const rels1 = await this.getRelationships(contactId1);
    const rels2 = await this.getRelationships(contactId2);

    // Build sets of related contacts
    const related1 = new Set<string>();
    const related2 = new Set<string>();

    for (const rel of rels1) {
      if (rel.fromContactId !== contactId1) related1.add(rel.fromContactId);
      if (rel.toContactId !== contactId1) related1.add(rel.toContactId);
    }

    for (const rel of rels2) {
      if (rel.fromContactId !== contactId2) related2.add(rel.fromContactId);
      if (rel.toContactId !== contactId2) related2.add(rel.toContactId);
    }

    // Find intersection
    const commonIds = [...related1].filter((id) => related2.has(id));

    if (commonIds.length === 0) return [];

    return this.contactRepository.findBy({ id: In(commonIds) });
  }

  /**
   * Calculate relationship strength based on interaction frequency
   */
  async updateRelationshipStrength(
    fromContactId: string,
    toContactId: string,
    interactionType: 'job_completed' | 'referral' | 'message' | 'shared_job'
  ): Promise<void> {
    // Strength increments by interaction type
    const strengthIncrements: Record<string, number> = {
      job_completed: 15,
      referral: 20,
      message: 5,
      shared_job: 10,
    };

    const increment = strengthIncrements[interactionType] || 5;

    // Find existing relationship
    const relationship = await this.relationshipRepository.findOne({
      where: [
        { fromContactId, toContactId },
        { fromContactId: toContactId, toContactId: fromContactId },
      ],
    });

    if (relationship) {
      // Update strength (max 100)
      relationship.strength = Math.min(100, relationship.strength + increment);
      await this.relationshipRepository.save(relationship);
    } else {
      // Create new relationship with initial strength
      await this.createRelationship(
        fromContactId,
        toContactId,
        RelationshipType.FREQUENTLY_INTERACTS_WITH,
        increment
      );
    }
  }

  /**
   * Get strongest relationships for a contact
   */
  async getStrongestRelationships(
    contactId: string,
    limit: number = 10
  ): Promise<{ contact: Contact; strength: number; type: RelationshipType }[]> {
    const relationships = await this.relationshipRepository.find({
      where: [{ fromContactId: contactId }, { toContactId: contactId }],
      order: { strength: 'DESC' },
      take: limit,
    });

    const results: { contact: Contact; strength: number; type: RelationshipType }[] = [];

    for (const rel of relationships) {
      const relatedId = rel.fromContactId === contactId ? rel.toContactId : rel.fromContactId;
      const contact = await this.contactRepository.findOneBy({ id: relatedId });

      if (contact) {
        results.push({
          contact,
          strength: rel.strength,
          type: rel.relationshipType,
        });
      }
    }

    return results;
  }

  /**
   * Suggest potential relationships based on activity patterns
   */
  async suggestRelationships(
    contactId: string,
    minStrength: number = 30
  ): Promise<{ contact: Contact; suggestedType: RelationshipType; reason: string }[]> {
    const contact = await this.contactRepository.findOneBy({ id: contactId });
    if (!contact) return [];

    const suggestions: { contact: Contact; suggestedType: RelationshipType; reason: string }[] = [];

    // Find contacts that share phone numbers or emails (suggest MATCHED_TO)
    if (contact.phoneNumbers) {
      for (const phone of contact.phoneNumbers) {
        const contactsWithPhone = await this.contactRepository
          .createQueryBuilder('c')
          .where('c.id != :contactId', { contactId })
          .andWhere('c.phoneNumbers IS NOT NULL')
          .andWhere(':phone = ANY(c.phoneNumbers)', { phone })
          .getMany();

        for (const c of contactsWithPhone) {
          suggestions.push({
            contact: c,
            suggestedType: RelationshipType.MATCHED_TO,
            reason: `Shares phone number: ${phone}`,
          });
        }
      }
    }

    // Find contacts that share company name (suggest EMPLOYEE_OF)
    if (contact.companyName) {
      const contactsInCompany = await this.contactRepository
        .createQueryBuilder('c')
        .where('c.id != :contactId', { contactId })
        .andWhere('c.companyName = :companyName', { companyName: contact.companyName })
        .getMany();

      for (const c of contactsInCompany) {
        suggestions.push({
          contact: c,
          suggestedType: RelationshipType.EMPLOYEE_OF,
          reason: `Works at same company: ${contact.companyName}`,
        });
      }
    }

    // Find contacts with similar names (suggest potential duplicates or family)
    const contactsByName = await this.contactRepository
      .createQueryBuilder('c')
      .where('c.id != :contactId', { contactId })
      .andWhere('LOWER(c.displayName) LIKE :namePattern', {
        namePattern: `%${contact.displayName.toLowerCase().substring(0, 3)}%`,
      })
      .getMany();

    for (const c of contactsByName) {
      // Check if relationship already exists
      const exists = await this.relationshipRepository.findOne({
        where: [
          { fromContactId: contactId, toContactId: c.id },
          { fromContactId: c.id, toContactId: contactId },
        ],
      });

      if (!exists) {
        suggestions.push({
          contact: c,
          suggestedType: RelationshipType.FREQUENTLY_INTERACTS_WITH,
          reason: `Similar name: ${contact.displayName} vs ${c.displayName}`,
        });
      }
    }

    // Remove duplicates and limit suggestions
    const uniqueSuggestions = new Map<string, (typeof suggestions)[0]>();
    for (const s of suggestions) {
      const key = s.contact.id;
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, s);
      }
    }

    return Array.from(uniqueSuggestions.values()).slice(0, 20);
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(
    fromContactId: string,
    toContactId: string,
    relationshipType?: RelationshipType
  ): Promise<void> {
    const where: Record<string, unknown> = {
      fromContactId,
      toContactId,
    };

    if (relationshipType) {
      where.relationshipType = relationshipType;
    }

    await this.relationshipRepository.delete(where);
  }

  /**
   * Merge two contacts (combine relationships)
   */
  async mergeContacts(primaryContactId: string, secondaryContactId: string): Promise<void> {
    // Get all relationships from secondary contact
    const secondaryRels = await this.relationshipRepository.find({
      where: [{ fromContactId: secondaryContactId }, { toContactId: secondaryContactId }],
    });

    // Migrate relationships to primary contact
    for (const rel of secondaryRels) {
      const newFromId =
        rel.fromContactId === secondaryContactId ? primaryContactId : rel.fromContactId;
      const newToId = rel.toContactId === secondaryContactId ? primaryContactId : rel.toContactId;

      // Check if relationship already exists
      const existing = await this.relationshipRepository.findOne({
        where: {
          fromContactId: newFromId,
          toContactId: newToId,
          relationshipType: rel.relationshipType,
        },
      });

      if (existing) {
        // Keep the stronger relationship
        existing.strength = Math.max(existing.strength, rel.strength);
        await this.relationshipRepository.save(existing);

        // Delete the old one
        await this.relationshipRepository.delete({ id: rel.id });
      } else {
        // Update the relationship to point to primary
        await this.relationshipRepository.update(rel.id, {
          fromContactId: newFromId,
          toContactId: newToId,
        });
      }
    }
  }
}
