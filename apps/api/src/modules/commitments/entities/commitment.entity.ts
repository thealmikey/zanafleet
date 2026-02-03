import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { CommitmentStatus, CommitmentType } from '../dto/commitment.enums';

/**
 * Commitment Entity
 * Represents the Postgres persistence model for commitments
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Foreign key references to actor and workspace
 */
@Entity('commitments')
@Index(['actorId'])
@Index(['workspaceId'])
@Index(['status'])
@Index(['dueAt'])
export class CommitmentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  actorId!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column({
    type: 'enum',
    enum: CommitmentType,
  })
  type!: CommitmentType;

  @Column({
    type: 'enum',
    enum: CommitmentStatus,
    default: CommitmentStatus.PENDING,
  })
  status!: CommitmentStatus;

  @Column('varchar', { length: 1000 })
  description!: string;

  @Column({ type: 'timestamp with time zone' })
  dueAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fulfilledAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  breachedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    commitmentId: string;
    actorId: string;
    workspaceId: string;
    type: CommitmentType;
    status: CommitmentStatus;
    description: string;
    dueAt: Date;
    fulfilledAt: Date | null;
    breachedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      commitmentId: this.id,
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      type: this.type,
      status: this.status,
      description: this.description,
      dueAt: this.dueAt,
      fulfilledAt: this.fulfilledAt,
      breachedAt: this.breachedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    commitmentId: string;
    actorId: string;
    workspaceId: string;
    type: CommitmentType;
    status: CommitmentStatus;
    description: string;
    dueAt: Date;
    fulfilledAt?: Date | null;
    breachedAt?: Date | null;
    createdAt: Date;
  }): CommitmentEntity {
    const entity = new CommitmentEntity();
    entity.id = data.commitmentId;
    entity.actorId = data.actorId;
    entity.workspaceId = data.workspaceId;
    entity.type = data.type;
    entity.status = data.status;
    entity.description = data.description;
    entity.dueAt = data.dueAt;
    entity.fulfilledAt = data.fulfilledAt ?? null;
    entity.breachedAt = data.breachedAt ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
