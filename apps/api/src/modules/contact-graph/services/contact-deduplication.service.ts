import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactStatus, MatchConfidence } from '../dto/contact-graph.enums';
import { ContactRelationship } from '../entities/contact-relationship.entity';
import { Contact } from '../entities/contact.entity';
import { ContactImportService, ImportResult, ParsedContact } from './contact-import.service';

/**
 * BlockingKey: Phone number normalized to blocking key format
 */
export interface BlockingKey {
  phoneKey: string | null;
  emailKey: string | null;
}

/**
 * DeduplicationResult: Result of deduplication check
 */
export interface DeduplicationResult {
  isDuplicate: boolean;
  matchedContactId: string | null;
  confidence: MatchConfidence;
  matchReason: string;
}

/**
 * MatchCandidate: Potential match for a contact
 */
export interface MatchCandidate {
  contact: Contact;
  confidence: MatchConfidence;
  matchFields: string[];
}

/**
 * ContactDeduplicationService
 *
 * Handles deduplication and matching of contacts using:
 * - Blocking keys (phone prefix, email domain)
 * - Similarity scoring (Levenshtein distance)
 * - Confidence thresholds for automatic vs manual matching
 */
@Injectable()
export class ContactDeduplicationService {
  private readonly logger = new Logger(ContactDeduplicationService.name);

  // Confidence thresholds
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.9;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.7;
  private readonly LOW_CONFIDENCE_THRESHOLD = 0.5;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactRelationship)
    private readonly relationshipRepository: Repository<ContactRelationship>,
    private readonly importService: ContactImportService
  ) {}

  /**
   * Generate blocking keys for a contact
   */
  generateBlockingKey(contact: ParsedContact): BlockingKey {
    // Phone key: First 7 digits (area code + prefix)
    let phoneKey: string | null = null;
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const normalized = this.importService.normalizePhone(contact.phoneNumbers[0]);
      if (normalized.length >= 7) {
        phoneKey = normalized.substring(0, 7);
      }
    }

    // Email key: Domain + first part of local part
    let emailKey: string | null = null;
    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
      const email = contact.emailAddresses[0];
      const atIdx = email.indexOf('@');
      if (atIdx > 0) {
        const localPart = email.substring(0, atIdx);
        const domain = email.substring(atIdx + 1).toLowerCase();
        // Use first 3 chars of local + domain as key
        const prefix = localPart.substring(0, Math.min(3, localPart.length));
        emailKey = `${prefix}@${domain}`;
      }
    }

    return { phoneKey, emailKey };
  }

  /**
   * Generate blocking key for existing contact
   */
  generateContactBlockingKey(contact: Contact): BlockingKey {
    const parsed: ParsedContact = {
      displayName: contact.displayName,
      phoneNumbers: contact.phoneNumbers || [],
      emailAddresses: contact.emailAddresses || [],
    };
    return this.generateBlockingKey(parsed);
  }

  /**
   * Find potential matches using blocking
   */
  async findBlockingMatches(
    workspaceId: string | null,
    blockingKey: BlockingKey
  ): Promise<Contact[]> {
    const queries: any[] = [];

    if (blockingKey.phoneKey) {
      queries.push(
        this.contactRepository
          .createQueryBuilder('contact')
          .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
          .andWhere('contact.phoneNumbers IS NOT NULL')
          .andWhere(
            `EXISTS (SELECT 1 FROM unnest(contact.phoneNumbers) AS phone WHERE SUBSTRING(phone, 1, 7) = :phoneKey)`,
            { phoneKey: blockingKey.phoneKey }
          )
          .getMany()
      );
    }

    if (blockingKey.emailKey) {
      const [localPart, domain] = blockingKey.emailKey.split('@');
      queries.push(
        this.contactRepository
          .createQueryBuilder('contact')
          .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
          .andWhere('contact.emailAddresses IS NOT NULL')
          .andWhere(
            `EXISTS (SELECT 1 FROM unnest(contact.emailAddresses) AS email WHERE email LIKE :emailPattern)`,
            { emailPattern: `${localPart}%@${domain}` }
          )
          .getMany()
      );
    }

    if (queries.length === 0) {
      return [];
    }

    // Get unique contacts from all queries
    const results = await Promise.all(queries);
    const contactMap = new Map<string, Contact>();

    for (const result of results) {
      for (const contact of result) {
        contactMap.set(contact.id, contact);
      }
    }

    return Array.from(contactMap.values());
  }

  /**
   * Calculate similarity score between two contacts
   */
  calculateSimilarity(
    newContact: ParsedContact,
    existingContact: Contact
  ): { score: number; matchedFields: string[] } {
    const matchedFields: string[] = [];
    let totalScore = 0;
    let weightCount = 0;

    // Name similarity (weight: 0.4)
    const nameSimilarity = this.calculateStringSimilarity(
      newContact.displayName.toLowerCase(),
      existingContact.displayName.toLowerCase()
    );
    if (nameSimilarity > 0.7) {
      matchedFields.push('displayName');
    }
    totalScore += nameSimilarity * 0.4;
    weightCount += 0.4;

    // Phone exact match (weight: 0.4)
    if (newContact.phoneNumbers.length > 0 && existingContact.phoneNumbers) {
      const phoneMatches = this.findPhoneMatches(
        newContact.phoneNumbers,
        existingContact.phoneNumbers
      );
      if (phoneMatches.exact > 0) {
        matchedFields.push('phoneNumbers');
        totalScore += 0.4;
      } else if (phoneMatches.partial > 0) {
        totalScore += 0.2;
      }
      weightCount += 0.4;
    }

    // Email exact match (weight: 0.2)
    if (newContact.emailAddresses.length > 0 && existingContact.emailAddresses) {
      const emailMatches = this.findEmailMatches(
        newContact.emailAddresses,
        existingContact.emailAddresses
      );
      if (emailMatches > 0) {
        matchedFields.push('emailAddresses');
        totalScore += 0.2;
      }
      weightCount += 0.2;
    }

    // Normalize by actual weights used
    const normalizedScore = weightCount > 0 ? totalScore / weightCount : 0;

    return {
      score: normalizedScore,
      matchedFields,
    };
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[str1.length][str2.length];
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Find exact and partial phone matches
   */
  findPhoneMatches(
    newPhones: string[],
    existingPhones: string[]
  ): { exact: number; partial: number } {
    let exact = 0;
    let partial = 0;

    for (const newPhone of newPhones) {
      const normalizedNew = this.importService.normalizePhone(newPhone);

      for (const existingPhone of existingPhones) {
        const normalizedExisting = this.importService.normalizePhone(existingPhone);

        if (normalizedNew === normalizedExisting) {
          exact++;
        } else if (
          normalizedNew.length >= 9 &&
          normalizedExisting.length >= 9 &&
          normalizedNew.substring(normalizedNew.length - 9) ===
            normalizedExisting.substring(normalizedExisting.length - 9)
        ) {
          // Last 9 digits match (local number)
          partial++;
        }
      }
    }

    return { exact, partial };
  }

  /**
   * Find exact email matches
   */
  findEmailMatches(newEmails: string[], existingEmails: string[]): number {
    let matches = 0;

    for (const newEmail of newEmails) {
      const normalizedNew = newEmail.toLowerCase().trim();

      for (const existingEmail of existingEmails) {
        const normalizedExisting = existingEmail.toLowerCase().trim();

        if (normalizedNew === normalizedExisting) {
          matches++;
        }
      }
    }

    return matches;
  }

  /**
   * Convert numeric score to confidence enum
   */
  scoreToConfidence(score: number): MatchConfidence {
    if (score >= this.HIGH_CONFIDENCE_THRESHOLD) {
      return MatchConfidence.EXACT;
    } else if (score >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      return MatchConfidence.PROBABLE;
    } else if (score >= this.LOW_CONFIDENCE_THRESHOLD) {
      return MatchConfidence.POSSIBLE;
    }
    return MatchConfidence.UNLIKELY;
  }

  /**
   * Check if contact is duplicate and get match info
   */
  async checkDeduplication(
    workspaceId: string | null,
    contact: ParsedContact
  ): Promise<DeduplicationResult> {
    const blockingKey = this.generateBlockingKey(contact);
    const candidates = await this.findBlockingMatches(workspaceId, blockingKey);

    if (candidates.length === 0) {
      return {
        isDuplicate: false,
        matchedContactId: null,
        confidence: MatchConfidence.UNLIKELY,
        matchReason: 'No blocking matches found',
      };
    }

    // Find best match
    let bestMatch: MatchCandidate | null = null;

    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(contact, candidate);
      const confidence = this.scoreToConfidence(similarity.score);

      if (confidence !== MatchConfidence.UNLIKELY) {
        if (!bestMatch || similarity.score > bestMatch.confidence) {
          bestMatch = {
            contact: candidate,
            confidence,
            matchFields: similarity.matchedFields,
          };
        }
      }
    }

    if (bestMatch) {
      const isHighConfidence =
        bestMatch.confidence === MatchConfidence.EXACT ||
        bestMatch.confidence === MatchConfidence.HIGH;

      return {
        isDuplicate: isHighConfidence,
        matchedContactId: bestMatch.contact.id,
        confidence: bestMatch.confidence,
        matchReason: `Matched on: ${bestMatch.matchFields.join(', ')}`,
      };
    }

    return {
      isDuplicate: false,
      matchedContactId: null,
      confidence: MatchConfidence.UNLIKELY,
      matchReason: 'No similarity above threshold',
    };
  }

  /**
   * Process a single contact (create or match)
   */
  async processContact(workspaceId: string | null, contact: ParsedContact): Promise<ImportResult> {
    // Check for duplicates
    const dedupResult = await this.checkDeduplication(workspaceId, contact);

    if (dedupResult.isDuplicate && dedupResult.matchedContactId) {
      // Update matched contact - just update status
      await this.contactRepository.update(dedupResult.matchedContactId, {
        status: ContactStatus.ACTIVE,
      } as any);

      return {
        success: true,
        contactId: dedupResult.matchedContactId,
        action: 'matched',
        confidence: this.confidenceToNumber(dedupResult.confidence),
      };
    }

    // Create new contact
    const newContact = this.contactRepository.create({
      workspaceId,
      displayName: contact.displayName,
      phoneNumbers: contact.phoneNumbers,
      emailAddresses: contact.emailAddresses,
      companyName: contact.companyName || null,
      notes: contact.notes || null,
      contactType: 'UNCLASSIFIED' as any, // Default type
      status: ContactStatus.ACTIVE,
      metadata: contact.metadata || {},
      matchedUserId: null,
      relationshipStrength: 0,
    });

    const saved = await this.contactRepository.save(newContact);

    return {
      success: true,
      contactId: saved.id,
      action: 'created',
      confidence: 1.0,
    };
  }

  /**
   * Convert confidence enum to number
   */
  private confidenceToNumber(confidence: MatchConfidence): number {
    switch (confidence) {
      case MatchConfidence.EXACT:
        return 1.0;
      case MatchConfidence.HIGH:
      case MatchConfidence.VERY_HIGH:
        return 0.95;
      case MatchConfidence.HIGH_PROBABILITY:
        return 0.8;
      case MatchConfidence.PROBABLE:
        return 0.7;
      case MatchConfidence.POSSIBLE:
        return 0.5;
      default:
        return 0.3;
    }
  }
}
