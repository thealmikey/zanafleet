import { ActorType } from './actor.enums';

/**
 * ActorDto
 * Data transfer object representing an actor.
 */
export class ActorDto {
  actorId!: string;
  type!: ActorType;
  roles!: string[];
  workspaceId!: string;
  linkedWallets!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
