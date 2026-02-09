import * as path from 'path';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from './core/event-bus';
import { MediaModule } from './core/media';
import { Neo4jModule } from './core/neo4j';
import { ActorModule } from './modules/actor/actor.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CapabilityModule } from './modules/capability/capability.module';
import { CommitmentsModule } from './modules/commitments/commitments.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { FormationModule } from './modules/formation/formation.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { PersonaModule } from './modules/persona/persona.module';
import { RiderModule } from './modules/rider/rider.module';
import { RoleModule } from './modules/role/role.module';
import { SaccoModule } from './modules/sacco/sacco.module';
import { SignUpModule } from './modules/signup/signup.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

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
    MediaModule,
    ActorModule,
    AuthModule,
    BusinessModule,
    CalendarModule,
    CapabilityModule,
    CommitmentsModule,
    CommunicationModule,
    EvidenceModule,
    FormationModule,
    OrganizationModule,
    PersonaModule,
    RiderModule,
    RoleModule,
    SaccoModule,
    SignUpModule,
    TransactionModule,
    WalletModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
