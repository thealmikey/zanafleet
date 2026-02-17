import { Entity, PrimaryColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('customer_activity_projections')
@Index(['businessId'])
export class CustomerActivityProjection {
    @PrimaryColumn('uuid')
    customerId!: string;

    @PrimaryColumn('uuid')
    businessId!: string;

    @Column('int', { default: 0 })
    totalOrders!: number;

    @Column('int', { default: 0 })
    totalCancellations!: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    totalSpent!: number;

    @Column('timestamp with time zone', { nullable: true })
    lastOrderAt: Date | null = null;

    @Column('simple-json', { nullable: true })
    frequentItems: Record<string, number> | null = null;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;

    get cancellationRate(): number {
        if (this.totalOrders === 0) return 0;
        return this.totalCancellations / (this.totalOrders + this.totalCancellations);
    }
}
