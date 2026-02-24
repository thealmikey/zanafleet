import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { ContactSource, ImportStatus } from '../dto/contact-graph.enums';

/**
 * ImportBatch Entity
 *
 * Tracks bulk contact imports for audit and debugging
 */
@Entity('contact_import_batches')
@Index(['workspaceId', 'status'])
export class ImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('uuid')
  initiatedById!: string;

  @Column({
    type: 'enum',
    enum: ContactSource,
    default: ContactSource.CSV,
  })
  source!: ContactSource;

  @Column({
    type: 'enum',
    enum: ImportStatus,
    default: ImportStatus.PENDING,
  })
  status!: ImportStatus;

  @Column('int', { default: 0 })
  totalRecords!: number;

  @Column('int', { default: 0 })
  processedRecords!: number;

  @Column('int', { default: 0 })
  matchedRecords!: number;

  @Column('int', { default: 0 })
  newRecords!: number;

  @Column('int', { default: 0 })
  duplicateRecords!: number;

  @Column('int', { default: 0 })
  failedRecords!: number;

  @Column({ type: 'text', nullable: true })
  errorSummary!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  importConfig!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  /**
   * Get processing progress percentage
   */
  getProgress(): number {
    if (this.totalRecords === 0) return 0;
    return Math.round((this.processedRecords / this.totalRecords) * 100);
  }

  /**
   * Check if import is complete
   */
  isComplete(): boolean {
    return (
      this.status === ImportStatus.COMPLETED ||
      this.status === ImportStatus.FAILED ||
      this.status === ImportStatus.PARTIAL
    );
  }
}
