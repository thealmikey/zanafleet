import { GeoJsonPoint } from '@api/core/utils/geo.utils';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('search_documents')
export class SearchDocumentEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column('uuid')
    entityId!: string;

    @Column('varchar', { length: 32 })
    entityType!: string;

    @Column('uuid')
    workspaceId!: string;

    @Column('text')
    title!: string;

    @Column('text', { nullable: true })
    description!: string | null;

    @Column('jsonb', { default: {} })
    metadata!: Record<string, unknown>;

    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    location!: GeoJsonPoint | null;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;

    // The 'tsv' column is managed by DB trigger for FTS
}
