import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { WorkspaceStatus, WorkspaceType } from '../dto/workspace.enums';

/**
 * Workspace Entity
 * Represents the Postgres persistence model for workspaces
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Foreign key reference to organization (orgId)
 */
@Entity('workspaces')
@Index(['orgId'])
@Index(['type'])
@Index(['createdAt'])
export class WorkspaceEntity {
  @PrimaryColumn('uuid')
  id!: string; // workspaceId

  @Column('uuid')
  orgId!: string; // Parent organization UUID

  @Column('varchar', { length: 255 })
  name!: string;

  @Column({
    type: 'enum',
    enum: WorkspaceType,
  })
  type!: WorkspaceType;

  @Column({
    type: 'enum',
    enum: WorkspaceStatus,
    default: WorkspaceStatus.ACTIVE,
  })
  status!: WorkspaceStatus;

  @Column('uuid', { array: true, default: () => "ARRAY[]::uuid[]" })
  roleTemplates!: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    workspaceId: string;
    orgId: string;
    name: string;
    type: WorkspaceType;
    status: WorkspaceStatus;
    roleTemplates: string[];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      workspaceId: this.id,
      orgId: this.orgId,
      name: this.name,
      type: this.type,
      status: this.status,
      roleTemplates: this.roleTemplates,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    workspaceId: string;
    orgId: string;
    name: string;
    type: WorkspaceType;
    status: WorkspaceStatus;
    roleTemplates: string[];
    createdAt: Date;
  }): WorkspaceEntity {
    const entity = new WorkspaceEntity();
    entity.id = data.workspaceId;
    entity.orgId = data.orgId;
    entity.name = data.name;
    entity.type = data.type;
    entity.status = data.status;
    entity.roleTemplates = data.roleTemplates;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
