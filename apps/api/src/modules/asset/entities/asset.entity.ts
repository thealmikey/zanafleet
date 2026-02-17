import { AssetType, AssetStatus, LocationData, OwnerType } from '@zanafleet/contracts';
import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Asset Entity
 * Represents a generic physical asset (vehicle, equipment, warehouse)
 */
@Entity('assets')
@Index(['ownerId'])
@Index(['type'])
@Index(['status'])
export class AssetEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column('varchar', { length: 255 })
    name!: string;

    @Column('enum', { enum: AssetType })
    type!: AssetType;

    @Column('enum', { enum: AssetStatus, default: AssetStatus.ACTIVE })
    status!: AssetStatus;

    @Column('uuid')
    ownerId!: string;

    @Column('enum', { enum: OwnerType })
    ownerType!: OwnerType;

    @Column('simple-json', { nullable: true })
    capacity?: Record<string, unknown>;

    @Column('simple-json', { nullable: true })
    metadata?: Record<string, unknown>;

    @Column('simple-json', { nullable: true })
    homeBase?: LocationData;

    /**
     * Array of Media IDs for asset images
     * Each image stores metadata: { mediaId, purpose, isPrimary, uploadedAt }
     */
    @Column('simple-json', { nullable: true, default: '[]' })
    imageIds?: Array<{
        mediaId: string;
        purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
        isPrimary?: boolean;
        uploadedAt?: Date;
    }>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;

    /**
     * Convert entity to domain-compatible object
     */
    toDomain() {
        return {
            assetId: this.id,
            name: this.name,
            type: this.type,
            status: this.status,
            ownerId: this.ownerId,
            ownerType: this.ownerType,
            capacity: this.capacity,
            metadata: this.metadata,
            homeBase: this.homeBase,
            imageIds: this.imageIds || [],
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
