import { WalletEntity } from '@api/modules/wallet/entities/wallet.entity';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TransactionEntity } from './entities/transaction.entity';
import { CreateTransactionCommandHandler } from './handlers/create-transaction.handler';
import {
  TransactionNeo4jProjection,
  TransactionNeo4jInitializer,
} from './projections/transaction-neo4j.projection';

/**
 * Transaction Module
 *
 * Complete module for managing transactions (fund transfers) in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateTransactionCommand with Zod validation
 * 2. Atomic fund transfers using database transactions
 * 3. TransactionCreatedEvent-V1 (append-only, deterministic)
 * 4. PostgreSQL persistence via TypeORM
 * 5. Neo4j graph projections with FROM/TO relationships
 * 6. Comprehensive unit and integration tests
 */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([TransactionEntity, WalletEntity])],
  providers: [
    CreateTransactionCommandHandler,
    TransactionNeo4jProjection,
    TransactionNeo4jInitializer,
  ],
  exports: [CreateTransactionCommandHandler],
})
export class TransactionModule implements OnModuleInit {
  private readonly logger = new Logger(TransactionModule.name);

  constructor(private readonly neo4jInitializer: TransactionNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.neo4jInitializer.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j constraints', error);
      if (process.env.NEO4J_STRICT_MODE === 'true') {
        throw error;
      }
    }
  }
}
