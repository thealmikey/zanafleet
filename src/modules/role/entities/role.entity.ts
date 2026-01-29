import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

import { RoleScope } from '../dto/role.enums';

/**
 * Role Entity
 * Represents the Postgres persistence model for roles
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Unique constraint on (name, scope) to prevent duplicates
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum type for scope field
 */
@Entity('roles')
@Unique('UQ_role_name_scope', ['name', 'scope'])
@Index(['scope'])
@Index(['createdAt'])
export class RoleEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { array: true, default: () => "ARRAY[]::varchar[]" })
  permissions!: string[];

  @Column('enum', { enum: RoleScope })
  scope!: RoleScope;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    roleId: string;
    name: string;
    permissions: string[];
    scope: RoleScope;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      roleId: this.id,
      name: this.name,
      permissions: this.permissions,
      scope: this.scope,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    roleId: string;
    name: string;
    permissions: string[];
    scope: RoleScope;
    createdAt: Date;
  }): RoleEntity {
    const entity = new RoleEntity();
    entity.id = data.roleId;
    entity.name = data.name;
    entity.permissions = data.permissions;
    entity.scope = data.scope;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
