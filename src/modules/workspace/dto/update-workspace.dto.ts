import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkspaceStatus } from './workspace.enums';

/**
 * UpdateWorkspaceDto
 * Data transfer object for updating a workspace's details.
 * Used for HTTP request body validation.
 */
export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(WorkspaceStatus)
  status?: WorkspaceStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleTemplates?: string[];
}
