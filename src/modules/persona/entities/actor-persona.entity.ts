import { Entity, PrimaryColumn, Column } from 'typeorm';

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

  toDomain(): {
    actorId: string;
    workspaceId: string;
    personaId: string;
    assignedAt: Date;
  } {
    return {
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      personaId: this.personaId,
      assignedAt: this.assignedAt,
    };
  }

  static fromDomain(data: {
    actorId: string;
    workspaceId: string;
    personaId: string;
    assignedAt: Date;
  }): ActorPersonaEntity {
    const entity = new ActorPersonaEntity();
    entity.actorId = data.actorId;
    entity.workspaceId = data.workspaceId;
    entity.personaId = data.personaId;
    entity.assignedAt = data.assignedAt;
    return entity;
  }
}
