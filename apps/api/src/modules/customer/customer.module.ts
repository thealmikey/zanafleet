import { Logger, Module, Type, Provider } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

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

// Injection token for CustomerRepository - using InjectionToken for better compatibility
// Injection token for CustomerRepository - using standard TypeORM approach
export const CUSTOMER_REPOSITORY_TOKEN = getRepositoryToken(CustomerEntity);

// Re-export for external use
export { CustomerRepositoryInMemory } from './repositories/customer.repository.in-memory';



/**
 * Creates a mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  return {
    save: async (entity: T): Promise<T> => entity,
    find: async (): Promise<T[]> => [],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    merge: (entity: T, ...updates: Record<string, unknown>[]): T => ({ ...entity, ...Object.assign({}, ...updates) }) as T,
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
  };
}

/**
 * Creates fallback providers for TypeORM entities in sandbox mode
 */
function createTypeOrmFallbackProviders(...entities: (new () => unknown)[]): Provider[] {
  if (!isSandBoxMode) return [];
  return entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }));
}

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

function getCustomerRepositoryProvider(): Provider[] {
  if (isSandBoxMode) {
    console.log('[DEBUG] CustomerModule using useClass for repository');
    return [{ provide: CUSTOMER_REPOSITORY_TOKEN, useClass: CustomerRepositoryInMemory }];
  }
  return [];
}

function getExports(): Array<Type<unknown> | string | symbol> {
  const moduleExports: Array<Type<unknown> | string | symbol | undefined> = [
    CommerceContextEngine,
    CustomerProjectionService,
  ];
  
  // Only export TypeOrmModule when not in sandbox mode
  if (!isSandBoxMode) {
    moduleExports.push(TypeOrmModule);
  }
  
  // Export the injection token (useful for consumers that support both modes)
  // Cast to any to handle both string and symbol types
  moduleExports.push(CUSTOMER_REPOSITORY_TOKEN as unknown as string);
  
  // Filter out any undefined values that might cause issues
  return moduleExports.filter((exp): exp is Type<unknown> | string | symbol => exp !== undefined);
}

const repositoryProviders = getCustomerRepositoryProvider();
console.log('[DEBUG] CustomerModule repository providers:', repositoryProviders);

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
        ...repositoryProviders,
        ...createTypeOrmFallbackProviders(
          BusinessAvailabilityProjection,
          CustomerActivityProjection,
          MarketDensityProjection,
        ),
    ],
    exports: getExports(),
})
export class CustomerModule { }
