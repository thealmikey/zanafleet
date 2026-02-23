import * as path from 'path';

import { Logger, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

// Initialize logger for module initialization
const logger = new Logger('AppModule');

import {
  StructuredLoggingInterceptor,
} from './core/api/interceptors/structured-logging.interceptor';
import { TenantContextService } from './core/api/services/tenant-context.service';
import { EventBusModule } from './core/event-bus';
import { HealthModule } from './core/health/health.module';
import { MediaModule } from './core/media';
import { Neo4jModule } from './core/neo4j';
import { RedisModule } from './core/redis/redis.module';
import { SandboxAuthModule } from './core/sandbox/sandbox-auth.module';
import { SandboxModule } from './core/sandbox/sandbox.module';
import { ZanafleetThrottlerModule } from './core/throttler';
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
import { SDUIModule } from './modules/sdui';
import { SearchModule } from './modules/search/search.module';
import { SeedModule } from './modules/seed/seed.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { SignUpModule } from './modules/signup/signup.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WooCommerceModule } from './modules/woocommerce/woocommerce.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

/**
 * Check if sandbox mode is enabled (runs at module load time)
 */
const isSandboxMode = process.env.USE_IN_MEMORY_DB === 'true';

logger.log('[DEBUG] app.module.ts loaded');
logger.log('[DEBUG] USE_IN_MEMORY_DB =', process.env.USE_IN_MEMORY_DB);
logger.log('[DEBUG] isSandboxMode =', isSandboxMode);
logger.log('[DEBUG] All env keys:',
  Object.keys(process.env).filter(k => k.includes('DB') || k.includes('MEMORY') || k.includes('SANDBOX')).join(', '));

/**
 * Get TypeOrmModule configuration - completely skipped in sandbox mode
 * In sandbox mode, we use in-memory stores instead of any database
 * Modules that support sandbox mode use their own in-memory repositories
 * See CapabilityModule for the pattern
 */
function getTypeOrmConfig() {
  if (isSandboxMode) {
    logger.log('[INFO] Sandbox mode enabled: Skipping TypeORM, using in-memory stores');
    logger.log('[WARNING] If you see TypeORM errors, ensure USE_IN_MEMORY_DB is not set to "true" in production!');
    return [];
  }
  logger.log('[DEBUG] getTypeOrmConfig returning TypeOrmModule.forRoot() with Postgres config');
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
    SDUIModule,
    AssetModule,
    MoversModule,
    OperatorModule,
    SeedModule,
    InteractionModule,
    WorkflowModule,
    WooCommerceModule,
    HealthModule,
    RedisModule,
    ZanafleetThrottlerModule,
    // WooCommerceModule,
  ],
  providers: [
    TenantContextService,
    {
      provide: APP_INTERCEPTOR,
      useValue: new StructuredLoggingInterceptor(),
    },
  ],
})
export class AppModule { }
