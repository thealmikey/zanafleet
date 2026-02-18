import { Logger, Module, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CalendarModule } from '../calendar/calendar.module';
import { PolicyModule } from '../policy/policy.module';

import { CustomerController } from './customer.controller';
import { BusinessAvailabilityProjection } from './entities/business-availability.projection';
import { CustomerActivityProjection } from './entities/customer-activity.projection';
import { CustomerEntity } from './entities/customer.entity';
import { MarketDensityProjection } from './entities/market-density.projection';
import { CustomerRepositoryInMemory } from './repositories/customer.repository.in-memory';
import { CommerceContextEngine } from './services/commerce-context-engine.service';
import { CustomerProjectionService } from './services/customer-projection.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';
const logger = new Logger('CustomerModule');

logger.debug(`CustomerModule loading, isSandBoxMode=${isSandBoxMode}`);

// Injection token for CustomerRepository
export const CUSTOMER_REPOSITORY_TOKEN = 'CUSTOMER_REPOSITORY';

// Re-export for external use
export { CustomerRepositoryInMemory } from './repositories/customer.repository.in-memory';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 * In sandbox mode, TypeORM is disabled globally and we skip entity registration
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] CustomerModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerActivityProjection,
      BusinessAvailabilityProjection,
      MarketDensityProjection,
    ]),
  ];
}

type RepositoryProvider = 
  | { provide: string; useClass: Type<unknown> }
  | { provide: string; useFactory: (repo: Repository<CustomerEntity>) => Repository<CustomerEntity>; inject: (string | symbol | Type<unknown>)[] };

/**
 * Get repository provider based on mode
 */
function getRepositoryProvider(): RepositoryProvider {
  if (isSandBoxMode) {
    console.log('[DEBUG] CustomerModule: Using CustomerRepositoryInMemory in sandbox mode');
    return {
      provide: CUSTOMER_REPOSITORY_TOKEN,
      useClass: CustomerRepositoryInMemory,
    };
  }
  // In production mode, use a factory to get the TypeORM repository
  // This allows consumers to use @Inject(CUSTOMER_REPOSITORY_TOKEN) in both modes
  return {
    provide: CUSTOMER_REPOSITORY_TOKEN,
    useFactory: (repo: Repository<CustomerEntity>) => repo,
    inject: [CustomerEntity],
  };
}

/**
 * Get exports - conditionally include TypeOrmModule based on mode
 * Always export the token for consumers that support both modes
 */
function getExports(): Array<Type<unknown> | string> {
  const exports: Array<Type<unknown> | string> = [
    CommerceContextEngine,
    CustomerProjectionService,
  ];
  
  // Only export TypeOrmModule when not in sandbox mode
  if (!isSandBoxMode) {
    exports.push(TypeOrmModule);
  }
  
  // Export the injection token (useful for consumers that support both modes)
  exports.push(CUSTOMER_REPOSITORY_TOKEN);
  
  return exports;
}

@Module({
    imports: [
        ...getTypeOrmImports(),
        CalendarModule,
        PolicyModule,
    ],
    controllers: [CustomerController],
    providers: [
        CommerceContextEngine,
        CustomerProjectionService,
        getRepositoryProvider() as unknown as Type<unknown>,
    ],
    exports: getExports(),
})
export class CustomerModule { }
