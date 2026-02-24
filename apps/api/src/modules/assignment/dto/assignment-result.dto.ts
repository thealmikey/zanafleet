import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AssignmentWorkerRole, AssignmentStatus } from '../interfaces';

/**
 * Assignment Assignment DTO
 */
export class AssignmentAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  workerId!: string;

  @ApiProperty()
  workerType!: string;

  @ApiProperty({ enum: AssignmentWorkerRole })
  role!: AssignmentWorkerRole;

  @ApiProperty()
  assignedAt!: Date;

  @ApiProperty()
  assignmentMethod!: string;

  @ApiProperty({ enum: AssignmentStatus })
  status!: AssignmentStatus;
}

/**
 * Assignment Result DTO
 */
export class AssignmentResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: [AssignmentAssignmentDto] })
  assignments!: AssignmentAssignmentDto[];

  @ApiProperty({ type: [String] })
  errors!: string[];

  @ApiPropertyOptional({ type: [String] })
  warnings?: string[];

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}
