import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { FormationState } from '../dto/formation.enums';

@Entity('formation_statuses')
export class FormationStatusEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  entityType!: string;

  @Column('uuid')
  entityId!: string;

  @Column({
    type: 'enum',
    enum: FormationState,
    default: FormationState.DRAFT,
  })
  state!: FormationState;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  lastEvaluatedAt!: Date;

  toDomain(): {
    formationStatusId: string;
    entityType: string;
    entityId: string;
    state: FormationState;
    lastEvaluatedAt: Date;
  } {
    return {
      formationStatusId: this.id,
      entityType: this.entityType,
      entityId: this.entityId,
      state: this.state,
      lastEvaluatedAt: this.lastEvaluatedAt,
    };
  }

  static fromDomain(data: {
    formationStatusId: string;
    entityType: string;
    entityId: string;
    state?: FormationState;
    lastEvaluatedAt?: Date;
  }): FormationStatusEntity {
    const entity = new FormationStatusEntity();
    entity.id = data.formationStatusId;
    entity.entityType = data.entityType;
    entity.entityId = data.entityId;
    entity.state = data.state ?? FormationState.DRAFT;
    if (data.lastEvaluatedAt) {
      entity.lastEvaluatedAt = data.lastEvaluatedAt;
    }
    return entity;
  }
}
