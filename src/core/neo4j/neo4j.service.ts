import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import neo4j, { Driver, Session, SessionConfig, auth } from 'neo4j-driver';

import {
  NEO4J_MODULE_OPTIONS,
  DEFAULT_NEO4J_URI,
  DEFAULT_NEO4J_DATABASE,
} from './neo4j.constants';

/**
 * Configuration options for Neo4j connection
 */
export interface Neo4jModuleOptions {
  uri?: string;
  user?: string;
  password?: string;
  database?: string;
  isGlobal?: boolean;
}

/**
 * Neo4jService
 *
 * Provides Neo4j driver management and session creation for the application.
 * Handles connection lifecycle with graceful initialization and shutdown.
 *
 * Usage:
 * ```typescript
 * const session = this.neo4jService.getSession();
 * try {
 *   await session.run('MATCH (n) RETURN n LIMIT 10');
 * } finally {
 *   await session.close();
 * }
 * ```
 */
@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver!: Driver;
  private readonly uri: string;
  private readonly user: string | undefined;
  private readonly password: string | undefined;
  private readonly database: string;

  constructor(
    @Inject(NEO4J_MODULE_OPTIONS)
    options: Neo4jModuleOptions,
  ) {
    this.uri = options.uri || DEFAULT_NEO4J_URI;
    this.user = options.user;
    this.password = options.password;
    this.database = options.database || DEFAULT_NEO4J_DATABASE;
  }

  /**
   * Initialize the Neo4j driver and verify connectivity
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(`Connecting to Neo4j at ${this.uri}`);

    try {
      const authToken =
        this.user && this.password
          ? auth.basic(this.user, this.password)
          : undefined;

      this.driver = neo4j.driver(this.uri, authToken);

      await this.driver.verifyConnectivity({ database: this.database });

      this.logger.log(
        `Successfully connected to Neo4j database: ${this.database}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to connect to Neo4j at ${this.uri}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Gracefully close the Neo4j driver connection
   */
  async onModuleDestroy(): Promise<void> {
    if (this.driver) {
      this.logger.log('Closing Neo4j driver connection');
      await this.driver.close();
      this.logger.log('Neo4j driver connection closed');
    }
  }

  /**
   * Get a new session with optional configuration
   * @param options - Optional session configuration
   * @returns Neo4j Session instance
   */
  getSession(options?: SessionConfig): Session {
    const sessionOptions: SessionConfig = {
      database: this.database,
      ...options,
    };
    return this.driver.session(sessionOptions);
  }

  /**
   * Get a read-only session for query operations
   * @param database - Optional database name override
   * @returns Neo4j Session with READ access mode
   */
  getReadSession(database?: string): Session {
    return this.driver.session({
      database: database || this.database,
      defaultAccessMode: neo4j.session.READ,
    });
  }

  /**
   * Get a write session for mutation operations
   * @param database - Optional database name override
   * @returns Neo4j Session with WRITE access mode
   */
  getWriteSession(database?: string): Session {
    return this.driver.session({
      database: database || this.database,
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  /**
   * Get the raw Neo4j driver instance for advanced operations
   * @returns Neo4j Driver instance
   */
  getDriver(): Driver {
    return this.driver;
  }
}
