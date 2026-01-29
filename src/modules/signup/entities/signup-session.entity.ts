import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ActorType } from '../../actor/dto/actor.enums';
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

  @Column('uuid', { nullable: true })
  workspaceId?: string | null;

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
  toDomain() {
    return {
      sessionId: this.id,
      status: this.status,
      actorType: this.actorType,
      workspaceId: this.workspaceId,
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
    workspaceId?: string | null;
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
    entity.workspaceId = data.workspaceId;
    entity.roles = data.roles;
    entity.linkedWallets = data.linkedWallets;
    entity.idempotencyKey = data.idempotencyKey;
    entity.completedSteps = data.completedSteps;
    entity.expiresAt = data.expiresAt;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
