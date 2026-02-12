import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BundleEntity, BundleStatus } from '../entities/bundle.entity';
import { TripEntity } from '../entities/trip.entity';
import { AssetEntity } from '../entities/asset.entity';
import {
    CreateBundleDto,
    BundleResponseDto,
    AddTripToBundleDto,
    UpdateBundleStatusDto,
    BundleInvoiceDto,
} from '../dto/asset-platform.dto';

/**
 * Bundle Service
 * Business logic for managing multi-asset project bundles
 */
@Injectable()
export class BundleService {
    constructor(
        @InjectRepository(BundleEntity)
        private readonly bundleRepository: Repository<BundleEntity>,
        @InjectRepository(TripEntity)
        private readonly tripRepository: Repository<TripEntity>,
        @InjectRepository(AssetEntity)
        private readonly assetRepository: Repository<AssetEntity>,
    ) { }

    async createBundle(dto: CreateBundleDto): Promise<BundleResponseDto> {
        const bundle = this.bundleRepository.create({
            id: uuidv4(),
            name: dto.name,
            description: dto.description,
            ownerId: dto.ownerId,
            status: BundleStatus.DRAFT,
            startDate: new Date(dto.startDate),
            endDate: new Date(dto.endDate),
            budgetAmount: dto.budgetAmount,
            metadata: dto.metadata,
        });

        const saved = await this.bundleRepository.save(bundle);

        return {
            bundleId: saved.id,
            name: saved.name,
            description: saved.description,
            ownerId: saved.ownerId,
            status: saved.status,
            startDate: saved.startDate,
            endDate: saved.endDate,
            budgetAmount: saved.budgetAmount,
            metadata: saved.metadata,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt,
        };
    }

    async getBundleById(id: string): Promise<BundleResponseDto | null> {
        const bundle = await this.bundleRepository.findOne({
            where: { id },
            relations: ['trips'],
        });

        if (!bundle) {
            return null;
        }

        return {
            bundleId: bundle.id,
            name: bundle.name,
            description: bundle.description,
            ownerId: bundle.ownerId,
            status: bundle.status,
            startDate: bundle.startDate,
            endDate: bundle.endDate,
            budgetAmount: bundle.budgetAmount,
            metadata: bundle.metadata,
            tripCount: bundle.trips?.length || 0,
            createdAt: bundle.createdAt,
            updatedAt: bundle.updatedAt,
        };
    }

    async addTripToBundle(bundleId: string, dto: AddTripToBundleDto): Promise<{ bundleId: string; tripId: string }> {
        const bundle = await this.bundleRepository.findOne({ where: { id: bundleId } });

        if (!bundle) {
            throw new Error('Bundle not found');
        }

        const trip = this.tripRepository.create({
            id: uuidv4(),
            assetId: dto.assetId,
            operatorId: dto.operatorId,
            bundleId: bundleId,
            startTime: new Date(dto.startTime),
        });

        const savedTrip = await this.tripRepository.save(trip);

        return {
            bundleId,
            tripId: savedTrip.id,
        };
    }

    async updateBundleStatus(bundleId: string, dto: UpdateBundleStatusDto): Promise<BundleResponseDto> {
        const bundle = await this.bundleRepository.findOne({ where: { id: bundleId } });

        if (!bundle) {
            throw new Error('Bundle not found');
        }

        bundle.status = dto.status;
        const updated = await this.bundleRepository.save(bundle);

        return {
            bundleId: updated.id,
            name: updated.name,
            description: updated.description,
            ownerId: updated.ownerId,
            status: updated.status,
            startDate: updated.startDate,
            endDate: updated.endDate,
            budgetAmount: updated.budgetAmount,
            metadata: updated.metadata,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    async generateInvoice(bundleId: string): Promise<BundleInvoiceDto> {
        const bundle = await this.bundleRepository.findOne({
            where: { id: bundleId },
            relations: ['trips'],
        });

        if (!bundle) {
            throw new Error('Bundle not found');
        }

        const trips = await this.tripRepository.find({ where: { bundleId } });

        const tripDetails = await Promise.all(
            trips.map(async trip => {
                const asset = await this.assetRepository.findOne({ where: { id: trip.assetId } });
                return {
                    tripId: trip.id,
                    assetName: asset?.name || 'Unknown Asset',
                    operatorId: trip.operatorId,
                    startTime: trip.startTime,
                    endTime: trip.endTime,
                    earnings: trip.earnings || 0,
                    status: trip.endTime ? 'COMPLETED' : 'IN_PROGRESS',
                };
            })
        );

        const completedTrips = tripDetails.filter(t => t.status === 'COMPLETED');
        const inProgressTrips = tripDetails.filter(t => t.status === 'IN_PROGRESS');
        const totalCost = tripDetails.reduce((sum, t) => sum + t.earnings, 0);

        return {
            bundleId: bundle.id,
            bundleName: bundle.name,
            period: {
                start: bundle.startDate,
                end: bundle.endDate,
            },
            budget: bundle.budgetAmount,
            actual: totalCost,
            variance: bundle.budgetAmount ? bundle.budgetAmount - totalCost : undefined,
            trips: tripDetails,
            summary: {
                totalTrips: trips.length,
                completedTrips: completedTrips.length,
                inProgressTrips: inProgressTrips.length,
                totalCost,
            },
        };
    }
}
