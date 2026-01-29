import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WalletEntity } from './entities/wallet.entity';
import { CreateWalletCommandHandler } from './handlers/create-wallet.handler';
import { CreditWalletCommandHandler } from './handlers/credit-wallet.handler';
import { DebitWalletCommandHandler } from './handlers/debit-wallet.handler';
import { WalletNeo4jProjection, WalletNeo4jInitializer } from './projections/wallet-neo4j.projection';

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
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([WalletEntity]),
  ],
  providers: [
    CreateWalletCommandHandler,
    CreditWalletCommandHandler,
    DebitWalletCommandHandler,
    WalletNeo4jProjection,
    WalletNeo4jInitializer,
  ],
  exports: [
    CreateWalletCommandHandler,
    CreditWalletCommandHandler,
    DebitWalletCommandHandler,
  ],
})
export class WalletModule implements OnModuleInit {
  constructor(private readonly neo4jInitializer: WalletNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    // Uncomment when Neo4j is fully configured:
    // await this.neo4jInitializer.initialize();
  }
}
