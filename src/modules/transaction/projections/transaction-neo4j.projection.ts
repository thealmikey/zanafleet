import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Neo4jService } from '../../../core/neo4j';
import { TransactionCreatedEventV1 } from '../events/transaction-created.event';

/**
 * TransactionNeo4jProjection
 *
 * Neo4j projection handler that automatically updates the graph database
 * when TransactionCreatedEvent-V1 is emitted.
 *
 * Node Structure:
 * Node: Transaction {id, amount, type, status, linkedEventId, createdAt, updatedAt}
 * Labels: [:Transaction]
 * Relationships:
 *   - [:FROM] -> Source Wallet
 *   - [:TO] -> Destination Wallet
 * Constraints: UNIQUE (id)
 */
@EventsHandler(TransactionCreatedEventV1)
@Injectable()
export class TransactionNeo4jProjection
  implements IEventHandler<TransactionCreatedEventV1>
{
  private readonly logger = new Logger(TransactionNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async handle(event: TransactionCreatedEventV1): Promise<void> {
    this.logger.log(
      `Handling TransactionCreatedEvent-V1 for transaction: ${event.transactionId}`,
    );

    const session = this.neo4j.getSession();

    try {
      await session.run(
        `
        MERGE (txn:Transaction {id: $transactionId})
        SET 
          txn.amount = $amount,
          txn.type = $type,
          txn.status = $status,
          txn.linkedEventId = $linkedEventId,
          txn.createdAt = datetime($createdAt),
          txn.updatedAt = datetime($updatedAt)
        WITH txn
        MATCH (sourceWallet:Wallet {id: $sourceWalletId})
        MERGE (txn)-[:FROM]->(sourceWallet)
        WITH txn
        MATCH (destWallet:Wallet {id: $destinationWalletId})
        MERGE (txn)-[:TO]->(destWallet)
        RETURN txn.id as id
        `,
        {
          transactionId: event.transactionId,
          sourceWalletId: event.sourceWalletId,
          destinationWalletId: event.destinationWalletId,
          amount: event.amount,
          type: event.type,
          status: event.status,
          linkedEventId: event.linkedEventId,
          createdAt: event.occurredAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      this.logger.debug(
        `Transaction node created/updated in Neo4j: ${event.transactionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to project transaction to Neo4j: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service
 * Sets up constraints and indexes for Transaction nodes
 */
@Injectable()
export class TransactionNeo4jInitializer {
  private readonly logger = new Logger(TransactionNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async initialize(): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      await session.run(
        `CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS 
         FOR (txn:Transaction) REQUIRE txn.id IS UNIQUE`,
      );
      this.logger.log('UNIQUE constraint on Transaction.id created');

      await session.run(
        `CREATE INDEX transaction_status_index IF NOT EXISTS 
         FOR (txn:Transaction) ON (txn.status)`,
      );
      this.logger.log('Index on Transaction.status created');

      await session.run(
        `CREATE INDEX transaction_type_index IF NOT EXISTS 
         FOR (txn:Transaction) ON (txn.type)`,
      );
      this.logger.log('Index on Transaction.type created');

      await session.run(
        `CREATE INDEX transaction_createdAt_index IF NOT EXISTS 
         FOR (txn:Transaction) ON (txn.createdAt)`,
      );
      this.logger.log('Index on Transaction.createdAt created');
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
