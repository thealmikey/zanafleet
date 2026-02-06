import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

import { RequirementType } from '../dto/formation.enums';

@Entity('requirements')
export class RequirementEntity {
  @PrimaryColumn('uuid')
  requirementId!: string;

  @Column('varchar', { length: 255 })
  entityType!: string;

  @Column('uuid')
  entityId!: string;

  @Column({
    type: 'enum',
    enum: RequirementType,
  })
  type!: RequirementType;

  @Column('varchar', { length: 255 })
  key!: string;

  @Column('text')
  description!: string;

  @Column('boolean', { default: true })
  blocking!: boolean;

  @Column('boolean', { default: false })
  satisfied!: boolean;

  @Column('uuid', { nullable: true })
  targetEntityId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  toDomain(): {
    requirementId: string;
    entityType: string;
    entityId: string;
    type: RequirementType;
    key: string;
    description: string;
    blocking: boolean;
    satisfied: boolean;
    targetEntityId: string | null;
    createdAt: Date;
  } {
    return {
      requirementId: this.requirementId,
      entityType: this.entityType,
      entityId: this.entityId,
      type: this.type,
      key: this.key,
      description: this.description,
      blocking: this.blocking,
      satisfied: this.satisfied,
      targetEntityId: this.targetEntityId,
      createdAt: this.createdAt,
    };
  }

  static fromDomain(data: {
    requirementId: string;
    entityType: string;
    entityId: string;
    type: RequirementType;
    key: string;
    description: string;
    blocking?: boolean;
    satisfied?: boolean;
    targetEntityId?: string | null;
    createdAt?: Date;
  }): RequirementEntity {
    const entity = new RequirementEntity();
    entity.requirementId = data.requirementId;
    entity.entityType = data.entityType;
    entity.entityId = data.entityId;
    entity.type = data.type;
    entity.key = data.key;
    entity.description = data.description;
    entity.blocking = data.blocking ?? true;
    entity.satisfied = data.satisfied ?? false;
    entity.targetEntityId = data.targetEntityId ?? null;
    if (data.createdAt) {
      entity.createdAt = data.createdAt;
    }
    return entity;
  }
}
