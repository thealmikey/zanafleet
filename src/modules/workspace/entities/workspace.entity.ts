import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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
@Index(['createdAt'])
export class WorkspaceEntity {
  @PrimaryColumn('uuid')
  id!: string; // workspaceId

  @Column('uuid')
  orgId!: string; // Parent organization UUID

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('uuid', { array: true, default: () => 'ARRAY[]::uuid[]' })
  roleTemplates!: string[]; // Array of role template UUIDs

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
    roleTemplates: string[];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      workspaceId: this.id,
      orgId: this.orgId,
      name: this.name,
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
    roleTemplates: string[];
    createdAt: Date;
  }): WorkspaceEntity {
    const entity = new WorkspaceEntity();
    entity.id = data.workspaceId;
    entity.orgId = data.orgId;
    entity.name = data.name;
    entity.roleTemplates = data.roleTemplates;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
