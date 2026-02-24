import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContactRelationship } from './entities/contact-relationship.entity';
import { Contact } from './entities/contact.entity';
import { ImportBatch } from './entities/import-batch.entity';

import { ContactDeduplicationService } from './services/contact-deduplication.service';
import { ContactImportService } from './services/contact-import.service';
import { ContactRelationshipService } from './services/contact-relationship.service';
import { SmartSuggestionsService } from './services/smart-suggestions.service';

/**
 * ContactGraphModule
 *
 * Manages contact data and relationships:
 * - Contact import and normalization
 * - Deduplication and matching
 * - Relationship graph management
 * - Smart suggestions
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contact, ContactRelationship, ImportBatch])],
  providers: [
    ContactImportService,
    ContactDeduplicationService,
    ContactRelationshipService,
    SmartSuggestionsService,
  ],
  exports: [
    ContactImportService,
    ContactDeduplicationService,
    ContactRelationshipService,
    SmartSuggestionsService,
    TypeOrmModule,
  ],
})
export class ContactGraphModule {}
