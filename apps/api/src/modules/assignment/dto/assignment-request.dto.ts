import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AssignmentStrategyType } from '../interfaces';

/**
 * Assignment Request DTO
 */
export class AssignmentRequestDto {
  @ApiProperty({ format: 'uuid' })
  jobId!: string;

  @ApiPropertyOptional({ enum: AssignmentStrategyType })
  strategyType?: AssignmentStrategyType;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}
