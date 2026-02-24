/**
 * Asset Seed Data Script
 * Populates the database with demo fleet assets for testing and development
 *
 * Features:
 * - Idempotent: Safe to re-run without duplicates
 * - Mixed vehicle types: Truck, Van, Motorcycle, Bus
 * - Mixed statuses: Active, Maintenance, Inactive
 * - Media Engine image IDs with tagged purposes
 * - Operator assignments (reference data for asset-operator relationships)
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AssetType, AssetStatus, OwnerType } from '@zanafleet/contracts';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { AssetEntity } from './entities/asset.entity';

export interface SeedAssetData {
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownerId: string;
  ownerType: OwnerType;
  capacity: Record<string, unknown>;
  metadata: Record<string, unknown>;
  homeBase: {
    latitude: number;
    longitude: number;
    label: string;
  };
  imageIds: Array<{
    mediaId: string;
    purpose: 'exterior' | 'interior' | 'cargo' | 'dashboard';
    isPrimary?: boolean;
  }>;
  operatorId?: string; // Reference to operator (stored in asset metadata)
}

// =============================================================================
// SEED OPERATORS - Reference data for asset-operator assignments
// These are logged and stored in asset metadata for display purposes
// =============================================================================
export interface SeedOperatorData {
  operatorId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export const SEED_OPERATORS: SeedOperatorData[] = [
  {
    operatorId: 'op-john-mwangi',
    name: 'John Mwangi',
    email: 'john.mwangi@zanafleet.com',
    phone: '+254 712 345 678',
    role: 'Fleet Manager',
  },
  {
    operatorId: 'op-sarah-otieno',
    name: 'Sarah Otieno',
    email: 'sarah.otieno@zanafleet.com',
    phone: '+254 723 456 789',
    role: 'Senior Driver',
  },
  {
    operatorId: 'op-david-kariuki',
    name: 'David Kariuki',
    email: 'david.kariuki@zanafleet.com',
    phone: '+254 734 567 890',
    role: 'Courier Rider',
  },
  {
    operatorId: 'op-grace-wanjiku',
    name: 'Grace Wanjiku',
    email: 'grace.wanjiku@zanafleet.com',
    phone: '+254 745 678 901',
    role: 'Logistics Coordinator',
  },
];

// Helper to get operator name by ID
export function getOperatorName(operatorId?: string): string {
  if (!operatorId) return 'Unassigned';
  const operator = SEED_OPERATORS.find((o) => o.operatorId === operatorId);
  return operator?.name || 'Unknown';
}

// =============================================================================
// SEED ASSETS - Demo fleet vehicles
// =============================================================================
export const SEED_ASSETS: SeedAssetData[] = [
  // --- TRUCKS ---
  {
    name: 'Isuzu Forward Truck - KDA 452B',
    type: AssetType.TRUCK,
    status: AssetStatus.ACTIVE,
    ownerId: 'fleet-east-nairobi',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 40,
      weightKG: 10000,
      pallets: 10,
    },
    metadata: {
      make: 'Isuzu',
      model: 'Forward',
      year: 2022,
      fuelType: 'Diesel',
      registrationNumber: 'KDA 452B',
      axleConfiguration: '4x2',
      operatorName: 'Sarah Otieno',
    },
    homeBase: {
      latitude: -1.2921,
      longitude: 36.8219,
      label: 'Nairobi East Depot',
    },
    imageIds: [
      { mediaId: 'media-asset-001', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-002', purpose: 'interior' },
      { mediaId: 'media-asset-003', purpose: 'cargo' },
      { mediaId: 'media-asset-004', purpose: 'dashboard' },
    ],
    operatorId: 'op-sarah-otieno',
  },
  {
    name: 'Mitsubishi Fuso Canter - KDQ 334P',
    type: AssetType.TRUCK,
    status: AssetStatus.MAINTENANCE,
    ownerId: 'fleet-east-nairobi',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 25,
      weightKG: 5500,
      pallets: 6,
    },
    metadata: {
      make: 'Mitsubishi',
      model: 'Fuso Canter',
      year: 2020,
      fuelType: 'Diesel',
      registrationNumber: 'KDQ 334P',
      maintenanceNotes: 'Scheduled engine service',
      axleConfiguration: '4x2',
      operatorName: 'John Mwangi',
    },
    homeBase: {
      latitude: -1.2921,
      longitude: 36.8219,
      label: 'Nairobi East Depot - Maintenance Bay',
    },
    imageIds: [
      { mediaId: 'media-asset-005', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-006', purpose: 'cargo' },
      { mediaId: 'media-asset-007', purpose: 'dashboard' },
    ],
    operatorId: 'op-john-mwangi',
  },
  {
    name: 'Hino 500 Series - KBR 778J',
    type: AssetType.TRUCK,
    status: AssetStatus.ACTIVE,
    ownerId: 'fleet-central',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 50,
      weightKG: 15000,
      pallets: 12,
    },
    metadata: {
      make: 'Hino',
      model: '500 Series',
      year: 2023,
      fuelType: 'Diesel',
      registrationNumber: 'KBR 778J',
      axleConfiguration: '6x4',
      operatorName: 'Sarah Otieno',
    },
    homeBase: {
      latitude: -1.2833,
      longitude: 36.8167,
      label: 'Central Logistics Hub',
    },
    imageIds: [
      { mediaId: 'media-asset-008', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-009', purpose: 'interior' },
      { mediaId: 'media-asset-010', purpose: 'cargo' },
    ],
    operatorId: 'op-sarah-otieno',
  },

  // --- VANS ---
  {
    name: 'Toyota Hiace Van - KCP 881M',
    type: AssetType.VAN,
    status: AssetStatus.ACTIVE,
    ownerId: 'fleet-west-nairobi',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 8,
      weightKG: 1200,
      seats: 14,
    },
    metadata: {
      make: 'Toyota',
      model: 'Hiace',
      year: 2021,
      fuelType: 'Petrol',
      registrationNumber: 'KCP 881M',
      operatorName: 'John Mwangi',
    },
    homeBase: {
      latitude: -1.2674,
      longitude: 36.8078,
      label: 'Westlands Transit Hub',
    },
    imageIds: [
      { mediaId: 'media-asset-011', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-012', purpose: 'interior' },
      { mediaId: 'media-asset-013', purpose: 'dashboard' },
    ],
    operatorId: 'op-john-mwangi',
  },
  {
    name: 'Ford Transit Van - KEL 667R',
    type: AssetType.VAN,
    status: AssetStatus.INACTIVE,
    ownerId: 'fleet-west-nairobi',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 10,
      weightKG: 1500,
    },
    metadata: {
      make: 'Ford',
      model: 'Transit',
      year: 2019,
      fuelType: 'Diesel',
      registrationNumber: 'KEL 667R',
      inactiveReason: 'Awaiting replacement',
      operatorName: 'Unassigned',
    },
    homeBase: {
      latitude: -1.2674,
      longitude: 36.8078,
      label: 'Westlands Depot - Storage',
    },
    imageIds: [
      { mediaId: 'media-asset-014', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-015', purpose: 'interior' },
    ],
  },
  {
    name: 'Mercedes-Benz Sprinter - KMO 445P',
    type: AssetType.VAN,
    status: AssetStatus.ACTIVE,
    ownerId: 'fleet-south-region',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 15,
      weightKG: 2000,
      seats: 3,
    },
    metadata: {
      make: 'Mercedes-Benz',
      model: 'Sprinter',
      year: 2022,
      fuelType: 'Diesel',
      registrationNumber: 'KMO 445P',
      operatorName: 'John Mwangi',
    },
    homeBase: {
      latitude: -1.35,
      longitude: 36.95,
      label: 'South Region Logistics',
    },
    imageIds: [
      { mediaId: 'media-asset-016', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-017', purpose: 'interior' },
      { mediaId: 'media-asset-018', purpose: 'cargo' },
    ],
    operatorId: 'op-john-mwangi',
  },

  // --- MOTORCYCLES ---
  {
    name: 'Honda CB500X Motorcycle - KMA 223A',
    type: AssetType.MOTORCYCLE,
    status: AssetStatus.ACTIVE,
    ownerId: 'fleet-courier-east',
    ownerType: OwnerType.Individual,
    capacity: {
      volumeCBM: 0.5,
      weightKG: 50,
      topBox: true,
    },
    metadata: {
      make: 'Honda',
      model: 'CB500X',
      year: 2023,
      fuelType: 'Petrol',
      registrationNumber: 'KMA 223A',
      engineCC: 500,
      operatorName: 'David Kariuki',
    },
    homeBase: {
      latitude: -1.3029,
      longitude: 36.7072,
      label: 'Karen Courier Station',
    },
    imageIds: [
      { mediaId: 'media-asset-019', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-020', purpose: 'dashboard' },
    ],
    operatorId: 'op-david-kariuki',
  },
  {
    name: 'Yamaha NMAX 155 - KMB 112C',
    type: AssetType.MOTORCYCLE,
    status: AssetStatus.ACTIVE,
    ownerId: 'fleet-courier-east',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 0.3,
      weightKG: 30,
      topBox: true,
    },
    metadata: {
      make: 'Yamaha',
      model: 'NMAX 155',
      year: 2024,
      fuelType: 'Petrol',
      registrationNumber: 'KMB 112C',
      engineCC: 155,
      operatorName: 'David Kariuki',
    },
    homeBase: {
      latitude: -1.3029,
      longitude: 36.7072,
      label: 'Karen Courier Station',
    },
    imageIds: [
      { mediaId: 'media-asset-021', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-022', purpose: 'dashboard' },
    ],
    operatorId: 'op-david-kariuki',
  },
  {
    name: 'Suzuki Burgman 200 - KMC 334D',
    type: AssetType.MOTORCYCLE,
    status: AssetStatus.MAINTENANCE,
    ownerId: 'fleet-courier-central',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 0.4,
      weightKG: 40,
      topBox: true,
    },
    metadata: {
      make: 'Suzuki',
      model: 'Burgman 200',
      year: 2022,
      fuelType: 'Petrol',
      registrationNumber: 'KMC 334D',
      engineCC: 200,
      maintenanceNotes: 'Brake pad replacement needed',
      operatorName: 'Unassigned',
    },
    homeBase: {
      latitude: -1.286,
      longitude: 36.81,
      label: 'CBD Courier Hub',
    },
    imageIds: [
      { mediaId: 'media-asset-023', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-024', purpose: 'dashboard' },
    ],
  },

  // --- BUS ---
  {
    name: 'Toyota Coaster Bus - KBA 556L',
    type: AssetType.BUS,
    status: AssetStatus.ACTIVE,
    ownerId: 'fleet-south-region',
    ownerType: OwnerType.Organization,
    capacity: {
      volumeCBM: 5,
      weightKG: 5000,
      seats: 28,
    },
    metadata: {
      make: 'Toyota',
      model: 'Coaster',
      year: 2021,
      fuelType: 'Diesel',
      registrationNumber: 'KBA 556L',
      acType: 'Split AC',
      operatorName: 'Grace Wanjiku',
    },
    homeBase: {
      latitude: -1.38,
      longitude: 36.98,
      label: 'South Region Bus Terminal',
    },
    imageIds: [
      { mediaId: 'media-asset-025', purpose: 'exterior', isPrimary: true },
      { mediaId: 'media-asset-026', purpose: 'interior' },
      { mediaId: 'media-asset-027', purpose: 'dashboard' },
    ],
    operatorId: 'op-grace-wanjiku',
  },
];

export interface SeedAssetResult {
  assetId: string;
  name: string;
  status: 'created' | 'skipped';
}

@Injectable()
export class AssetSeederService {
  private readonly logger = new Logger(AssetSeederService.name);

  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>
  ) {}

  /**
   * Run the seed operation
   * Idempotent: Only creates assets that don't exist
   */
  async seed(): Promise<{
    created: number;
    skipped: number;
    assets: SeedAssetResult[];
    operators: SeedOperatorData[];
  }> {
    this.logger.log('Starting asset seed operation...');
    this.logger.log(`Available operators: ${SEED_OPERATORS.map((o) => o.name).join(', ')}`);

    const results: SeedAssetResult[] = [];
    let created = 0;
    let skipped = 0;

    for (const assetData of SEED_ASSETS) {
      try {
        const exists = await this.assetRepository.findOne({
          where: { name: assetData.name },
        });

        if (exists) {
          this.logger.log(`⏭️  Skipping existing asset: ${assetData.name}`);
          results.push({
            assetId: exists.id,
            name: assetData.name,
            status: 'skipped',
          });
          skipped++;
          continue;
        }

        const asset = this.assetRepository.create({
          id: uuidv4(),
          name: assetData.name,
          type: assetData.type,
          status: assetData.status,
          ownerId: assetData.ownerId,
          ownerType: assetData.ownerType,
          capacity: assetData.capacity,
          metadata: assetData.metadata,
          homeBase: assetData.homeBase,
          imageIds: assetData.imageIds,
        });

        await this.assetRepository.save(asset);

        const operatorName = getOperatorName(assetData.operatorId);
        this.logger.log(
          `✅ Created asset: ${assetData.name} (${assetData.type}) - Operator: ${operatorName}`
        );
        results.push({
          assetId: asset.id,
          name: assetData.name,
          status: 'created',
        });
        created++;
      } catch (error) {
        this.logger.error(`❌ Failed to seed asset: ${assetData.name}`, error);
      }
    }

    this.logger.log(`Asset seeding complete. Created: ${created}, Skipped: ${skipped}`);

    return { created, skipped, assets: results, operators: SEED_OPERATORS };
  }

  /**
   * Clear all seeded assets (for testing)
   */
  async clear(): Promise<number> {
    this.logger.log('Clearing seeded assets...');

    const ownerIds = SEED_ASSETS.map((a) => a.ownerId);
    const assets = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.ownerId IN (:...ownerIds)', { ownerIds })
      .getMany();

    const count = assets.length;

    for (const asset of assets) {
      await this.assetRepository.remove(asset);
      this.logger.log(`🗑️  Removed asset: ${asset.name}`);
    }

    this.logger.log(`Cleared ${count} assets`);
    return count;
  }

  /**
   * Check if seed has been run
   */
  async isSeeded(): Promise<boolean> {
    const count = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.ownerId IN (:...ownerIds)', {
        ownerIds: SEED_ASSETS.map((a) => a.ownerId),
      })
      .getCount();

    return count > 0;
  }
}
