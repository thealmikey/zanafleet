import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { MembershipRole } from '../dto/workspace.enums';

/**
 * Membership Entity
 * Represents the relationship between an actor and a workspace
 *
 * TypeORM entity with best practices:
 * - Composite primary key (actorId + workspaceId)
 * - Indexed on workspaceId for efficient lookups
 * - Role enum for type-safe membership roles
 * - defaultWorkspaceId for login context resolution
 */
@Entity('memberships')
@Index(['workspaceId'])
@Index(['actorId'])
@Index(['defaultWorkspace'])
export class MembershipEntity {
  @PrimaryColumn('uuid')
  actorId!: string;

  @PrimaryColumn('uuid')
  workspaceId!: string;

  @Column({
    type: 'enum',
    enum: MembershipRole,
  })
  role!: MembershipRole;

  @Column({ type: 'timestamp with time zone' })
  since!: Date;

  /**
   * If true, this is the actor's default workspace on login.
   * Only ONE membership should have this set to true per actor.
   */
  @Column({ type: 'boolean', default: false })
  defaultWorkspace!: boolean;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    actorId: string;
    workspaceId: string;
    role: MembershipRole;
    since: Date;
    defaultWorkspace: boolean;
  } {
    return {
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      role: this.role,
      since: this.since,
      defaultWorkspace: this.defaultWorkspace,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    actorId: string;
    workspaceId: string;
    role: MembershipRole;
    since: Date;
    defaultWorkspace?: boolean;
  }): MembershipEntity {
    const entity = new MembershipEntity();
    entity.actorId = data.actorId;
    entity.workspaceId = data.workspaceId;
    entity.role = data.role;
    entity.since = data.since;
    entity.defaultWorkspace = data.defaultWorkspace ?? false;
    return entity;
  }
}
