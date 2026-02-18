import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessEntity } from '../business/entities/business.entity';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { OrderEntity } from '../order/entities/order.entity';

import { SearchController } from './controllers/search.controller';
import { SearchDocumentEntity } from './entities/search-document.entity';
import { PostgresSearchProvider } from './providers/postgres-search.provider';
import { SEARCH_PROVIDER } from './providers/search-provider.interface';
import { SearchProjectionService } from './services/search-projection.service';
import { SearchBackfillWorker } from './workers/search-backfill.worker';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] SearchModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([
    SearchDocumentEntity,
    OrderEntity,
    BusinessEntity,
    DeliveryEntity,
  ])];
}


@Module({
    imports: [
        CqrsModule,
        ...getTypeOrmImports(),
    ],
    controllers: [SearchController],
    providers: [
        {
            provide: SEARCH_PROVIDER,
            useClass: PostgresSearchProvider,
        },
        SearchProjectionService,
        SearchBackfillWorker,
    ],
    exports: [SEARCH_PROVIDER],
})
export class SearchModule { }
