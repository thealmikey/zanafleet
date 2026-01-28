import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('personas')
export class PersonaEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    personaId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      personaId: this.id,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    personaId: string;
    name: string;
    createdAt: Date;
  }): PersonaEntity {
    const entity = new PersonaEntity();
    entity.id = data.personaId;
    entity.name = data.name;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
