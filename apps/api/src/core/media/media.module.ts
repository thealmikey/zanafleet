import { createTypeOrmFallbackProviders } from '@api/core/sandbox';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MediaAssetEntity } from './entities/media-asset.entity';
import { MediaController } from './media.controller';
import { NoOpStorageProvider } from './providers/noop-storage.provider';
import { StorageProviderRegistry } from './providers/storage-provider-registry.service';
import { MediaService } from './services/media.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] MediaModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([MediaAssetEntity])];
}

@Module({
  imports: [...getTypeOrmImports()],
  controllers: [MediaController],
  providers: [
    StorageProviderRegistry,
    NoOpStorageProvider,
    MediaService,
    ...(isSandBoxMode
      ? createTypeOrmFallbackProviders(MediaAssetEntity)
      : []),
  ],
  exports: [MediaService, StorageProviderRegistry],
})
export class MediaModule implements OnModuleInit {
  constructor(
    private readonly registry: StorageProviderRegistry,
    private readonly noopProvider: NoOpStorageProvider,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.noopProvider, true);
  }
}
