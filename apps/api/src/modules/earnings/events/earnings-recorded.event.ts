import { EarningsReferenceType } from '../entities/earnings-entry.entity';

/**
 * EarningsRecordedEvent
 *
 * Fired when earnings are recorded for a rider in a workspace.
 * This event triggers:
 * - Neo4j projection updates
 * - Wallet crediting (via ledger)
 * - Settlement scheduler checks
 *
 * Event-driven flow ensures:
 * - Financial immutability
 * - Audit trail
 * - Real-time visibility
 */
export class EarningsRecordedEvent {
  constructor(
    public readonly id: string,
    public readonly riderId: string,
    public readonly workspaceId: string,
    public readonly jobId: string,
    public readonly grossAmount: number,
    public readonly platformFee: number,
    public readonly saccoCommission: number,
    public readonly netEarnings: number,
    public readonly commissionRate: number,
    public readonly referenceType: EarningsReferenceType,
    public readonly referenceId: string,
    public readonly currency: string,
    public readonly createdAt: Date
  ) {}

  /**
   * Get period date for partitioning
   */
  get periodDate(): Date {
    const now = new Date(this.createdAt);
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

/**
 * EarningsReversalEvent
 *
 * Fired when earnings need to be reversed (e.g., cancelled job).
 * Creates a negative earnings entry to maintain audit trail.
 */
export class EarningsReversalEvent {
  constructor(
    public readonly originalEarningsId: string,
    public readonly riderId: string,
    public readonly workspaceId: string,
    public readonly jobId: string,
    public readonly reversalAmount: number,
    public readonly reason: string,
    public readonly referenceId: string,
    public readonly createdAt: Date
  ) {}
}
