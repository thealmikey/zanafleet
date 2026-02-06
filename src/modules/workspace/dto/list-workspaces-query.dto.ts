import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { WorkspaceType } from './workspace.enums';

/**
 * ListWorkspacesQueryDto
 *
 * Query parameters for filtering the workspace list endpoint.
 */
export class ListWorkspacesQueryDto {
  @ApiPropertyOptional({
    enum: WorkspaceType,
    description: 'Filter workspaces by type',
    example: WorkspaceType.SACCO,
  })
  @IsEnum(WorkspaceType)
  @IsOptional()
  type?: WorkspaceType;
}
