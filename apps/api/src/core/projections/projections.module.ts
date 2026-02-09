import { Module, DynamicModule } from '@nestjs/common';

import { Neo4jModule } from '@api/core/neo4j';

/**
 * Configuration options for the Projections module
 */
export interface ProjectionsModuleOptions {
  /** Whether to make the module global */
  isGlobal?: boolean;
}

/**
 * ProjectionsModule
 *
 * NestJS module providing infrastructure for Neo4j projections.
 * Import this module in feature modules that need to create projections.
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [ProjectionsModule.forRoot({ isGlobal: true })],
 * })
 * export class AppModule {}
 *
 * // In feature modules:
 * @Module({
 *   imports: [ProjectionsModule.forFeature()],
 *   providers: [MyProjection],
 * })
 * export class MyFeatureModule {}
 * ```
 */
@Module({})
export class ProjectionsModule {
  /**
   * Configure the Projections module for root usage
   */
  static forRoot(options: ProjectionsModuleOptions = {}): DynamicModule {
    return {
      module: ProjectionsModule,
      global: options.isGlobal ?? false,
      imports: [Neo4jModule],
      exports: [Neo4jModule],
    };
  }

  /**
   * Register the Projections module for feature modules
   */
  static forFeature(): DynamicModule {
    return {
      module: ProjectionsModule,
      imports: [Neo4jModule],
      exports: [Neo4jModule],
    };
  }
}
