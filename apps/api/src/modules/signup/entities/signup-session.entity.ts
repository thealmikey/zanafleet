import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ActorType } from '@api/modules/actor/dto/actor.enums';

import { SignUpSessionStatus } from '../dto/signup.enums';

/**
 * SignUp Session Entity
 * Tracks the progress of a multi-step sign-up process for actors
 */
@Entity('signup_sessions')
@Index(['status'])
@Index(['actorType'])
@Index(['expiresAt'])
export class SignUpSessionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('enum', { enum: SignUpSessionStatus })
  status!: SignUpSessionStatus;

  @Column('enum', { enum: ActorType })
  actorType!: ActorType;

  @Column('varchar', { nullable: true })
  email?: string | null;

  @Column('varchar', { nullable: true })
  username?: string | null;

  @Column('varchar', { nullable: true })
  passwordHash?: string | null;

  @Column('varchar', { nullable: true })
  location?: string | null;

  @Column('varchar', { nullable: true })
  workspaceName?: string | null;

  @Column('uuid', { array: true, default: () => 'ARRAY[]::uuid[]' })
  workspaceIds!: string[];

  @Column('varchar', { array: true, default: () => 'ARRAY[]::varchar[]' })
  roles!: string[];

  @Column('varchar', { array: true, default: () => 'ARRAY[]::varchar[]' })
  linkedWallets!: string[];

  @Column('varchar', { nullable: true })
  idempotencyKey?: string | null;

  @Column('varchar', { array: true, default: () => 'ARRAY[]::varchar[]' })
  completedSteps!: string[];

  @Column({ type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    sessionId: string;
    status: SignUpSessionStatus;
    actorType: ActorType;
    email: string | null;
    username: string | null;
    passwordHash: string | null;
    location: string | null;
    workspaceName: string | null;
    workspaceIds: string[];
    roles: string[];
    linkedWallets: string[];
    idempotencyKey: string | null | undefined;
    completedSteps: string[];
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      sessionId: this.id,
      status: this.status,
      actorType: this.actorType,
      email: this.email ?? null,
      username: this.username ?? null,
      passwordHash: this.passwordHash ?? null,
      location: this.location ?? null,
      workspaceName: this.workspaceName ?? null,
      workspaceIds: [...this.workspaceIds],
      roles: [...this.roles],
      linkedWallets: [...this.linkedWallets],
      idempotencyKey: this.idempotencyKey,
      completedSteps: [...this.completedSteps],
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    sessionId: string;
    status: SignUpSessionStatus;
    actorType: ActorType;
    email?: string | null;
    username?: string | null;
    passwordHash?: string | null;
    location?: string | null;
    workspaceName?: string | null;
    workspaceIds: string[];
    roles: string[];
    linkedWallets: string[];
    idempotencyKey?: string | null;
    completedSteps: string[];
    expiresAt: Date;
    createdAt: Date;
  }): SignUpSessionEntity {
    const entity = new SignUpSessionEntity();
    entity.id = data.sessionId;
    entity.status = data.status;
    entity.actorType = data.actorType;
    entity.email = data.email ?? null;
    entity.username = data.username ?? null;
    entity.passwordHash = data.passwordHash ?? null;
    entity.location = data.location ?? null;
    entity.workspaceName = data.workspaceName ?? null;
    entity.workspaceIds = data.workspaceIds;
    entity.roles = data.roles;
    entity.linkedWallets = data.linkedWallets;
    entity.idempotencyKey = data.idempotencyKey;
    entity.completedSteps = data.completedSteps;
    entity.expiresAt = data.expiresAt;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
