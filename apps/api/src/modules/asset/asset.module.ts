import { Module, OnModuleInit, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { PolicyModule } from '../policy/policy.module';
import { SearchModule } from '../search/search.module';

import { AssetController } from './controllers/asset.controller';
import { BundleController } from './controllers/bundle.controller';
import { IntegrationController } from './controllers/integration.controller';
import { TripController } from './controllers/trip.controller';
import { AssetEntity } from './entities/asset.entity';
import { BundleEntity } from './entities/bundle.entity';
import { TripEntity } from './entities/trip.entity';
import { AssetNeo4jInitializer, AssetNeo4jProjection } from './projections/asset-neo4j.projection';
import { AssetImageService } from './services/asset-image.service';
import { AssetService } from './services/asset.service';
import { BundleService } from './services/bundle.service';
import { MatchingService } from './services/matching.service';
import { TripService } from './services/trip.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Creates a mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  return {
    save: async (entity: T): Promise<T> => entity,
    find: async (): Promise<T[]> => [],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merge: (entity: T, ...updates: any[]): T => ({ ...entity, ...Object.assign({}, ...updates) }),
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
  };
}

/**
 * Creates fallback providers for TypeORM entities in sandbox mode
 */
function createTypeOrmFallbackProviders(...entities: (new () => unknown)[]): Provider[] {
  if (!isSandBoxMode) return [];
  return entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }));
}

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] AssetModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([AssetEntity, TripEntity, BundleEntity])];
}


@Module({
    imports: [
        CqrsModule,
        ...getTypeOrmImports(),
        PolicyModule,
        SearchModule,
    ],
    controllers: [AssetController, TripController, BundleController, IntegrationController],
    providers: [
        MatchingService,
        TripService,
        AssetService,
        BundleService,
        AssetImageService,
        AssetNeo4jProjection,
        AssetNeo4jInitializer,
        ...createTypeOrmFallbackProviders(AssetEntity, TripEntity, BundleEntity),
    ],
    exports: isSandBoxMode 
      ? [MatchingService, TripService, AssetNeo4jInitializer]
      : [MatchingService, TripService, AssetNeo4jInitializer],
})
export class AssetModule implements OnModuleInit {
    constructor(private readonly assetNeo4jInitializer: AssetNeo4jInitializer) { }

    async onModuleInit(): Promise<void> {
        await this.assetNeo4jInitializer.initialize();
    }
}
