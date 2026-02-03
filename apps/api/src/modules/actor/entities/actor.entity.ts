import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

import { ActorType } from '../dto/actor.enums';

/**
 * Actor Entity
 * Represents the Postgres persistence model for actors
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Unique constraint on email
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum type for actor type field
 */
@Entity('actors')
@Unique('UQ_actor_email', ['email'])
@Index(['workspaceId'])
@Index(['type'])
@Index(['createdAt'])
export class ActorEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  email!: string;

  @Column('varchar', { length: 255 })
  username!: string;

  @Column('enum', { enum: ActorType })
  type!: ActorType;

  @Column('uuid', { nullable: true })
  workspaceId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    actorId: string;
    email: string;
    username: string;
    type: ActorType;
    workspaceId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      actorId: this.id,
      email: this.email,
      username: this.username,
      type: this.type,
      workspaceId: this.workspaceId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    actorId: string;
    email: string;
    username: string;
    type: ActorType;
    workspaceId: string | null;
    createdAt: Date;
  }): ActorEntity {
    const entity = new ActorEntity();
    entity.id = data.actorId;
    entity.email = data.email;
    entity.username = data.username;
    entity.type = data.type;
    entity.workspaceId = data.workspaceId;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
