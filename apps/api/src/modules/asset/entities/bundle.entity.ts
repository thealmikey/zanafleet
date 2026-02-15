import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';

import { TripEntity } from './trip.entity';

export enum BundleStatus {
    DRAFT = 'DRAFT',
    CONFIRMED = 'CONFIRMED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * Bundle Entity
 * Groups multiple trips/assets for complex projects like events, office moves, etc.
 */
@Entity('bundles')
@Index(['ownerId'])
@Index(['status'])
export class BundleEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column('varchar', { length: 255 })
    name!: string;

    @Column('text', { nullable: true })
    description?: string;

    @Column('uuid')
    ownerId!: string; // Organization or individual coordinating the project

    @Column('enum', { enum: BundleStatus, default: BundleStatus.DRAFT })
    status!: BundleStatus;

    @Column({ type: 'timestamp with time zone' })
    startDate!: Date;

    @Column({ type: 'timestamp with time zone' })
    endDate!: Date;

    @Column('float', { nullable: true })
    budgetAmount?: number;

    @Column('jsonb', { nullable: true })
    metadata?: Record<string, unknown>; // Event type, location, attendee count, etc.

    @OneToMany(() => TripEntity, trip => trip.bundleId)
    trips?: TripEntity[];

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;

    /**
     * Convert entity to domain-compatible object
     */
    toDomain() {
        return {
            bundleId: this.id,
            name: this.name,
            description: this.description,
            ownerId: this.ownerId,
            status: this.status,
            startDate: this.startDate,
            endDate: this.endDate,
            budgetAmount: this.budgetAmount,
            metadata: this.metadata,
            tripCount: this.trips?.length,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
