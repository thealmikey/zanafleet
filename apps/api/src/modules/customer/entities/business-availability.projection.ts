import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('business_availability_projections')
export class BusinessAvailabilityProjection {
  @PrimaryColumn('uuid')
  businessId!: string;

  @Column('boolean', { default: true })
  isCurrentlyOpen!: boolean;

  @Column('varchar', { nullable: true })
  reason!: string;

  @Column('int', { default: 0 })
  activeOrderCount!: number;

  @Column('int', { default: 10 })
  capacityLimit!: number;

  @Column('timestamp with time zone', { nullable: true })
  nextStatusChangeAt: Date | null = null;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  get isAtCapacity(): boolean {
    return this.activeOrderCount >= this.capacityLimit;
  }

  get isAvailable(): boolean {
    return this.isCurrentlyOpen && !this.isAtCapacity;
  }
}
