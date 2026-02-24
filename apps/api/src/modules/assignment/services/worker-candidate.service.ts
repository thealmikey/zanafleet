import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WorkerCandidate, AvailabilityStatus, GeoLocation } from '../interfaces';

/**
 * Worker Candidate Service
 *
 * Service for retrieving and managing worker candidates for assignment.
 * Handles worker discovery, filtering, and data transformation.
 */
@Injectable()
export class WorkerCandidateService {
  private readonly logger = new Logger(WorkerCandidateService.name);

  constructor(
    // Inject actor repository for worker data
    @InjectRepository('ActorRepository')
    private readonly actorRepository: Repository<Record<string, unknown>>
  ) {}

  /**
   * Find available workers for a job.
   */
  async findCandidates(params: {
    workspaceId: string;
    workerTypes?: string[];
    requiredCapabilities?: string[];
    location?: GeoLocation;
    maxDistanceKm?: number;
  }): Promise<WorkerCandidate[]> {
    this.logger.log(`Finding candidates for workspace ${params.workspaceId}`);

    // Build query for available workers
    const query = this.buildCandidateQuery(params);

    const workers = await this.actorRepository.find(query);

    // Transform to WorkerCandidate format
    const candidates = await Promise.all(
      workers.map((worker) => this.transformToCandidate(worker, params))
    );

    this.logger.log(`Found ${candidates.length} candidates`);

    return candidates;
  }

  /**
   * Get a specific worker by ID.
   */
  async getWorkerById(workerId: string): Promise<WorkerCandidate | null> {
    const worker = await this.actorRepository.findOne({
      where: { id: workerId },
    });

    if (!worker) {
      return null;
    }

    return this.transformToCandidate(worker, {});
  }

  /**
   * Get workers by IDs.
   */
  async getWorkersByIds(workerIds: string[]): Promise<WorkerCandidate[]> {
    if (workerIds.length === 0) {
      return [];
    }

    const workers = await this.actorRepository.find({
      where: workerIds.map((id) => ({ id })),
    });

    return Promise.all(workers.map((worker) => this.transformToCandidate(worker, {})));
  }

  /**
   * Build the query for finding candidates.
   */
  private buildCandidateQuery(params: {
    workspaceId: string;
    workerTypes?: string[];
    location?: GeoLocation;
    maxDistanceKm?: number;
  }): Record<string, unknown> {
    const query: Record<string, unknown> = {
      where: {
        workspaceId: params.workspaceId,
      },
      relations: ['persona'],
    };

    // Add worker type filter if specified
    if (params.workerTypes && params.workerTypes.length > 0) {
      (query.where as Record<string, unknown>).type = { $in: params.workerTypes };
    }

    return query;
  }

  /**
   * Transform database entity to WorkerCandidate.
   */
  private async transformToCandidate(
    worker: Record<string, unknown>,
    _params: { location?: GeoLocation }
  ): Promise<WorkerCandidate> {
    // In production, this would fetch additional data like:
    // - Current load from job assignments
    // - Rating from reviews
    // - Location from location service
    // - Capabilities from capability service

    const location = worker.location
      ? (worker.location as { latitude: number; longitude: number })
      : undefined;

    return {
      workerId: worker.id as string,
      workerType: (worker.type as string) || 'default',
      actorId: worker.id as string,
      actorEmail: worker.email as string,
      actorUsername: worker.username as string,
      location: location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : undefined,
      currentLoad: (worker.currentLoad as number) || 0,
      maxCapacity: (worker.maxCapacity as number) || 10,
      qualifications: (worker.qualifications as Record<string, unknown>[]) || [],
      rating: (worker.rating as number) || 4.0,
      availabilityStatus:
        (worker.availabilityStatus as AvailabilityStatus) || AvailabilityStatus.AVAILABLE,
      workspaceId: worker.workspaceId as string,
      capabilities: (worker.capabilities as string[]) || [],
    };
  }

  /**
   * Get worker current load (number of active jobs).
   */
  async getWorkerLoad(workerId: string): Promise<number> {
    // Query for active assignments for this worker
    // In production, this would query the job_worker_assignments table
    return 0;
  }
}
