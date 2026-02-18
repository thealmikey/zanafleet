import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WalletEntity } from './entities/wallet.entity';
import { CreateWalletCommandHandler } from './handlers/create-wallet.handler';
import { CreditWalletCommandHandler } from './handlers/credit-wallet.handler';
import { DebitWalletCommandHandler } from './handlers/debit-wallet.handler';
import {
  WalletNeo4jProjection,
  WalletNeo4jInitializer,
} from './projections/wallet-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] WalletModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([WalletEntity])];
}

/**
 * Wallet Module
 *
 * Complete module for managing wallets in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateWalletCommand with Zod validation
 * 2. CreditWalletCommand for adding funds
 * 3. DebitWalletCommand for withdrawing funds (with balance validation)
 * 4. WalletCreated/Credited/Debited events (append-only, deterministic)
 * 5. PostgreSQL persistence via TypeORM
 * 6. Neo4j graph projections with OWNED_BY relationships
 * 7. Comprehensive unit and integration tests
 */
@Module({
  imports: [CqrsModule, ...getTypeOrmImports()],
  providers: [
    CreateWalletCommandHandler,
    CreditWalletCommandHandler,
    DebitWalletCommandHandler,
    WalletNeo4jProjection,
    WalletNeo4jInitializer,
  ],
  exports: [CreateWalletCommandHandler, CreditWalletCommandHandler, DebitWalletCommandHandler],
})
export class WalletModule implements OnModuleInit {
  private readonly logger = new Logger(WalletModule.name);

  constructor(private readonly neo4jInitializer: WalletNeo4jInitializer) {}

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
