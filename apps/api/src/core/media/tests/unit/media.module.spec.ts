import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaModule } from '../../media.module';
import { MediaService } from '../../services/media.service';
import { StorageProviderRegistry } from '../../providers/storage-provider-registry.service';
import { NoOpStorageProvider } from '../../providers/noop-storage.provider';
import { MediaAssetEntity } from '../../entities/media-asset.entity';

describe('MediaModule', () => {
  let module: TestingModule;
  let mediaService: MediaService;
  let storageRegistry: StorageProviderRegistry;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MediaModule],
    })
      .overrideProvider(getRepositoryToken(MediaAssetEntity))
      .useValue(mockRepository)
      .compile();

    await module.init();

    mediaService = module.get<MediaService>(MediaService);
    storageRegistry = module.get<StorageProviderRegistry>(StorageProviderRegistry);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('module compilation', () => {
    it('should compile and create the module', () => {
      expect(module).toBeDefined();
    });
  });

  describe('providers', () => {
    it('should provide MediaService', () => {
      expect(mediaService).toBeDefined();
      expect(mediaService).toBeInstanceOf(MediaService);
    });

    it('should provide StorageProviderRegistry', () => {
      expect(storageRegistry).toBeDefined();
      expect(storageRegistry).toBeInstanceOf(StorageProviderRegistry);
    });

    it('should provide NoOpStorageProvider', () => {
      const noopProvider = module.get<NoOpStorageProvider>(NoOpStorageProvider);
      expect(noopProvider).toBeDefined();
      expect(noopProvider).toBeInstanceOf(NoOpStorageProvider);
    });
  });

  describe('onModuleInit', () => {
    it('should register NoOpStorageProvider as default', () => {
      expect(storageRegistry.getDefaultId()).toBe('noop');
    });

    it('should have NoOp provider available via registry', () => {
      const provider = storageRegistry.getDefault();
      expect(provider).toBeDefined();
      expect(provider!.providerId).toBe('noop');
    });

    it('should have noop provider registered', () => {
      expect(storageRegistry.has('noop')).toBe(true);
    });
  });

  describe('exports', () => {
    it('should export MediaService', () => {
      const exported = module.get<MediaService>(MediaService);
      expect(exported).toBe(mediaService);
    });

    it('should export StorageProviderRegistry', () => {
      const exported = module.get<StorageProviderRegistry>(StorageProviderRegistry);
      expect(exported).toBe(storageRegistry);
    });
  });
});
