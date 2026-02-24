import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AssetEntity } from '../entities/asset.entity';

/**
 * Asset Image Service
 * Handles image management for assets via Media Engine integration
 */
@Injectable()
export class AssetImageService {
  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>
  ) {}

  /**
   * Add image to asset
   */
  async addImage(
    assetId: string,
    imageData: {
      mediaId: string;
      purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
      isPrimary?: boolean;
    }
  ): Promise<void> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });

    if (!asset) {
      throw new NotFoundException(`Asset with ID "${assetId}" not found`);
    }

    const imageIds = asset.imageIds || [];

    // If setting as primary, unmark other images
    if (imageData.isPrimary) {
      imageIds.forEach((img) => (img.isPrimary = false));
    }

    // Add new image
    imageIds.push({
      mediaId: imageData.mediaId,
      purpose: imageData.purpose || 'custom',
      isPrimary: imageData.isPrimary || false,
      uploadedAt: new Date(),
    });

    asset.imageIds = imageIds;
    await this.assetRepository.save(asset);
  }

  /**
   * Remove image from asset
   */
  async removeImage(assetId: string, mediaId: string): Promise<void> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });

    if (!asset) {
      throw new NotFoundException(`Asset with ID "${assetId}" not found`);
    }

    const imageIds = asset.imageIds || [];
    asset.imageIds = imageIds.filter((img) => img.mediaId !== mediaId);

    await this.assetRepository.save(asset);
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(
    assetId: string,
    mediaId: string,
    updates: {
      purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
      isPrimary?: boolean;
    }
  ): Promise<void> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });

    if (!asset) {
      throw new NotFoundException(`Asset with ID "${assetId}" not found`);
    }

    const imageIds = asset.imageIds || [];
    const imageIndex = imageIds.findIndex((img) => img.mediaId === mediaId);

    if (imageIndex === -1) {
      throw new NotFoundException(`Image with ID "${mediaId}" not found on asset`);
    }

    // If setting as primary, unmark other images
    if (updates.isPrimary) {
      imageIds.forEach((img) => (img.isPrimary = false));
    }

    // Update image metadata
    if (updates.purpose !== undefined) {
      imageIds[imageIndex].purpose = updates.purpose;
    }
    if (updates.isPrimary !== undefined) {
      imageIds[imageIndex].isPrimary = updates.isPrimary;
    }

    asset.imageIds = imageIds;
    await this.assetRepository.save(asset);
  }

  /**
   * Get all images for an asset
   */
  async getAssetImages(assetId: string): Promise<
    Array<{
      mediaId: string;
      purpose?: string;
      isPrimary?: boolean;
      uploadedAt?: Date;
    }>
  > {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });

    if (!asset) {
      throw new NotFoundException(`Asset with ID "${assetId}" not found`);
    }

    return asset.imageIds || [];
  }

  /**
   * Get primary image for an asset
   */
  async getPrimaryImage(assetId: string): Promise<string | null> {
    const images = await this.getAssetImages(assetId);
    const primary = images.find((img) => img.isPrimary);
    return primary ? primary.mediaId : images[0]?.mediaId || null;
  }
}
