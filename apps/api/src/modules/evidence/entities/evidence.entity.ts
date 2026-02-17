import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

import { EvidenceType, SubjectType, EvidenceSource } from '../dto/evidence.enums';

/**
 * Evidence Entity
 * Represents the Postgres persistence model for evidence records
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - JSONB payload for flexible data storage
 * - Unique commandId for idempotency
 * - Immutable records (no updatedAt)
 */
@Entity('evidence')
@Index(['actorId'])
@Index(['workspaceId'])
@Index(['subjectId'])
@Index(['createdAt'])
export class EvidenceEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('enum', { enum: EvidenceType })
  type!: EvidenceType;

  @Column('uuid')
  actorId!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('enum', { enum: SubjectType })
  subjectType!: SubjectType;

  @Column('uuid')
  subjectId!: string;

  @Column('simple-json')
  payload!: Record<string, unknown>;

  @Column('enum', { enum: EvidenceSource })
  source!: EvidenceSource;

  @Column('uuid', { unique: true })
  commandId!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    evidenceId: string;
    type: EvidenceType;
    actorId: string;
    workspaceId: string;
    subjectType: SubjectType;
    subjectId: string;
    payload: Record<string, unknown>;
    source: EvidenceSource;
    commandId: string;
    createdAt: Date;
  } {
    return {
      evidenceId: this.id,
      type: this.type,
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      payload: this.payload,
      source: this.source,
      commandId: this.commandId,
      createdAt: this.createdAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    evidenceId: string;
    type: EvidenceType;
    actorId: string;
    workspaceId: string;
    subjectType: SubjectType;
    subjectId: string;
    payload: Record<string, unknown>;
    source: EvidenceSource;
    commandId: string;
    createdAt: Date;
  }): EvidenceEntity {
    const entity = new EvidenceEntity();
    entity.id = data.evidenceId;
    entity.type = data.type;
    entity.actorId = data.actorId;
    entity.workspaceId = data.workspaceId;
    entity.subjectType = data.subjectType;
    entity.subjectId = data.subjectId;
    entity.payload = data.payload;
    entity.source = data.source;
    entity.commandId = data.commandId;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
