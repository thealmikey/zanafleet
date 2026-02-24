import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContactSource, ImportStatus } from '../dto/contact-graph.enums';
import { Contact } from '../entities/contact.entity';
import { ImportBatch } from '../entities/import-batch.entity';

export interface ParsedContact {
  displayName: string;
  phoneNumbers: string[];
  emailAddresses: string[];
  companyName?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  contactId?: string;
  action: 'created' | 'matched' | 'merged' | 'skipped' | 'failed';
  confidence?: number;
  error?: string;
}

/**
 * ContactImportService
 *
 * Handles parsing and normalization of contact imports from various sources:
 * - CSV files
 * - Device contacts (JSON)
 * - CRM exports
 * - Email address books
 */
@Injectable()
export class ContactImportService {
  private readonly logger = new Logger(ContactImportService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ImportBatch)
    private readonly importBatchRepository: Repository<ImportBatch>
  ) {}

  /**
   * Parse CSV contacts
   */
  async parseCsv(content: string): Promise<ParsedContact[]> {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have header row and at least one data row');
    }

    const headers = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const contacts: ParsedContact[] = [];

    // Map common column names
    const nameIdx = this.findColumnIndex(headers, [
      'name',
      'fullname',
      'full_name',
      'displayname',
      'display_name',
    ]);
    const phoneIdx = this.findColumnIndex(headers, [
      'phone',
      'phonenumber',
      'phone_number',
      'mobile',
      'tel',
      'telephone',
    ]);
    const emailIdx = this.findColumnIndex(headers, [
      'email',
      'emailaddress',
      'email_address',
      'mail',
    ]);
    const companyIdx = this.findColumnIndex(headers, [
      'company',
      'companyname',
      'company_name',
      'organization',
      'org',
    ]);
    const notesIdx = this.findColumnIndex(headers, ['notes', 'note', 'description', 'comments']);

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0) continue;

      const contact: ParsedContact = {
        displayName: nameIdx >= 0 && values[nameIdx] ? values[nameIdx] : `Contact ${i}`,
        phoneNumbers: phoneIdx >= 0 && values[phoneIdx] ? [values[phoneIdx]] : [],
        emailAddresses: emailIdx >= 0 && values[emailIdx] ? [values[emailIdx]] : [],
        companyName: companyIdx >= 0 ? values[companyIdx] || undefined : undefined,
        notes: notesIdx >= 0 ? values[notesIdx] : undefined,
      };

      // Normalize the contact
      this.normalizeContact(contact);

      if (contact.phoneNumbers.length > 0 || contact.emailAddresses.length > 0) {
        contacts.push(contact);
      }
    }

    return contacts;
  }

  /**
   * Parse device contacts (JSON format)
   */
  async parseDeviceContacts(data: Record<string, unknown>[]): Promise<ParsedContact[]> {
    return data
      .map((item): ParsedContact => {
        const phones = this.extractPhones(item.phones);
        const emails = this.extractEmails(item.emails);

        return {
          displayName: String(item.name || item.displayName || 'Unknown'),
          phoneNumbers: phones,
          emailAddresses: emails,
          companyName: item.company ? String(item.company) : undefined,
          metadata: {
            deviceId: item.id,
            source: 'device',
          },
        };
      })
      .filter((c) => c.phoneNumbers.length > 0 || c.emailAddresses.length > 0);
  }

  /**
   * Normalize contact data
   */
  normalizeContact(contact: ParsedContact): void {
    // Normalize phone numbers
    if (contact.phoneNumbers) {
      contact.phoneNumbers = contact.phoneNumbers
        .map((p) => this.normalizePhone(p))
        .filter((p) => p.length > 0);
    }

    // Normalize emails
    if (contact.emailAddresses) {
      contact.emailAddresses = contact.emailAddresses
        .map((e) => e.toLowerCase().trim())
        .filter((e) => this.isValidEmail(e));
    }

    // Clean display name
    if (contact.displayName) {
      contact.displayName = contact.displayName.trim();
      if (contact.displayName.length === 0) {
        contact.displayName = 'Unknown';
      }
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhone(phone: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle Kenya numbers (default country code)
    // Convert 07XX XXX XXX to +2547XX XXX XXX
    if (/^0\d{9}$/.test(cleaned)) {
      cleaned = '+254' + cleaned.substring(1);
    }
    // Convert 7XX XXX XXX to +2547XX XXX XXX
    if (/^7\d{8}$/.test(cleaned)) {
      cleaned = '+254' + cleaned;
    }
    // Add + if missing
    if (/^\d{9,12}$/.test(cleaned)) {
      cleaned = '+254' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extract phones from different formats
   */
  private extractPhones(phones: unknown): string[] {
    if (!phones) return [];
    if (Array.isArray(phones)) {
      return phones.map((p) => String(p)).filter((p) => p.length > 0);
    }
    return [String(phones)];
  }

  /**
   * Extract emails from different formats
   */
  private extractEmails(emails: unknown): string[] {
    if (!emails) return [];
    if (Array.isArray(emails)) {
      return emails.map((e) => String(e)).filter((e) => e.length > 0);
    }
    return [String(emails)];
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Find column index by possible names
   */
  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  /**
   * Create import batch
   */
  async createImportBatch(
    workspaceId: string,
    userId: string,
    source: ContactSource
  ): Promise<ImportBatch> {
    const batch = this.importBatchRepository.create({
      workspaceId,
      initiatedById: userId,
      source,
      status: ImportStatus.PENDING,
      totalRecords: 0,
    });

    return this.importBatchRepository.save(batch);
  }

  /**
   * Update import batch progress
   */
  async updateBatchProgress(
    batchId: string,
    updates: {
      status?: ImportStatus;
      totalRecords?: number;
      processedRecords?: number;
      matchedRecords?: number;
      newRecords?: number;
      duplicateRecords?: number;
      failedRecords?: number;
      errorSummary?: string;
    }
  ): Promise<ImportBatch | null> {
    const updateData: Record<string, unknown> = { ...updates };

    if (updates.status === ImportStatus.COMPLETED || updates.status === ImportStatus.FAILED) {
      updateData['completedAt'] = new Date();
    }

    await this.importBatchRepository.update(batchId, updateData as any);
    return this.importBatchRepository.findOneBy({ id: batchId });
  }
}
