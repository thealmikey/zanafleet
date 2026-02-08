import { Module, DynamicModule } from '@nestjs/common';
import { REDIS_MODULE_OPTIONS, DEFAULT_REDIS_URL } from './redis.constants';
import { RedisService, RedisModuleOptions } from './redis.service';

@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const resolvedOptions: RedisModuleOptions = {
      url: options.url || process.env.REDIS_URL || DEFAULT_REDIS_URL,
      isGlobal: options.isGlobal,
    };

    return {
      module: RedisModule,
      global: resolvedOptions.isGlobal ?? false,
      providers: [
        {
          provide: REDIS_MODULE_OPTIONS,
          useValue: resolvedOptions,
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }
}
