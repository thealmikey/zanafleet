import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('capabilities')
@Index('capabilities_name_unique', ['name'], { unique: true })
@Index('capabilities_created_at_index', ['createdAt'])
export class CapabilityEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    capabilityId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      capabilityId: this.id,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    capabilityId: string;
    name: string;
    createdAt: Date;
  }): CapabilityEntity {
    const entity = new CapabilityEntity();
    entity.id = data.capabilityId;
    entity.name = data.name;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
