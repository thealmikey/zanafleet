import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContactStatus, ContactType } from '../dto/contact-graph.enums';
import { ContactRelationship } from '../entities/contact-relationship.entity';
import { Contact } from '../entities/contact.entity';

/**
 * Suggestion types for different business scenarios
 */
export enum SuggestionType {
  CONVERSION = 'CONVERSION', // Likely to convert to rider/customer
  REFERRAL = 'REFERRAL', // Good referral source
  UPSELL = 'UPSELL', // Potential for premium services
  CHURN_RISK = 'CHURN_RISK', // At risk of leaving
  CROSS_SELL = 'CROSS_SELL', // Good fit for other services
  TEAM_BUILDING = 'TEAM_BUILDING', // Can bring team members
  VIP = 'VIP', // High-value contact
  DORMANT = 'DORMANT', // Needs re-engagement
}

/**
 * SmartSuggestion: AI-generated suggestion for a contact
 */
export interface SmartSuggestion {
  contactId: string;
  suggestionType: SuggestionType;
  confidence: number; // 0-100
  reason: string;
  suggestedAction: string;
  metadata?: Record<string, unknown>;
}

/**
 * SegmentInsight: Analysis of a contact segment
 */
export interface SegmentInsight {
  segmentName: string;
  totalContacts: number;
  activeContacts: number;
  conversionRate: number;
  avgRelationshipStrength: number;
  topTypes: ContactType[];
  recommendations: string[];
}

/**
 * SmartSuggestionsService
 *
 * Provides AI-driven suggestions and insights for contacts:
 * - Conversion predictions
 * - Referral potential
 * - Churn risk analysis
 * - Segment insights
 * - Personalized recommendations
 */
@Injectable()
export class SmartSuggestionsService {
  private readonly logger = new Logger(SmartSuggestionsService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactRelationship)
    private readonly relationshipRepository: Repository<ContactRelationship>
  ) {}

  /**
   * Get conversion suggestions - contacts likely to convert to platform users
   */
  async getConversionSuggestions(
    workspaceId: string | null,
    limit: number = 20
  ): Promise<SmartSuggestion[]> {
    // Find contacts that are:
    // - Not yet matched to platform users
    // - Have high relationship strength
    // - Have been recently active
    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.matchedUserId IS NULL')
      .andWhere('contact.status IN (:... statuses)', {
        statuses: [ContactStatus.ACTIVE, ContactStatus.VERIFIED],
      })
      .andWhere('contact.relationshipStrength >= :minStrength', { minStrength: 50 })
      .orderBy('contact.relationshipStrength', 'DESC')
      .addOrderBy('contact.lastInteractionAt', 'DESC')
      .take(limit * 2)
      .getMany();

    const suggestions: SmartSuggestion[] = [];

    for (const contact of contacts) {
      // Check if they have platform-like contact info
      const hasValidPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
      const hasEmail = contact.emailAddresses && contact.emailAddresses.length > 0;

      if (!hasValidPhone && !hasEmail) continue;

      // Calculate confidence based on signals
      let confidence = 50; // Base

      if (contact.relationshipStrength >= 80) confidence += 20;
      else if (contact.relationshipStrength >= 60) confidence += 10;

      if (contact.lastInteractionAt) {
        const daysSinceLastInteraction = Math.floor(
          (Date.now() - contact.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastInteraction < 7) confidence += 15;
        else if (daysSinceLastInteraction < 30) confidence += 5;
        else confidence -= 10;
      }

      // Check for company name (might be business contact)
      if (contact.companyName) confidence += 5;

      suggestions.push({
        contactId: contact.id,
        suggestionType: SuggestionType.CONVERSION,
        confidence: Math.min(100, confidence),
        reason: this.getConversionReason(contact),
        suggestedAction: 'Send invitation to join platform',
        metadata: {
          contactName: contact.displayName,
          contactType: contact.contactType,
          relationshipStrength: contact.relationshipStrength,
        },
      });
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get referral suggestions - contacts likely to refer others
   */
  async getReferralSuggestions(
    workspaceId: string | null,
    limit: number = 20
  ): Promise<SmartSuggestion[]> {
    // Find high-value contacts with strong networks
    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.matchedUserId IS NOT NULL') // Must be platform user
      .andWhere('contact.status = :status', { status: ContactStatus.ACTIVE })
      .orderBy('contact.relationshipStrength', 'DESC')
      .take(limit * 3)
      .getMany();

    const suggestions: SmartSuggestion[] = [];

    for (const contact of contacts) {
      // Count their relationships
      const relationshipCount = await this.relationshipRepository.count({
        where: [{ fromContactId: contact.id }, { toContactId: contact.id }],
      });

      if (relationshipCount < 2) continue;

      // Calculate referral potential
      let confidence = 40; // Base

      if (contact.relationshipStrength >= 70) confidence += 20;
      if (relationshipCount >= 5) confidence += 20;
      else if (relationshipCount >= 3) confidence += 10;

      // Active contacts have higher referral potential
      if (contact.lastInteractionAt) {
        const daysSince = Math.floor(
          (Date.now() - contact.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince < 14) confidence += 15;
      }

      suggestions.push({
        contactId: contact.id,
        suggestionType: SuggestionType.REFERRAL,
        confidence: Math.min(100, confidence),
        reason: `${relationshipCount} connections with ${contact.relationshipStrength}% relationship strength`,
        suggestedAction: 'Request referral or share referral program',
        metadata: {
          contactName: contact.displayName,
          relationshipCount,
          lastActive: contact.lastInteractionAt,
        },
      });
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get churn risk suggestions - contacts at risk of becoming inactive
   */
  async getChurnRiskSuggestions(
    workspaceId: string | null,
    limit: number = 20
  ): Promise<SmartSuggestion[]> {
    // Find contacts with declining activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.status = :status', { status: ContactStatus.ACTIVE })
      .andWhere('contact.lastInteractionAt IS NOT NULL')
      .andWhere('contact.lastInteractionAt < :threshold', {
        threshold: thirtyDaysAgo,
      })
      .orderBy('contact.lastInteractionAt', 'ASC')
      .take(limit * 2)
      .getMany();

    const suggestions: SmartSuggestion[] = [];

    for (const contact of contacts) {
      const daysInactive = contact.lastInteractionAt
        ? Math.floor((Date.now() - contact.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate risk level
      let confidence = 50; // Base risk

      if (daysInactive > 60) confidence += 30;
      else if (daysInactive > 45) confidence += 20;
      else if (daysInactive > 30) confidence += 10;

      // Low relationship strength indicates higher churn risk
      if (contact.relationshipStrength < 30) confidence += 15;
      else if (contact.relationshipStrength < 50) confidence += 5;

      if (confidence < 40) continue; // Skip low risk

      suggestions.push({
        contactId: contact.id,
        suggestionType: SuggestionType.CHURN_RISK,
        confidence: Math.min(100, confidence),
        reason: `No activity for ${daysInactive} days with ${contact.relationshipStrength}% relationship strength`,
        suggestedAction: 'Reach out with re-engagement offer',
        metadata: {
          contactName: contact.displayName,
          daysInactive,
          lastActive: contact.lastInteractionAt,
        },
      });
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get dormant contact suggestions - contacts needing re-engagement
   */
  async getDormantSuggestions(
    workspaceId: string | null,
    limit: number = 20
  ): Promise<SmartSuggestion[]> {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.status IN (:...statuses)', {
        statuses: [ContactStatus.PENDING, ContactStatus.INVITED],
      })
      .andWhere('(contact.lastInteractionAt < :threshold OR contact.lastInteractionAt IS NULL)', {
        threshold: sixtyDaysAgo,
      })
      .orderBy('contact.createdAt', 'ASC')
      .take(limit)
      .getMany();

    return contacts.map((contact) => ({
      contactId: contact.id,
      suggestionType: SuggestionType.DORMANT,
      confidence: 70,
      reason: 'Pending invitation or no recent interaction',
      suggestedAction: 'Send reminder or fresh invitation',
      metadata: {
        contactName: contact.displayName,
        status: contact.status,
        createdAt: contact.createdAt,
      },
    }));
  }

  /**
   * Get segment insights for analytics
   */
  async getSegmentInsights(workspaceId: string | null): Promise<SegmentInsight[]> {
    const insights: SegmentInsight[] = [];

    // Get contacts by type using query builder
    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .getMany();

    // Group by contact type
    const typeGroups = new Map<ContactType, Contact[]>();
    for (const contact of contacts) {
      const existing = typeGroups.get(contact.contactType) || [];
      existing.push(contact);
      typeGroups.set(contact.contactType, existing);
    }

    // Generate insights for each segment
    for (const [contactType, typeContacts] of typeGroups) {
      const activeContacts = typeContacts.filter((c) => c.status === ContactStatus.ACTIVE).length;

      const avgStrength =
        typeContacts.reduce((sum, c) => sum + c.relationshipStrength, 0) / typeContacts.length;

      insights.push({
        segmentName: contactType,
        totalContacts: typeContacts.length,
        activeContacts,
        conversionRate: typeContacts.length > 0 ? (activeContacts / typeContacts.length) * 100 : 0,
        avgRelationshipStrength: avgStrength,
        topTypes: [contactType],
        recommendations: this.generateSegmentRecommendations(
          contactType,
          typeContacts.length,
          activeContacts,
          avgStrength
        ),
      });
    }

    return insights;
  }

  /**
   * Get all suggestions for a workspace
   */
  async getAllSuggestions(workspaceId: string | null): Promise<{
    conversions: SmartSuggestion[];
    referrals: SmartSuggestion[];
    churnRisks: SmartSuggestion[];
    dormant: SmartSuggestion[];
  }> {
    const [conversions, referrals, churnRisks, dormant] = await Promise.all([
      this.getConversionSuggestions(workspaceId, 10),
      this.getReferralSuggestions(workspaceId, 10),
      this.getChurnRiskSuggestions(workspaceId, 10),
      this.getDormantSuggestions(workspaceId, 10),
    ]);

    return { conversions, referrals, churnRisks, dormant };
  }

  /**
   * Generate conversion reason based on contact attributes
   */
  private getConversionReason(contact: Contact): string {
    const reasons: string[] = [];

    if (contact.relationshipStrength >= 70) {
      reasons.push('strong relationship');
    }
    if (contact.companyName) {
      reasons.push('has company affiliation');
    }
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      reasons.push('has valid phone');
    }
    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
      reasons.push('has email address');
    }
    if (contact.lastInteractionAt) {
      const days = Math.floor(
        (Date.now() - contact.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days < 14) {
        reasons.push('recently active');
      }
    }

    return reasons.length > 0 ? reasons.join(', ') : 'potential platform user';
  }

  /**
   * Generate recommendations for a segment
   */
  private generateSegmentRecommendations(
    type: ContactType,
    total: number,
    active: number,
    avgStrength: number
  ): string[] {
    const recommendations: string[] = [];

    if (total < 10) {
      recommendations.push('Focus on acquiring more contacts in this segment');
    }

    if (active / total < 0.5 && total > 0) {
      recommendations.push('Low activation rate - review onboarding flow');
    }

    if (avgStrength < 50) {
      recommendations.push('Improve relationship building strategies');
    }

    switch (type) {
      case ContactType.RIDER:
        recommendations.push('Consider referral incentives for rider network expansion');
        break;
      case ContactType.CUSTOMER:
        recommendations.push('Focus on upselling to high-value customers');
        break;
      case ContactType.BUSINESS:
        recommendations.push('Explore partnership opportunities');
        break;
    }

    return recommendations;
  }
}
