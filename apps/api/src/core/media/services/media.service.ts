import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError } from 'typeorm';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMediaAssetInput,
  MediaAssetMetadata,
  MediaAssetResponse,
  MediaAssetStatus,
  OwnerEntityType,
  SignedUrlResponse,
} from '@zanafleet/contracts';
import { MediaAssetEntity } from '../entities/media-asset.entity';
import { StorageProviderRegistry } from '../providers/storage-provider-registry.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly storageRegistry: StorageProviderRegistry,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetRepository: Repository<MediaAssetEntity>,
  ) {}

  async createMediaAsset(
    input: CreateMediaAssetInput,
    body: Buffer,
  ): Promise<MediaAssetResponse> {
    const mediaAssetId = uuidv4();
    const storageKey = this.generateStorageKey(
      input.ownerType,
      input.ownerId,
      mediaAssetId,
      input.filename,
    );

    if (input.size !== body.length) {
      throw new BadRequestException(
        `Size mismatch: declared size (${input.size}) does not match actual body length (${body.length})`,
      );
    }

    const checksum = input.checksum || this.calculateChecksum(body);

    const provider = this.storageRegistry.getDefault();
    if (!provider) {
      throw new Error('No storage provider configured');
    }

    await provider.upload(storageKey, body, input.mimeType);

    const metadata = input.metadata || this.extractMetadata(body, input.mimeType);

    const now = new Date();
    const entity = MediaAssetEntity.fromDomain({
      mediaAssetId,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      checksum,
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      status: MediaAssetStatus.Active,
      storageKey,
      storageProviderId: provider.providerId,
      metadata,
      createdAt: now,
    });

    let saved: MediaAssetEntity;
    try {
      saved = await this.mediaAssetRepository.save(entity);
    } catch (error) {
      this.logger.warn(
        `Database save failed for media asset ${mediaAssetId}, cleaning up uploaded file`,
      );
      try {
        await provider.delete(storageKey);
      } catch (deleteError) {
        this.logger.error(
          `Failed to clean up orphaned file ${storageKey}: ${(deleteError as Error).message}`,
        );
      }
      throw error;
    }

    const domain = saved.toDomain();

    this.logger.log(`Created media asset ${mediaAssetId} for ${input.ownerType}/${input.ownerId}`);

    return {
      mediaAssetId: domain.mediaAssetId,
      filename: domain.filename,
      mimeType: domain.mimeType,
      size: domain.size,
      checksum: domain.checksum,
      ownerId: domain.ownerId,
      ownerType: domain.ownerType,
      status: domain.status,
      storageKey: domain.storageKey,
      metadata: domain.metadata,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  async getMediaAsset(mediaAssetId: string): Promise<MediaAssetResponse | null> {
    const entity = await this.mediaAssetRepository.findOne({
      where: { id: mediaAssetId },
    });

    if (!entity || entity.status === MediaAssetStatus.Deleted) {
      return null;
    }

    const domain = entity.toDomain();
    return {
      mediaAssetId: domain.mediaAssetId,
      filename: domain.filename,
      mimeType: domain.mimeType,
      size: domain.size,
      checksum: domain.checksum,
      ownerId: domain.ownerId,
      ownerType: domain.ownerType,
      status: domain.status,
      storageKey: domain.storageKey,
      metadata: domain.metadata,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  async generateSignedDownloadUrl(
    mediaAssetId: string,
    expiresInSeconds = 3600,
  ): Promise<SignedUrlResponse> {
    const entity = await this.mediaAssetRepository.findOne({
      where: { id: mediaAssetId },
    });

    if (!entity) {
      throw new NotFoundException(`Media asset ${mediaAssetId} not found`);
    }

    if (entity.status !== MediaAssetStatus.Active) {
      throw new Error(`Media asset ${mediaAssetId} is not active (status: ${entity.status})`);
    }

    const provider = entity.storageProviderId
      ? this.storageRegistry.get(entity.storageProviderId)
      : this.storageRegistry.getDefault();

    if (!provider) {
      throw new Error('No storage provider available');
    }

    const url = await provider.generateSignedUrl(entity.storageKey, 'GET', {
      expiresInSeconds,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      url,
      expiresAt,
      method: 'GET',
    };
  }

  async generateSignedUploadUrl(
    mediaAssetId: string,
    expiresInSeconds = 3600,
  ): Promise<SignedUrlResponse> {
    const entity = await this.mediaAssetRepository.findOne({
      where: { id: mediaAssetId },
    });

    if (!entity) {
      throw new NotFoundException(`Media asset ${mediaAssetId} not found`);
    }

    if (![MediaAssetStatus.Pending, MediaAssetStatus.Uploading].includes(entity.status)) {
      throw new Error(
        `Media asset ${mediaAssetId} is not in an uploadable state (status: ${entity.status})`,
      );
    }

    const provider = entity.storageProviderId
      ? this.storageRegistry.get(entity.storageProviderId)
      : this.storageRegistry.getDefault();

    if (!provider) {
      throw new Error('No storage provider available');
    }

    const url = await provider.generateSignedUrl(entity.storageKey, 'PUT', {
      expiresInSeconds,
      contentType: entity.mimeType,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      url,
      expiresAt,
      method: 'PUT',
    };
  }

  async deleteMediaAsset(mediaAssetId: string, permanent = false): Promise<void> {
    const entity = await this.mediaAssetRepository.findOne({
      where: { id: mediaAssetId },
    });

    if (!entity) {
      throw new NotFoundException(`Media asset ${mediaAssetId} not found`);
    }

    if (permanent) {
      const provider = entity.storageProviderId
        ? this.storageRegistry.get(entity.storageProviderId)
        : this.storageRegistry.getDefault();

      if (!provider) {
        throw new Error(
          `Cannot permanently delete media asset ${mediaAssetId}: no storage provider available to delete file from storage`,
        );
      }

      await provider.delete(entity.storageKey);
      await this.mediaAssetRepository.remove(entity);
      this.logger.log(`Permanently deleted media asset ${mediaAssetId}`);
    } else {
      if (entity.status === MediaAssetStatus.Deleted) {
        this.logger.log(`Media asset ${mediaAssetId} is already deleted`);
        return;
      }

      entity.status = MediaAssetStatus.Deleted;
      entity.deletedAt = new Date();

      try {
        await this.mediaAssetRepository.save(entity);
        this.logger.log(`Soft deleted media asset ${mediaAssetId}`);
      } catch (error) {
        if (error instanceof OptimisticLockVersionMismatchError) {
          throw new ConflictException(
            `Media asset ${mediaAssetId} was modified by another request. Please retry.`,
          );
        }
        throw error;
      }
    }
  }

  async archiveMediaAsset(mediaAssetId: string): Promise<void> {
    const entity = await this.mediaAssetRepository.findOne({
      where: { id: mediaAssetId },
    });

    if (!entity) {
      throw new NotFoundException(`Media asset ${mediaAssetId} not found`);
    }

    if (entity.status === MediaAssetStatus.Deleted) {
      throw new ConflictException(`Media asset ${mediaAssetId} has been deleted and cannot be archived`);
    }

    if (entity.status === MediaAssetStatus.Archived) {
      this.logger.log(`Media asset ${mediaAssetId} is already archived`);
      return;
    }

    entity.status = MediaAssetStatus.Archived;
    entity.archivedAt = new Date();

    try {
      await this.mediaAssetRepository.save(entity);
      this.logger.log(`Archived media asset ${mediaAssetId}`);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          `Media asset ${mediaAssetId} was modified by another request. Please retry.`,
        );
      }
      throw error;
    }
  }

  private generateStorageKey(
    ownerType: OwnerEntityType,
    ownerId: string,
    assetId: string,
    filename: string,
  ): string {
    return `${ownerType}/${ownerId}/${assetId}/${filename}`;
  }

  private calculateChecksum(body: Buffer): string {
    return createHash('sha256').update(body).digest('hex');
  }

  private extractMetadata(_body: Buffer, _mimeType: string): MediaAssetMetadata {
    return {};
  }
}
