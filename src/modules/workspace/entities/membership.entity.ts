import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

import { MembershipRole } from '../dto/workspace.enums';

/**
 * Membership Entity
 * Represents the relationship between an actor and a workspace
 *
 * TypeORM entity with best practices:
 * - Composite primary key (actorId + workspaceId)
 * - Indexed on workspaceId for efficient lookups
 * - Role enum for type-safe membership roles
 */
@Entity('memberships')
@Index(['workspaceId'])
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
   * Convert entity to domain object
   */
  toDomain(): {
    actorId: string;
    workspaceId: string;
    role: MembershipRole;
    since: Date;
  } {
    return {
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      role: this.role,
      since: this.since,
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
  }): MembershipEntity {
    const entity = new MembershipEntity();
    entity.actorId = data.actorId;
    entity.workspaceId = data.workspaceId;
    entity.role = data.role;
    entity.since = data.since;
    return entity;
  }
}
