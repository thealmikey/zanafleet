import * as path from 'path';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from './core/event-bus';
import { Neo4jModule } from './core/neo4j';
import { OrganizationModule } from './modules/organization/organization.module';
import { SignUpModule } from './modules/signup/signup.module';

/**
 * AppModule
 *
 * Root application module that configures global services.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'zanafleet',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      migrations: [path.join(__dirname, '../../../infra/db/migrations/*.{ts,js}')],
      migrationsRun: process.env.NODE_ENV === 'production',
    }),
    EventBusModule.forRoot({
      isGlobal: true,
    }),
    Neo4jModule.forRoot({
      isGlobal: true,
    }),
    OrganizationModule,
    SignUpModule,
  ],
})
export class AppModule {}
