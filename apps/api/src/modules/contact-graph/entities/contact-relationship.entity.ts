import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { RelationshipType } from '../dto/contact-graph.enums';
import { Contact } from './contact.entity';

/**
 * ContactRelationship Entity
 *
 * Represents a directed relationship between two contacts or
 * between a contact and a user/workspace.
 *
 * Graph Edge Model for Neo4j-style relationships stored in Postgres
 * for performance and auditability.
 */
@Entity('contact_relationships')
@Index(['fromContactId', 'toContactId', 'relationshipType'], { unique: true })
@Index(['toContactId', 'relationshipType'])
@Index(['workspaceId', 'relationshipType'])
export class ContactRelationship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  fromContactId!: string;

  @Column('uuid')
  toContactId!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column({
    type: 'enum',
    enum: RelationshipType,
  })
  relationshipType!: RelationshipType;

  // Relationship properties
  @Column('int', { default: 0 })
  strength!: number; // 0-100 relationship strength

  @Column({ type: 'timestamp', nullable: true })
  establishedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastInteractionAt!: Date | null;

  @Column('int', { default: 0 })
  interactionCount!: number;

  // For referral tracking
  @Column({ length: 50, nullable: true })
  referralCode!: string | null;

  @Column('decimal', { precision: 18, scale: 2, default: '0' })
  attributedRevenue!: string;

  // For SHARES_RIDERS_WITH
  @Column('int', { default: 0 })
  sharedRiderCount!: number;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // Audit
  @Column('uuid', { nullable: true })
  createdById!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => Contact, (contact) => contact.outgoingRelationships)
  @JoinColumn({ name: 'fromContactId' })
  fromContact!: Contact;

  @ManyToOne(() => Contact, (contact) => contact.incomingRelationships)
  @JoinColumn({ name: 'toContactId' })
  toContact!: Contact;

  /**
   * Update relationship based on new interaction
   */
  recordInteraction(): void {
    this.interactionCount += 1;
    this.lastInteractionAt = new Date();

    // Recalculate strength with recency weighting
    const recencyWeight = this.interactionCount > 10 ? 1.0 : this.interactionCount / 10;
    this.strength = Math.min(100, Math.round(this.strength * 0.9 + 10 * recencyWeight));
  }
}
