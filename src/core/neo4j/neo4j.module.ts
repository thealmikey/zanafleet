import { Module, DynamicModule } from '@nestjs/common';

import { NEO4J_MODULE_OPTIONS, DEFAULT_NEO4J_URI, DEFAULT_NEO4J_DATABASE } from './neo4j.constants';
import { Neo4jService, Neo4jModuleOptions } from './neo4j.service';

/**
 * Neo4jModule
 *
 * NestJS module that configures Neo4j driver connection.
 * Provides Neo4jService for session management and graph operations.
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     Neo4jModule.forRoot({
 *       uri: process.env.NEO4J_URI,
 *       user: process.env.NEO4J_USER,
 *       password: process.env.NEO4J_PASSWORD,
 *       isGlobal: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class Neo4jModule {
  /**
   * Configures the Neo4j module with connection options
   * @param options - Module configuration options
   * @returns Dynamic module configuration
   */
  static forRoot(options: Neo4jModuleOptions = {}): DynamicModule {
    const resolvedOptions: Neo4jModuleOptions = {
      uri: options.uri || process.env.NEO4J_URI || DEFAULT_NEO4J_URI,
      user: options.user || process.env.NEO4J_USER,
      password: options.password || process.env.NEO4J_PASSWORD,
      database: options.database || process.env.NEO4J_DATABASE || DEFAULT_NEO4J_DATABASE,
      isGlobal: options.isGlobal,
    };

    return {
      module: Neo4jModule,
      global: resolvedOptions.isGlobal ?? false,
      providers: [
        {
          provide: NEO4J_MODULE_OPTIONS,
          useValue: resolvedOptions,
        },
        Neo4jService,
      ],
      exports: [Neo4jService],
    };
  }
}
