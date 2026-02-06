import { WorkspaceType, WorkspaceStatus } from './workspace.enums';

/**
 * DTO for creating a workspace
 * Input payload for CreateWorkspaceCommand
 */
export class CreateWorkspaceDto {
  name!: string;
  orgId!: string; // UUID of the parent organization
  type!: WorkspaceType;
  status?: WorkspaceStatus;
  roleTemplates?: string[]; // UUIDs of role templates
}

/**
 * DTO representing a complete Workspace entity
 * Output DTO for queries and responses
 */
export class WorkspaceDto {
  workspaceId!: string; // UUID
  orgId!: string; // UUID of the parent organization
  name!: string;
  type!: WorkspaceType;
  status!: WorkspaceStatus;
  createdAt!: Date;
  updatedAt!: Date;
}
