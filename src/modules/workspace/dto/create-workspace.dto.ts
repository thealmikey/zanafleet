/**
 * DTO for creating a workspace
 * Input payload for CreateWorkspaceCommand
 */
export class CreateWorkspaceDto {
  name: string;
  orgId: string; // UUID of the parent organization
  roleTemplates?: string[]; // Array of role template UUIDs
}

/**
 * DTO representing a complete Workspace entity
 * Output DTO for queries and responses
 */
export class WorkspaceDto {
  workspaceId: string; // UUID
  orgId: string; // UUID of the parent organization
  name: string;
  roleTemplates: string[]; // Array of role template UUIDs
  createdAt: Date;
  updatedAt: Date;
}
