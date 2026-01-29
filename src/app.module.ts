import { Module } from '@nestjs/common';

import { EventBusModule } from './core/event-bus';
import { Neo4jModule } from './core/neo4j';
import { OrganizationModule } from './modules/organization/organization.module';

/**
 * AppModule
 *
 * Root application module that configures global services.
 */
@Module({
  imports: [
    EventBusModule.forRoot({
      isGlobal: true,
    }),
    Neo4jModule.forRoot({
      isGlobal: true,
    }),
    OrganizationModule,
  ],
})
export class AppModule {}
