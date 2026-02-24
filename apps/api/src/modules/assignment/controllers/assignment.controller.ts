import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AssignmentRequestDto, AssignmentResultDto } from '../dto';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { AssignmentEngineService } from '../services/assignment-engine.service';

/**
 * Assignment Controller
 *
 * REST endpoints for job-worker assignment operations.
 */
@ApiTags('assignment')
@Controller('assignment')
export class AssignmentController {
  private readonly logger = new Logger(AssignmentController.name);

  constructor(
    private readonly assignmentEngine: AssignmentEngineService,
    private readonly assignmentRepository: AssignmentRepository
  ) {}

  /**
   * Execute assignment for a job.
   */
  @Post('jobs/:jobId/assign')
  @ApiOperation({ summary: 'Execute assignment for a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Assignment completed', type: AssignmentResultDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async assign(
    @Param('jobId') jobId: string,
    @Body() dto: AssignmentRequestDto
  ): Promise<AssignmentResultDto> {
    this.logger.log(`Assignment requested for job ${jobId}`);

    // For now, return a placeholder - in production this would fetch the job
    // and use the assignment engine to assign workers
    const result = await this.assignmentEngine.assign({
      job: {
        id: jobId,
        jobTypeId: dto.jobId || '',
        workspaceId: '',
        destinations: [],
      },
      options: {
        strategyType: dto.strategyType,
      },
    });

    return {
      success: result.success,
      assignments: result.assignments.map((a) => ({
        workerId: a.workerId,
        workerType: a.workerType,
        role: a.role,
        assignedAt: a.assignedAt,
        assignmentMethod: a.assignmentMethod,
        status: a.status,
      })),
      errors: result.errors,
      warnings: result.warnings,
      metadata: result.metadata,
    };
  }

  /**
   * Get assignments for a job.
   */
  @Get('jobs/:jobId/assignments')
  @ApiOperation({ summary: 'Get assignments for a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Assignments found' })
  async getAssignments(@Param('jobId') jobId: string) {
    const assignments = await this.assignmentRepository.findByJobId(jobId);
    return {
      data: assignments,
      total: assignments.length,
    };
  }

  /**
   * Get available strategies.
   */
  @Get('strategies')
  @ApiOperation({ summary: 'Get available assignment strategies' })
  @ApiResponse({ status: 200, description: 'List of strategies' })
  async getStrategies() {
    const strategies = this.assignmentEngine.getStrategies();
    return {
      data: strategies.map((s) => ({
        type: s.type,
        name: s.name,
      })),
    };
  }
}
