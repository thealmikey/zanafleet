import { ActorType } from './actor.enums';

/**
 * DTO for creating an actor
 * Input payload for CreateActorCommand
 */
export class CreateActorDto {
  type!: ActorType;
  email!: string;
  username!: string;
  /**
   * Plaintext password that will be hashed server-side before storage
   */
  password!: string;
  location?: string | null;
  roles!: string[]; // Array of role identifiers
  workspaceId!: string; // UUID of the workspace
  linkedWallets?: string[]; // Array of wallet UUIDs
}
