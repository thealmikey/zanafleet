import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MediaAssetEntity } from './entities/media-asset.entity';
import { MediaController } from './media.controller';
import { NoOpStorageProvider } from './providers/noop-storage.provider';
import { StorageProviderRegistry } from './providers/storage-provider-registry.service';
import { MediaService } from './services/media.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAssetEntity])],
  controllers: [MediaController],
  providers: [StorageProviderRegistry, NoOpStorageProvider, MediaService],
  exports: [MediaService, StorageProviderRegistry],
})
export class MediaModule implements OnModuleInit {
  constructor(
    private readonly registry: StorageProviderRegistry,
    private readonly noopProvider: NoOpStorageProvider
  ) {}

  onModuleInit(): void {
    this.registry.register(this.noopProvider, true);
  }
}
