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
