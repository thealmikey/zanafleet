import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

import { SearchDocumentEntity } from './entities/search-document.entity';
import { PostgresSearchProvider } from './providers/postgres-search.provider';
import { SEARCH_PROVIDER } from './providers/search-provider.interface';
import { SearchProjectionService } from './services/search-projection.service';
import { SearchController } from './controllers/search.controller';
import { SearchBackfillWorker } from './workers/search-backfill.worker';
import { OrderEntity } from '../order/entities/order.entity';
import { BusinessEntity } from '../business/entities/business.entity';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';

@Module({
    imports: [
        CqrsModule,
        TypeOrmModule.forFeature([
            SearchDocumentEntity,
            OrderEntity,
            BusinessEntity,
            DeliveryEntity,
        ]),
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
