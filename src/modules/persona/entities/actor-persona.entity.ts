import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('actor_personas')
export class ActorPersonaEntity {
  @PrimaryColumn('uuid')
  actorId!: string;

  @PrimaryColumn('uuid')
  workspaceId!: string;

  @PrimaryColumn('uuid')
  personaId!: string;

  @Column({ type: 'timestamp with time zone' })
  assignedAt!: Date;

  @Column('boolean', { default: false })
  bootstrap!: boolean;

  toDomain(): {
    actorId: string;
    workspaceId: string;
    personaId: string;
    assignedAt: Date;
    bootstrap: boolean;
  } {
    return {
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      personaId: this.personaId,
      assignedAt: this.assignedAt,
      bootstrap: this.bootstrap,
    };
  }

  static fromDomain(data: {
    actorId: string;
    workspaceId: string;
    personaId: string;
    assignedAt: Date;
    bootstrap?: boolean;
  }): ActorPersonaEntity {
    const entity = new ActorPersonaEntity();
    entity.actorId = data.actorId;
    entity.workspaceId = data.workspaceId;
    entity.personaId = data.personaId;
    entity.assignedAt = data.assignedAt;
    entity.bootstrap = data.bootstrap ?? false;
    return entity;
  }
}
