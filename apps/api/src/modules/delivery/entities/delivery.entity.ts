import { DeliveryStatus } from '../../../../../../packages/contracts/src'
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity({ name: 'deliveries' })
export class DeliveryEntity {
  @PrimaryColumn('uuid')
  id!: string

  @Index('IDX_deliveries_business_id')
  @Column('uuid')
  businessId!: string

  @Column('uuid', { nullable: true })
  pickupLocationId!: string | null

  @Column('uuid', { nullable: true })
  dropoffLocationId!: string | null

  @Index('IDX_deliveries_assigned_rider_id')
  @Column('uuid', { nullable: true })
  assignedRiderId!: string | null

  // Keep DB column flexible; ensure TS type aligns with DeliveryStatus contract
  @Index('IDX_deliveries_status')
  @Column('varchar', { length: 20 })
  status!: DeliveryStatus

  @Index('IDX_deliveries_scheduled_pickup_time')
  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledPickupTime!: Date | null

  @Index('IDX_deliveries_scheduled_dropoff_time')
  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledDropoffTime!: Date | null

  @Column({ type: 'boolean', default: false })
  isScheduled!: boolean

  // Assignment & lifecycle timestamps
  @Column({ type: 'timestamp with time zone', nullable: true })
  assignedAt!: Date | null

  @Column({ type: 'timestamp with time zone', nullable: true })
  assignmentNotifiedAt!: Date | null

  @Column({ type: 'timestamp with time zone', nullable: true })
  pickedUpAt!: Date | null

  @Column({ type: 'timestamp with time zone', nullable: true })
  deliveredAt!: Date | null

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelledAt!: Date | null

  // Attempts
  @Column({ type: 'timestamp with time zone', nullable: true })
  firstAttemptAt!: Date | null

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastAttemptAt!: Date | null

  @Column({ type: 'int', default: 0 })
  attemptCount!: number

  // SLAs
  @Column({ type: 'timestamp with time zone', nullable: true })
  slaPickupBy!: Date | null

  @Column({ type: 'timestamp with time zone', nullable: true })
  slaDropoffBy!: Date | null

  @Column({ type: 'timestamp with time zone', nullable: true })
  slaBreachedAt!: Date | null

  // Tracking & visibility
  @Column({ type: 'varchar', length: 64, nullable: true })
  visibilityToken!: string | null

  @Column({ type: 'varchar', length: 64, nullable: true })
  trackingCode!: string | null

  @Column({ type: 'varchar', length: 512, nullable: true })
  trackingUrl!: string | null

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date

  toDomain(): {
    deliveryId: string
    businessId: string
    pickupLocationId: string | null
    dropoffLocationId: string | null
    assignedRiderId: string | null
    status: DeliveryStatus
    scheduledPickupTime: Date | null
    scheduledDropoffTime: Date | null
    isScheduled: boolean
    assignedAt: Date | null
    assignmentNotifiedAt: Date | null
    pickedUpAt: Date | null
    deliveredAt: Date | null
    cancelledAt: Date | null
    firstAttemptAt: Date | null
    lastAttemptAt: Date | null
    attemptCount: number
    slaPickupBy: Date | null
    slaDropoffBy: Date | null
    slaBreachedAt: Date | null
    visibilityToken: string | null
    trackingCode: string | null
    trackingUrl: string | null
    createdAt: Date
    updatedAt: Date
  } {
    return {
      deliveryId: this.id,
      businessId: this.businessId,
      pickupLocationId: this.pickupLocationId,
      dropoffLocationId: this.dropoffLocationId,
      assignedRiderId: this.assignedRiderId,
      status: this.status,
      scheduledPickupTime: this.scheduledPickupTime,
      scheduledDropoffTime: this.scheduledDropoffTime,
      isScheduled: this.isScheduled,
      assignedAt: this.assignedAt,
      assignmentNotifiedAt: this.assignmentNotifiedAt,
      pickedUpAt: this.pickedUpAt,
      deliveredAt: this.deliveredAt,
      cancelledAt: this.cancelledAt,
      firstAttemptAt: this.firstAttemptAt,
      lastAttemptAt: this.lastAttemptAt,
      attemptCount: this.attemptCount,
      slaPickupBy: this.slaPickupBy,
      slaDropoffBy: this.slaDropoffBy,
      slaBreachedAt: this.slaBreachedAt,
      visibilityToken: this.visibilityToken,
      trackingCode: this.trackingCode,
      trackingUrl: this.trackingUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  static fromDomain(data: {
    deliveryId: string
    businessId: string
    pickupLocationId?: string | null
    dropoffLocationId?: string | null
    assignedRiderId?: string | null
    status: DeliveryStatus
    scheduledPickupTime?: Date | null
    scheduledDropoffTime?: Date | null
    isScheduled?: boolean
    assignedAt?: Date | null
    assignmentNotifiedAt?: Date | null
    pickedUpAt?: Date | null
    deliveredAt?: Date | null
    cancelledAt?: Date | null
    firstAttemptAt?: Date | null
    lastAttemptAt?: Date | null
    attemptCount?: number
    slaPickupBy?: Date | null
    slaDropoffBy?: Date | null
    slaBreachedAt?: Date | null
    visibilityToken?: string | null
    trackingCode?: string | null
    trackingUrl?: string | null
    createdAt: Date
  }): DeliveryEntity {
    const e = new DeliveryEntity()
    e.id = data.deliveryId
    e.businessId = data.businessId
    e.pickupLocationId = data.pickupLocationId ?? null
    e.dropoffLocationId = data.dropoffLocationId ?? null
    e.assignedRiderId = data.assignedRiderId ?? null
    e.status = data.status
    e.scheduledPickupTime = data.scheduledPickupTime ?? null
    e.scheduledDropoffTime = data.scheduledDropoffTime ?? null
    e.isScheduled = data.isScheduled ?? false
    e.assignedAt = data.assignedAt ?? null
    e.assignmentNotifiedAt = data.assignmentNotifiedAt ?? null
    e.pickedUpAt = data.pickedUpAt ?? null
    e.deliveredAt = data.deliveredAt ?? null
    e.cancelledAt = data.cancelledAt ?? null
    e.firstAttemptAt = data.firstAttemptAt ?? null
    e.lastAttemptAt = data.lastAttemptAt ?? null
    e.attemptCount = data.attemptCount ?? 0
    e.slaPickupBy = data.slaPickupBy ?? null
    e.slaDropoffBy = data.slaDropoffBy ?? null
    e.slaBreachedAt = data.slaBreachedAt ?? null
    e.visibilityToken = data.visibilityToken ?? null
    e.trackingCode = data.trackingCode ?? null
    e.trackingUrl = data.trackingUrl ?? null
    e.createdAt = data.createdAt
    // updatedAt is managed by DB
    return e
  }
}
