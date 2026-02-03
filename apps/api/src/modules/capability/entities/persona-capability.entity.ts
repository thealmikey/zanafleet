import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('persona_capabilities')
export class PersonaCapabilityEntity {
  @PrimaryColumn('uuid')
  personaId!: string;

  @PrimaryColumn('uuid')
  capabilityId!: string;

  @Column({ type: 'timestamp with time zone' })
  grantedAt!: Date;

  toDomain(): {
    personaId: string;
    capabilityId: string;
    grantedAt: Date;
  } {
    return {
      personaId: this.personaId,
      capabilityId: this.capabilityId,
      grantedAt: this.grantedAt,
    };
  }

  static fromDomain(data: {
    personaId: string;
    capabilityId: string;
    grantedAt: Date;
  }): PersonaCapabilityEntity {
    const entity = new PersonaCapabilityEntity();
    entity.personaId = data.personaId;
    entity.capabilityId = data.capabilityId;
    entity.grantedAt = data.grantedAt;
    return entity;
  }
}
