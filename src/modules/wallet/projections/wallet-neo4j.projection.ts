import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { Neo4jService } from '../../../core/neo4j';
import { OwnerType } from '../dto/wallet.enums';
import { WalletCreatedEventV1 } from '../events/wallet-created.event';

/**
 * WalletNeo4jProjection
 *
 * Neo4j projection handler that automatically updates the graph database
 * when WalletCreatedEvent-V1 is emitted.
 *
 * Node Structure:
 * Node: Wallet {id, ownerId, ownerType, type, currency, createdAt, updatedAt}
 * Labels: [:Wallet]
 * Relationships: [:OWNED_BY] -> Owner (Actor|Workspace|Organization)
 * Constraints: UNIQUE (id)
 */
@EventsHandler(WalletCreatedEventV1)
@Injectable()
export class WalletNeo4jProjection
  implements IEventHandler<WalletCreatedEventV1>
{
  private readonly logger = new Logger(WalletNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async handle(event: WalletCreatedEventV1): Promise<void> {
    this.logger.log(
      `Handling WalletCreatedEvent-V1 for wallet: ${event.walletId}`,
    );

    const session = this.neo4j.getSession();

    try {
      const ownerLabel = this.getOwnerLabel(event.ownerType);

      await session.run(
        `
        MERGE (wallet:Wallet {id: $walletId})
        SET 
          wallet.ownerId = $ownerId,
          wallet.ownerType = $ownerType,
          wallet.type = $type,
          wallet.currency = $currency,
          wallet.createdAt = datetime($createdAt),
          wallet.updatedAt = datetime($updatedAt)
        WITH wallet
        MATCH (owner:${ownerLabel} {id: $ownerId})
        MERGE (wallet)-[:OWNED_BY]->(owner)
        RETURN wallet.id as id
        `,
        {
          walletId: event.walletId,
          ownerId: event.ownerId,
          ownerType: event.ownerType,
          type: event.type,
          currency: event.currency,
          createdAt: event.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      this.logger.debug(
        `Wallet node created/updated in Neo4j: ${event.walletId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to project wallet to Neo4j: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }

  private getOwnerLabel(ownerType: OwnerType): string {
    switch (ownerType) {
      case OwnerType.Actor:
        return 'Actor';
      case OwnerType.Workspace:
        return 'Workspace';
      case OwnerType.Organization:
        return 'Organization';
      default:
        return 'Entity';
    }
  }
}

/**
 * Neo4j Initialization Service
 * Sets up constraints and indexes for Wallet nodes
 */
@Injectable()
export class WalletNeo4jInitializer {
  private readonly logger = new Logger(WalletNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async initialize(): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      await session.run(
        `CREATE CONSTRAINT wallet_id_unique IF NOT EXISTS 
         FOR (wallet:Wallet) REQUIRE wallet.id IS UNIQUE`,
      );
      this.logger.log('UNIQUE constraint on Wallet.id created');

      await session.run(
        `CREATE INDEX wallet_ownerId_index IF NOT EXISTS 
         FOR (wallet:Wallet) ON (wallet.ownerId)`,
      );
      this.logger.log('Index on Wallet.ownerId created');

      await session.run(
        `CREATE INDEX wallet_type_index IF NOT EXISTS 
         FOR (wallet:Wallet) ON (wallet.type)`,
      );
      this.logger.log('Index on Wallet.type created');

      await session.run(
        `CREATE INDEX wallet_ownerType_index IF NOT EXISTS 
         FOR (wallet:Wallet) ON (wallet.ownerType)`,
      );
      this.logger.log('Index on Wallet.ownerType created');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Neo4j constraints/indexes: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
