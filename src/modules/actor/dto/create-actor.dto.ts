import { ActorType } from './actor.enums';

/**
 * DTO for creating an actor
 * Input payload for CreateActorCommand
 */
export class CreateActorDto {
  type: ActorType;
  roles: string[]; // Array of role identifiers
  workspaceId: string; // UUID of the workspace
  linkedWallets?: string[]; // Array of wallet UUIDs
}

/**
 * DTO representing a complete Actor entity
 * Output DTO for queries and responses
 */
export class ActorDto {
  actorId: string; // UUID
  type: ActorType;
  roles: string[]; // Array of role identifiers
  workspaceId: string; // UUID of the workspace
  linkedWallets: string[]; // Array of wallet UUIDs
  createdAt: Date;
  updatedAt: Date;
}
