import { Controller, Get, Post, Patch, Delete, Body, Param, Query, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';

import { CreateAssetDto, AssetResponseDto, MatchAssetsDto, MatchAssetsResponseDto, AddAssetImageDto, UpdateAssetImageDto } from '../dto/asset-platform.dto';
import { AssetImageService } from '../services/asset-image.service';
import { AssetService } from '../services/asset.service';
import { MatchingService } from '../services/matching.service';

/**
 * Asset Controller
 * Manages physical assets (vehicles, warehouses, equipment)
 */
@Controller('assets')
export class AssetController {
    constructor(
        private readonly assetService: AssetService,
        private readonly assetImageService: AssetImageService,
        private readonly matchingService: MatchingService,
    ) { }

    /**
     * Create a new asset
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createAsset(@Body() dto: CreateAssetDto): Promise<AssetResponseDto> {
        return this.assetService.createAsset(dto);
    }

    /**
     * Get asset by ID
     */
    @Get(':id')
    async getAsset(@Param('id') id: string): Promise<AssetResponseDto> {
        const asset = await this.assetService.getAssetById(id);

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        return asset;
    }

    /**
     * Get assets by owner
     */
    @Get('owner/:ownerId')
    async getAssetsByOwner(@Param('ownerId') ownerId: string): Promise<AssetResponseDto[]> {
        return this.assetService.getAssetsByOwner(ownerId);
    }

    /**
     * Match assets using AI
     */
    @Post('match')
    async matchAssets(@Body() dto: MatchAssetsDto): Promise<MatchAssetsResponseDto> {
        return this.matchingService.matchAssets(dto.input);
    }

    /**
     * Get all assets with optional filters
     */
    @Get()
    async listAssets(
        @Query('type') type?: string,
        @Query('status') status?: string,
        @Query('ownerId') ownerId?: string,
    ): Promise<AssetResponseDto[]> {
        // For now, return all assets. Can add filtering logic later
        const assets = ownerId ? await this.assetService.getAssetsByOwner(ownerId) : [];
        return assets;
    }

    /**
     * Add image to asset
     */
    @Post(':id/images')
    @HttpCode(HttpStatus.CREATED)
    async addImage(
        @Param('id') assetId: string,
        @Body() dto: AddAssetImageDto,
    ): Promise<{ message: string }> {
        await this.assetImageService.addImage(assetId, dto);
        return { message: 'Image added successfully' };
    }

    /**
     * Get all images for an asset
     */
    @Get(':id/images')
    async getImages(@Param('id') assetId: string) {
        return this.assetImageService.getAssetImages(assetId);
    }

    /**
     * Update image metadata
     */
    @Patch(':id/images/:mediaId')
    async updateImage(
        @Param('id') assetId: string,
        @Param('mediaId') mediaId: string,
        @Body() dto: UpdateAssetImageDto,
    ): Promise<{ message: string }> {
        await this.assetImageService.updateImageMetadata(assetId, mediaId, dto);
        return { message: 'Image updated successfully' };
    }

    /**
     * Remove image from asset
     */
    @Delete(':id/images/:mediaId')
    async removeImage(
        @Param('id') assetId: string,
        @Param('mediaId') mediaId: string,
    ): Promise<{ message: string }> {
        await this.assetImageService.removeImage(assetId, mediaId);
        return { message: 'Image removed successfully' };
    }
}
