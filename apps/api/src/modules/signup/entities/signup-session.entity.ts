import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';


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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

  @Column('varchar', { length: 255, nullable: true })
  fullName?: string | null;

  @Column('varchar', { length: 20, nullable: true })
  nationalId?: string | null;

  @Column('varchar', { length: 20, nullable: true })
  phone?: string | null;

  @Column('uuid', { nullable: true })
  saccoId?: string | null;

  @Column('varchar', { length: 255, nullable: true })
  businessName?: string | null;

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
    fullName: string | null;
    nationalId: string | null;
    phone: string | null;
    saccoId: string | null;
    businessName: string | null;
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      actorType: this.actorType,
      email: this.email ?? null,
      username: this.username ?? null,
      passwordHash: this.passwordHash ?? null,
      location: this.location ?? null,
      workspaceName: this.workspaceName ?? null,
      fullName: this.fullName ?? null,
      nationalId: this.nationalId ?? null,
      phone: this.phone ?? null,
      saccoId: this.saccoId ?? null,
      businessName: this.businessName ?? null,
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
    fullName?: string | null;
    nationalId?: string | null;
    phone?: string | null;
    saccoId?: string | null;
    businessName?: string | null;
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    entity.actorType = data.actorType;
    entity.email = data.email ?? null;
    entity.username = data.username ?? null;
    entity.passwordHash = data.passwordHash ?? null;
    entity.location = data.location ?? null;
    entity.workspaceName = data.workspaceName ?? null;
    entity.fullName = data.fullName ?? null;
    entity.nationalId = data.nationalId ?? null;
    entity.phone = data.phone ?? null;
    entity.saccoId = data.saccoId ?? null;
    entity.businessName = data.businessName ?? null;
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
