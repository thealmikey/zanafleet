import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

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
import { MatchingService } from './services/matching.service';
import { TripService } from './services/trip.service';
import { BundleService } from './services/bundle.service';



@Module({
    imports: [
        CqrsModule,
        TypeOrmModule.forFeature([AssetEntity, TripEntity, BundleEntity]),
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
    ],
    exports: [TypeOrmModule, MatchingService, TripService, AssetNeo4jInitializer],
})
export class AssetModule implements OnModuleInit {
    constructor(private readonly assetNeo4jInitializer: AssetNeo4jInitializer) { }

    async onModuleInit(): Promise<void> {
        await this.assetNeo4jInitializer.initialize();
    }
}
