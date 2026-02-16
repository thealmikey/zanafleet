import * as path from 'path';

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from './core/event-bus';
import { MediaModule } from './core/media';
import { Neo4jModule } from './core/neo4j';
import { SandboxAuthModule } from './core/sandbox/sandbox-auth.module';
import { SandboxModule } from './core/sandbox/sandbox.module';
import { AccountModule } from './modules/account/account.module';
import { ActorModule } from './modules/actor/actor.module';
import { AssetModule } from './modules/asset/asset.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { BusinessModule } from './modules/business/business.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CapabilityModule } from './modules/capability/capability.module';
import { CommitmentsModule } from './modules/commitments/commitments.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { FormationModule } from './modules/formation/formation.module';
import { IncentiveModule } from './modules/incentive/incentive.module';
import { InteractionModule } from './modules/interaction/interaction.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { MoversModule } from './modules/movers/movers.module';
import { OperatorModule } from './modules/operator/operator.module';
import { OrderModule } from './modules/order/order.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PersonaModule } from './modules/persona/persona.module';
import { RiderModule } from './modules/rider/rider.module';
import { RoleModule } from './modules/role/role.module';
import { SaccoModule } from './modules/sacco/sacco.module';
import { SearchModule } from './modules/search/search.module';
import { SeedModule } from './modules/seed/seed.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { SignUpModule } from './modules/signup/signup.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

/**
 * Check if sandbox mode is enabled (runs at module load time)
 */
const isSandboxMode = process.env.USE_IN_MEMORY_DB === 'true';

console.log('[DEBUG] app.module.ts loaded');
console.log('[DEBUG] USE_IN_MEMORY_DB =', process.env.USE_IN_MEMORY_DB);
console.log('[DEBUG] isSandboxMode =', isSandboxMode);

/**
 * Get TypeOrmModule configuration - only when NOT in sandbox mode
 */
function getTypeOrmConfig() {
  if (isSandboxMode) {
    console.log('[INFO] Sandbox mode enabled: Skipping Postgres connection');
    return [];
  }
  return [
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
  ];
}

/**
 * AppModule
 *
 * Root application module that configures global services.
 */
@Module({
  imports: [
    ...getTypeOrmConfig(),
    EventBusModule.forRoot({
      isGlobal: true,
    }),
    // Neo4jModule is always imported - in sandbox mode it will skip connection gracefully
    Neo4jModule.forRoot({
      isGlobal: true,
    }),
    SandboxModule.forRoot(),
    ScheduleModule.forRoot(),
    MediaModule,
    AccountModule,
    ActorModule,
    // Auth module: SandboxAuthModule in sandbox mode, AuthModule in production
    // The env var is set BEFORE this module is loaded (see sandbox.cli.ts)
    ...(isSandboxMode ? [SandboxAuthModule] : [AuthModule]),
    BillingModule,
    BusinessModule,
    CustomerModule,
    CalendarModule,
    CapabilityModule,
    CommitmentsModule,
    CommunicationModule,
    DashboardModule,
    DeliveryModule,
    EvidenceModule,
    FormationModule,
    IncentiveModule,
    LedgerModule,
    OrderModule,
    PaymentModule,
    SettlementModule,
    OrganizationModule,
    PersonaModule,
    RiderModule,
    RoleModule,
    SaccoModule,
    SignUpModule,
    TransactionModule,
    WalletModule,
    WorkspaceModule,
    SearchModule,
    AssetModule,
    MoversModule,
    OperatorModule,
    SeedModule,
    InteractionModule,
    WorkflowModule,
  ],
})
export class AppModule { }
