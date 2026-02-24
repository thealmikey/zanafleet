import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DeliveryEntity } from '@api/modules/delivery/entities/delivery.entity';
import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';

import {
  ConflictCheck,
  ConflictType,
  DEFAULT_JOB_SCORE_FACTORS,
  DEFAULT_SCORING_CONFIG,
  JobConflict,
  JobFeedItem,
  JobFeedRequest,
  JobFeedResponse,
  JobScoreFactors,
  ScoringConfig,
  WorkspaceJobCount,
  ACTIVE_JOB_STATUSES,
  FEED_JOB_STATUSES,
} from '../context.types';

// Delivery status values (inline to avoid import issues)
const DeliveryStatus = {
  Requested: 'REQUESTED',
  Assigned: 'ASSIGNED',
  PickedUp: 'PICKED_UP',
  InTransit: 'IN_TRANSIT',
  Delivered: 'DELIVERED',
  Cancelled: 'CANCELLED',
} as const;

/**
 * UnifiedJobFeedService
 *
 * Aggregates jobs from multiple workspaces into a single ranked feed.
 * Features:
 * - Cross-workspace job aggregation
 * - Intelligent scoring based on multiple factors
 * - Conflict detection (double booking prevention)
 * - Real-time availability reconciliation
 */

@Injectable()
export class UnifiedJobFeedService {
  private readonly logger = new Logger(UnifiedJobFeedService.name);

  constructor(
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>
  ) {}

  /**
   * Get unified job feed for an actor across multiple workspaces
   */
  async getJobFeed(
    request: JobFeedRequest,
    scoreFactors: JobScoreFactors = DEFAULT_JOB_SCORE_FACTORS,
    scoringConfig: ScoringConfig = DEFAULT_SCORING_CONFIG
  ): Promise<JobFeedResponse> {
    const { actorId, roles, workspaces, status, limit = 20, offset = 0 } = request;

    // 1. Get accessible workspaces based on role
    const accessibleWorkspaces = await this.getAccessibleWorkspaces(actorId, roles, workspaces);

    if (accessibleWorkspaces.length === 0) {
      return { jobs: [], total: 0, hasMore: false, workspaces: [] };
    }

    // 2. Get active jobs from those workspaces
    const jobStatuses = status ? status : [FEED_JOB_STATUSES[0], FEED_JOB_STATUSES[1]];

    const deliveries = await this.deliveryRepository.find({
      where: {
        workspaceId: In(accessibleWorkspaces.map((w) => w.workspaceId)),
        status: In(jobStatuses as readonly string[]),
      },
      take: limit * 2, // Fetch extra for scoring
      order: { scheduledPickupTime: 'ASC' },
    });

    // 3. Filter out conflicts with actor's current assignments
    const activeAssignments = await this.getActorActiveAssignments(actorId);
    const conflictingIds = new Set(activeAssignments.map((a) => a.id));

    // 4. Score and rank jobs
    const scoredJobs = await Promise.all(
      deliveries
        .filter((d) => !conflictingIds.has(d.id))
        .map(async (delivery) => {
          const workspace = accessibleWorkspaces.find(
            (w) => w.workspaceId === delivery.workspaceId
          );
          return this.scoreJob(
            delivery,
            workspace?.workspaceName ?? 'Unknown',
            scoreFactors,
            scoringConfig
          );
        })
    );

    // 5. Sort by score descending
    scoredJobs.sort((a, b) => b.score - a.score);

    // 6. Apply pagination
    const total = scoredJobs.length;
    const paginatedJobs = scoredJobs.slice(offset, offset + limit);

    // 7. Build workspace job counts
    const workspaceJobCounts: WorkspaceJobCount[] = accessibleWorkspaces.map((w) => ({
      workspaceId: w.workspaceId,
      workspaceName: w.workspaceName,
      jobCount: deliveries.filter((d) => d.workspaceId === w.workspaceId).length,
    }));

    return {
      jobs: paginatedJobs,
      total,
      hasMore: offset + limit < total,
      workspaces: workspaceJobCounts,
    };
  }

  /**
   * Score a job based on multiple factors
   */
  private async scoreJob(
    delivery: DeliveryEntity,
    workspaceName: string,
    factors: JobScoreFactors,
    config: ScoringConfig
  ): Promise<JobFeedItem> {
    // Calculate individual factor scores (normalized 0-1)

    // Distance score (closer = higher, so we use 1 - normalized distance)
    const distanceScore = this.normalizeDistance(
      delivery.scheduledPickupTime ? 3000 : 5000,
      config.factors.maxDistanceMeters
    );

    // Earnings score (normalized 0-1 based on typical range)
    const earningsScore = 0.6; // Would calculate from delivery pricing

    // SLA urgency (higher when approaching deadline but not yet expired)
    const slaScore = this.calculateSlaScore(
      delivery.scheduledDropoffTime,
      config.factors.slaWindowMinutes
    );

    // Acceptance probability (based on historical acceptance rate)
    const acceptanceScore = 0.5; // Would calculate from rider history

    // Preference match (would compare with rider preferences)
    const preferenceScore = 0.8;

    // Rating score (business rating)
    const ratingScore = 0.7; // Would fetch from business entity

    // Weighted sum
    const score =
      distanceScore * factors.distanceWeight * -1 + // Negative weight means closer is better
      earningsScore * factors.earningsWeight +
      slaScore * factors.slaUrgencyWeight +
      acceptanceScore * factors.acceptanceProbabilityWeight +
      preferenceScore * factors.preferenceMatchWeight +
      ratingScore * factors.ratingWeight;

    return {
      jobId: delivery.id,
      jobType: 'delivery',
      workspaceId: delivery.workspaceId,
      workspaceName,
      status: delivery.status,
      score: Math.max(0, (score + 1) * 50), // Scale to 0-100
      earnings: 0, // Would fetch from pricing
      distanceMeters: undefined, // Would calculate from rider location
      slaDeadline: delivery.scheduledDropoffTime ?? undefined,
      scheduledPickup: delivery.scheduledPickupTime ?? undefined,
      pickupLocation: undefined,
      dropoffLocation: undefined,
      metadata: {
        businessId: delivery.businessId,
        isScheduled: delivery.isScheduled,
      },
    };
  }

  /**
   * Normalize distance to 0-1 score
   */
  private normalizeDistance(distanceMeters: number, maxDistance: number): number {
    if (!distanceMeters || distanceMeters <= 0) return 1;
    return Math.max(0, 1 - distanceMeters / maxDistance);
  }

  /**
   * Calculate SLA urgency score
   */
  private calculateSlaScore(slaDeadline: Date | null, windowMinutes: number): number {
    if (!slaDeadline) return 0.5; // No SLA = neutral

    const now = new Date();
    const diff = slaDeadline.getTime() - now.getTime();
    const minutesRemaining = diff / (1000 * 60);

    if (minutesRemaining < 0) return 0; // Expired
    if (minutesRemaining > windowMinutes) return 0.3; // Plenty of time
    if (minutesRemaining > windowMinutes * 0.5) return 0.7; // Getting urgent
    if (minutesRemaining > windowMinutes * 0.25) return 1.0; // Critical
    return 0.9; // Past optimal but not expired
  }

  /**
   * Get workspaces accessible to actor based on role
   */
  private async getAccessibleWorkspaces(
    actorId: string,
    roles: MembershipRole[],
    explicitWorkspaces?: string[]
  ): Promise<{ workspaceId: string; workspaceName: string }[]> {
    const memberships = await this.membershipRepository.find({
      where: { actorId },
    });

    // Filter by requested roles
    let filtered = memberships.filter((m) => roles.includes(m.role));

    // If explicit workspaces provided, filter further
    if (explicitWorkspaces && explicitWorkspaces.length > 0) {
      filtered = filtered.filter((m) => explicitWorkspaces.includes(m.workspaceId));
    }

    // Get workspace names
    const workspaceIds = [...new Set(filtered.map((m) => m.workspaceId))];
    const workspaces = await this.workspaceRepository.find({
      where: { id: In(workspaceIds) },
    });

    return filtered.map((m) => {
      const workspace = workspaces.find((w) => w.id === m.workspaceId);
      return {
        workspaceId: m.workspaceId,
        workspaceName: workspace?.name ?? 'Unknown',
      };
    });
  }

  /**
   * Get actor's currently active job assignments
   */
  private async getActorActiveAssignments(actorId: string): Promise<DeliveryEntity[]> {
    return this.deliveryRepository.find({
      where: {
        assignedRiderId: actorId,
        status: In([...ACTIVE_JOB_STATUSES] as unknown as string[]),
      },
    });
  }

  /**
   * Check for conflicts when accepting a job
   */
  async checkConflicts(actorId: string, proposedJobId: string): Promise<ConflictCheck> {
    const conflicts: JobConflict[] = [];
    const lockedJobIds: string[] = [];

    // 1. Get active assignments
    const activeAssignments = await this.deliveryRepository.find({
      where: {
        assignedRiderId: actorId,
        status: In([...ACTIVE_JOB_STATUSES] as unknown as string[]),
      },
    });

    // 2. Get proposed job
    const proposedJob = await this.deliveryRepository.findOne({
      where: { id: proposedJobId },
    });

    if (!proposedJob) {
      return {
        hasConflict: false,
        conflicts: [],
        lockedJobIds: [],
      };
    }

    // 3. Check for double booking
    for (const assignment of activeAssignments) {
      // If proposed job is in same time window as active job -> conflict
      if (this.isTimeConflict(assignment.scheduledPickupTime, proposedJob.scheduledPickupTime)) {
        conflicts.push({
          type: ConflictType.DOUBLE_BOOKING,
          existingJobId: assignment.id,
          proposedJobId: proposedJobId,
          severity: 'blocking',
          message: 'Time conflict with existing active job',
          resolution: {
            action: 'warn',
            suggestedAlternative: `Complete job ${assignment.id} first, then accept this job`,
          },
        });
        lockedJobIds.push(assignment.id);
      }
    }

    // 4. Check for SLA conflicts
    const hasSlaConflict = await this.checkSlaConflicts(actorId, proposedJob);
    if (hasSlaConflict) {
      conflicts.push({
        type: ConflictType.SLA_VIOLATION,
        existingJobId: '',
        proposedJobId: proposedJobId,
        severity: 'blocking',
        message: 'Accepting this job would violate SLA on existing assignment',
        resolution: {
          action: 'block',
        },
      });
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      lockedJobIds,
    };
  }

  /**
   * Check if two jobs have time conflicts
   */
  private isTimeConflict(
    existingTime: Date | null,
    proposedTime: Date | null,
    bufferMinutes = 30
  ): boolean {
    if (!existingTime || !proposedTime) return false;

    const existingEnd = new Date(existingTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
    const proposedStart = new Date(proposedTime.getTime() - bufferMinutes * 60 * 1000);
    const proposedEnd = new Date(
      proposedTime.getTime() + 60 * 60 * 1000 + bufferMinutes * 60 * 1000
    );

    return proposedStart < existingEnd && proposedEnd > existingTime;
  }

  /**
   * Check if accepting job would cause SLA violation
   */
  private async checkSlaConflicts(actorId: string, proposedJob: DeliveryEntity): Promise<boolean> {
    const activeAssignments = await this.deliveryRepository.find({
      where: {
        assignedRiderId: actorId,
        status: In([DeliveryStatus.Assigned, DeliveryStatus.PickedUp] as unknown as string[]),
      },
    });

    const now = Date.now();

    for (const assignment of activeAssignments) {
      // If current job has tight SLA and proposed job would add more time
      if (assignment.scheduledDropoffTime) {
        const timeToDropoff = assignment.scheduledDropoffTime.getTime() - now;
        const estimatedNewJobTime = 30 * 60 * 1000; // 30 minutes estimate

        if (timeToDropoff < estimatedNewJobTime) {
          return true; // Would cause SLA breach
        }
      }
    }

    return false;
  }

  /**
   * Get earnings breakdown by workspace
   */
  async getEarningsBreakdown(actorId: string, startDate: Date, endDate: Date) {
    const memberships = await this.membershipRepository.find({
      where: { actorId },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);
    const workspaces = await this.workspaceRepository.find({
      where: { id: In(workspaceIds) },
    });

    const deliveredJobs = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .where('delivery.assignedRiderId = :actorId', { actorId })
      .andWhere('delivery.status = :status', { status: DeliveryStatus.Delivered })
      .andWhere('delivery.deliveredAt >= :startDate', { startDate })
      .andWhere('delivery.deliveredAt <= :endDate', { endDate })
      .getMany();

    // Group by workspace
    const earningsByWorkspace: Record<
      string,
      { workspaceName: string; total: number; count: number }
    > = {};

    for (const job of deliveredJobs) {
      if (!earningsByWorkspace[job.workspaceId]) {
        const workspace = workspaces.find((w) => w.id === job.workspaceId);
        earningsByWorkspace[job.workspaceId] = {
          workspaceName: workspace?.name ?? 'Unknown',
          total: 0,
          count: 0,
        };
      }
      earningsByWorkspace[job.workspaceId].count++;
      // Would add actual earnings from pricing
    }

    return Object.entries(earningsByWorkspace).map(([workspaceId, data]) => ({
      workspaceId,
      ...data,
    }));
  }
}
