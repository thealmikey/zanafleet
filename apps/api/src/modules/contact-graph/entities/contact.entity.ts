import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ContactSource, ContactStatus, ContactType } from '../dto/contact-graph.enums';
import { ContactRelationship } from './contact-relationship.entity';

/**
 * Contact Entity
 *
 * Represents a contact in the platform. Can be:
 * - Global (workspaceId = null): Available platform-wide
 * - Workspace-scoped (workspaceId = UUID): Visible only within workspace
 *
 * Privacy: No cross-workspace data leakage. Global contacts require consent.
 */
@Entity('contacts')
@Index(['workspaceId', 'status'])
@Index(['phoneNumbers'], { isUnique: false, where: `phoneNumbers IS NOT NULL` })
@Index(['emailAddresses'], { isUnique: false, where: `emailAddresses IS NOT NULL` })
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Scope: null = global, UUID = workspace-specific
  @Column('uuid', { nullable: true })
  @Index()
  workspaceId!: string | null;

  @Column({
    type: 'enum',
    enum: ContactSource,
    default: ContactSource.MANUAL,
  })
  source!: ContactSource;

  @Column({ length: 255, nullable: true })
  externalId!: string | null; // ID from source system

  // Identity Fields
  @Column({ length: 255 })
  displayName!: string;

  // Stored as JSON array: ['+254712345678', '+254733999888']
  @Column('simple-array', { nullable: true })
  phoneNumbers!: string[] | null;

  // Stored as JSON array: ['email@example.com']
  @Column('simple-array', { nullable: true })
  emailAddresses!: string[] | null;

  @Column({ length: 255, nullable: true })
  companyName!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Contact Classification
  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.UNCLASSIFIED,
  })
  contactType!: ContactType;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.PENDING,
  })
  status!: ContactStatus;

  // Relationship Context
  @Column('int', { default: 0 })
  relationshipStrength!: number; // 0-100

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastInteractionAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastSeenAt!: Date | null; // Last time contact was seen/imported

  // Referral tracking
  @Column('uuid', { nullable: true })
  referralSourceId!: string | null;

  @Column({ length: 50, nullable: true })
  referralCode!: string | null;

  // Matching to Platform User
  @Column('uuid', { nullable: true })
  @Index()
  matchedUserId!: string | null; // If matched to platform user

  // Deduplication
  @Column('uuid', { nullable: true })
  mergeGroupId!: string | null; // For deduplicated contacts

  @Column('int', { default: 0 })
  confidenceScore!: number; // Match confidence 0-100

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ default: false })
  isOptedIn!: boolean; // Consent for visibility

  // Workspace access control
  @Column('simple-array', { nullable: true })
  accessibleWorkspaces!: string[] | null; // For cross-workspace visibility

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // Import tracking
  @Column({ type: 'uuid', nullable: true })
  importBatchId!: string | null;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToMany(() => ContactRelationship, (rel) => rel.fromContact)
  outgoingRelationships!: ContactRelationship[];

  @OneToMany(() => ContactRelationship, (rel) => rel.toContact)
  incomingRelationships!: ContactRelationship[];

  /**
   * Check if contact is globally visible
   */
  isGlobal(): boolean {
    return this.workspaceId === null;
  }

  /**
   * Check if contact has been matched to a platform user
   */
  isMatched(): boolean {
    return this.matchedUserId !== null;
  }

  /**
   * Get primary phone number
   */
  getPrimaryPhone(): string | null {
    return this.phoneNumbers?.[0] || null;
  }

  /**
   * Get primary email
   */
  getPrimaryEmail(): string | null {
    return this.emailAddresses?.[0] || null;
  }

  /**
   * Check if contact can be shown in other workspaces
   */
  canBeShared(): boolean {
    return this.isVerified && this.isOptedIn && this.isMatched();
  }
}
