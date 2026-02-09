import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * IncentiveApplication Entity
 * Records when an incentive is applied to an invoice
 *
 * Key characteristics:
 * - Immutable: No @UpdateDateColumn - applications cannot be modified after creation
 * - Links campaign to invoice and charge for audit trail
 * - Tracks beneficiary and discount amount
 */
@Entity('incentive_applications')
@Index(['campaignId'])
@Index(['invoiceId'])
@Index(['chargeId'])
@Index(['beneficiaryAccountId'])
@Index(['appliedAt'])
export class IncentiveApplicationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @Column('uuid')
  invoiceId!: string;

  @Column('uuid')
  chargeId!: string;

  @Column('uuid')
  beneficiaryAccountId!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  discountAmount!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  appliedAt!: Date;

  toDomain(): {
    applicationId: string;
    campaignId: string;
    invoiceId: string;
    chargeId: string;
    beneficiaryAccountId: string;
    discountAmount: number;
    currency: string;
    appliedAt: Date;
  } {
    return {
      applicationId: this.id,
      campaignId: this.campaignId,
      invoiceId: this.invoiceId,
      chargeId: this.chargeId,
      beneficiaryAccountId: this.beneficiaryAccountId,
      discountAmount: parseFloat(this.discountAmount),
      currency: this.currency,
      appliedAt: this.appliedAt,
    };
  }

  static fromDomain(data: {
    applicationId: string;
    campaignId: string;
    invoiceId: string;
    chargeId: string;
    beneficiaryAccountId: string;
    discountAmount: number;
    currency: string;
    appliedAt: Date;
  }): IncentiveApplicationEntity {
    const entity = new IncentiveApplicationEntity();
    entity.id = data.applicationId;
    entity.campaignId = data.campaignId;
    entity.invoiceId = data.invoiceId;
    entity.chargeId = data.chargeId;
    entity.beneficiaryAccountId = data.beneficiaryAccountId;
    entity.discountAmount = data.discountAmount.toFixed(2);
    entity.currency = data.currency;
    entity.appliedAt = data.appliedAt;
    return entity;
  }
}
