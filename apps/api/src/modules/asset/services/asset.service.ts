import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AssetEntity } from '../entities/asset.entity';
import { CreateAssetDto, AssetResponseDto } from '../dto/asset-platform.dto';

/**
 * Asset Service
 * Business logic for managing physical assets
 */
@Injectable()
export class AssetService {
    constructor(
        @InjectRepository(AssetEntity)
        private readonly assetRepository: Repository<AssetEntity>,
    ) { }

    async createAsset(dto: CreateAssetDto): Promise<AssetResponseDto> {
        const asset = this.assetRepository.create({
            id: uuidv4(),
            name: dto.name,
            type: dto.type,
            ownerId: dto.ownerId,
            ownerType: dto.ownerType,
            homeBase: dto.homeBase,
            capacity: dto.capacity,
            metadata: dto.metadata,
        });

        const saved = await this.assetRepository.save(asset);

        return this.toResponseDto(saved);
    }

    async getAssetById(id: string): Promise<AssetResponseDto | null> {
        const asset = await this.assetRepository.findOne({ where: { id } });

        if (!asset) {
            return null;
        }

        return this.toResponseDto(asset);
    }

    async getAssetsByOwner(ownerId: string): Promise<AssetResponseDto[]> {
        const assets = await this.assetRepository.find({ where: { ownerId } });
        return assets.map(asset => this.toResponseDto(asset));
    }

    private toResponseDto(asset: AssetEntity): AssetResponseDto {
        return {
            assetId: asset.id,
            name: asset.name,
            type: asset.type,
            status: asset.status,
            ownerId: asset.ownerId,
            ownerType: asset.ownerType,
            homeBase: asset.homeBase,
            capacity: asset.capacity,
            metadata: asset.metadata,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
        };
    }
}
