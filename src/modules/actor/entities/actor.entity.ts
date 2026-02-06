import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

import { ActorType } from '../dto/actor.enums';

/**
 * Actor Entity
 * Represents the Postgres persistence model for actors
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum type for actor type field
 */
@Entity('actors')
@Index(['type'])
@Index(['workspaceId'])
@Index(['createdAt'])
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class ActorEntity {
  @PrimaryColumn('uuid')
  id!: string; // actorId

  @Column('enum', { enum: ActorType })
  type!: ActorType;

  @Column('varchar', { unique: true })
  email!: string;

  @Column('varchar', { unique: true })
  username!: string;

  @Column('varchar')
  passwordHash!: string;

  @Column('varchar', { nullable: true })
  location?: string | null;

  @Column('uuid', { array: true, default: () => 'ARRAY[]::uuid[]' })
  roles!: string[]; // Array of role UUIDs

  @Column('uuid')
  workspaceId!: string;

  @Column('uuid', { array: true, default: () => 'ARRAY[]::uuid[]' })
  linkedWallets!: string[]; // Array of wallet UUIDs

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    actorId: string;
    type: ActorType;
    email: string;
    username: string;
    passwordHash: string;
    location: string | null;
    roles: string[];
    workspaceId: string;
    linkedWallets: string[];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      actorId: this.id,
      type: this.type,
      email: this.email,
      username: this.username,
      passwordHash: this.passwordHash,
      location: this.location ?? null,
      roles: this.roles,
      workspaceId: this.workspaceId,
      linkedWallets: this.linkedWallets,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    actorId: string;
    type: ActorType;
    email: string;
    username: string;
    passwordHash: string;
    location?: string | null;
    roles: string[];
    workspaceId: string;
    linkedWallets: string[];
    createdAt: Date;
  }): ActorEntity {
    const entity = new ActorEntity();
    entity.id = data.actorId;
    entity.type = data.type;
    entity.email = data.email;
    entity.username = data.username;
    entity.passwordHash = data.passwordHash;
    entity.location = data.location ?? null;
    entity.roles = data.roles;
    entity.workspaceId = data.workspaceId;
    entity.linkedWallets = data.linkedWallets;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
