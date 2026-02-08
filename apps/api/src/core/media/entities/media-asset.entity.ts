import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  MediaAssetMetadata,
  MediaAssetStatus,
  OwnerEntityType,
} from '@zanafleet/contracts';

@Entity('media_assets')
@Index('IDX_media_assets_created_at', ['createdAt'])
export class MediaAssetEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  filename!: string;

  @Column('varchar', { length: 127 })
  mimeType!: string;

  @Column('bigint')
  size!: string;

  @Column('varchar', { length: 64 })
  checksum!: string;

  @Index('IDX_media_assets_owner_id')
  @Column('uuid')
  ownerId!: string;

  @Index('IDX_media_assets_owner_type')
  @Column('varchar', { length: 32 })
  ownerType!: OwnerEntityType;

  @Index('IDX_media_assets_status')
  @Column('varchar', { length: 20 })
  status!: MediaAssetStatus;

  @Column('varchar', { length: 512 })
  storageKey!: string;

  @Column('varchar', { length: 64, nullable: true })
  storageProviderId!: string | null;

  @Column('jsonb', { nullable: true })
  metadata!: MediaAssetMetadata | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  archivedAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    mediaAssetId: string;
    filename: string;
    mimeType: string;
    size: number;
    checksum: string;
    ownerId: string;
    ownerType: OwnerEntityType;
    status: MediaAssetStatus;
    storageKey: string;
    storageProviderId: string | null;
    metadata: MediaAssetMetadata | null;
    archivedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      mediaAssetId: this.id,
      filename: this.filename,
      mimeType: this.mimeType,
      size: typeof this.size === 'string' ? parseInt(this.size, 10) : Number(this.size),
      checksum: this.checksum,
      ownerId: this.ownerId,
      ownerType: this.ownerType,
      status: this.status,
      storageKey: this.storageKey,
      storageProviderId: this.storageProviderId,
      metadata: this.metadata,
      archivedAt: this.archivedAt,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    mediaAssetId: string;
    filename: string;
    mimeType: string;
    size: number;
    checksum: string;
    ownerId: string;
    ownerType: OwnerEntityType;
    status: MediaAssetStatus;
    storageKey: string;
    storageProviderId?: string | null;
    metadata?: MediaAssetMetadata | null;
    archivedAt?: Date | null;
    deletedAt?: Date | null;
    createdAt: Date;
  }): MediaAssetEntity {
    const entity = new MediaAssetEntity();
    entity.id = data.mediaAssetId;
    entity.filename = data.filename;
    entity.mimeType = data.mimeType;
    entity.size = String(data.size);
    entity.checksum = data.checksum;
    entity.ownerId = data.ownerId;
    entity.ownerType = data.ownerType;
    entity.status = data.status;
    entity.storageKey = data.storageKey;
    entity.storageProviderId = data.storageProviderId ?? null;
    entity.metadata = data.metadata ?? null;
    entity.archivedAt = data.archivedAt ?? null;
    entity.deletedAt = data.deletedAt ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
