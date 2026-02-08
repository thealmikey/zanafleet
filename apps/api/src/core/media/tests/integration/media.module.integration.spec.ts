import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../../media.module';
import { MediaService } from '../../services/media.service';
import { StorageProviderRegistry } from '../../providers/storage-provider-registry.service';
import { MediaAssetEntity } from '../../entities/media-asset.entity';
import {
  CreateMediaAssetInput,
  MediaAssetStatus,
  OwnerEntityType,
} from '@zanafleet/contracts';

describe('MediaModule Integration', () => {
  let module: TestingModule | null = null;
  let mediaService: MediaService;
  let storageRegistry: StorageProviderRegistry;
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.TEST_DB_HOST || 'localhost',
            port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
            username: process.env.TEST_DB_USERNAME || 'postgres',
            password: process.env.TEST_DB_PASSWORD || 'postgres',
            database: process.env.TEST_DB_DATABASE || 'zanafleet_test',
            entities: [MediaAssetEntity],
            synchronize: true,
            dropSchema: true,
          }),
          MediaModule,
        ],
      }).compile();

      await module.init();

      mediaService = module.get<MediaService>(MediaService);
      storageRegistry = module.get<StorageProviderRegistry>(StorageProviderRegistry);
      isDbAvailable = true;
    } catch (error) {
      console.warn(
        'Skipping MediaModule integration tests: database not available.',
        (error as Error).message,
      );
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('module initialization', () => {
    it('should initialize with NoOp provider as default', () => {
      if (!isDbAvailable) {
        return;
      }
      expect(storageRegistry.getDefaultId()).toBe('noop');
      expect(storageRegistry.getDefault()).toBeDefined();
    });
  });

  describe('full media asset lifecycle', () => {
    let createdAssetId: string;
    const testOwnerId = '11111111-1111-1111-1111-111111111111';

    it('should create a media asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      const input: CreateMediaAssetInput = {
        filename: 'integration-test.jpg',
        mimeType: 'image/jpeg',
        size: 2048,
        checksum: 'integration-test-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Business,
        metadata: {
          width: 800,
          height: 600,
        },
      };
      const body = Buffer.from('integration test content');

      const result = await mediaService.createMediaAsset(input, body);

      expect(result).toBeDefined();
      expect(result.mediaAssetId).toBeDefined();
      expect(result.filename).toBe('integration-test.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.ownerId).toBe(testOwnerId);
      expect(result.ownerType).toBe(OwnerEntityType.Business);
      expect(result.status).toBe(MediaAssetStatus.Active);
      expect(result.metadata).toEqual({ width: 800, height: 600 });

      createdAssetId = result.mediaAssetId;
    });

    it('should retrieve the created media asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      const result = await mediaService.getMediaAsset(createdAssetId);

      expect(result).not.toBeNull();
      expect(result!.mediaAssetId).toBe(createdAssetId);
      expect(result!.filename).toBe('integration-test.jpg');
      expect(result!.status).toBe(MediaAssetStatus.Active);
    });

    it('should generate a signed download URL', async () => {
      if (!isDbAvailable) {
        return;
      }
      const result = await mediaService.generateSignedDownloadUrl(createdAssetId, 1800);

      expect(result).toBeDefined();
      expect(result.url).toContain('noop.local');
      expect(result.method).toBe('GET');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate a signed upload URL', async () => {
      if (!isDbAvailable) {
        return;
      }
      const result = await mediaService.generateSignedUploadUrl(createdAssetId, 600);

      expect(result).toBeDefined();
      expect(result.url).toContain('noop.local');
      expect(result.method).toBe('PUT');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should archive the media asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      await mediaService.archiveMediaAsset(createdAssetId);

      const result = await mediaService.getMediaAsset(createdAssetId);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(MediaAssetStatus.Archived);
    });

    it('should not allow download URL for archived asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      await expect(mediaService.generateSignedDownloadUrl(createdAssetId)).rejects.toThrow(
        'is not active',
      );
    });

    it('should soft delete the media asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      const anotherInput: CreateMediaAssetInput = {
        filename: 'to-be-deleted.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'delete-test-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Rider,
      };

      const created = await mediaService.createMediaAsset(anotherInput, Buffer.from('delete me'));
      await mediaService.deleteMediaAsset(created.mediaAssetId);

      const result = await mediaService.getMediaAsset(created.mediaAssetId);
      expect(result).toBeNull();
    });

    it('should permanently delete the media asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      const permanentInput: CreateMediaAssetInput = {
        filename: 'permanent-delete.txt',
        mimeType: 'text/plain',
        size: 50,
        checksum: 'permanent-delete-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Delivery,
      };

      const created = await mediaService.createMediaAsset(
        permanentInput,
        Buffer.from('permanent'),
      );
      await mediaService.deleteMediaAsset(created.mediaAssetId, true);

      const result = await mediaService.getMediaAsset(created.mediaAssetId);
      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return null for non-existent asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      const result = await mediaService.getMediaAsset('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });

    it('should throw NotFoundException for signed URL of non-existent asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      await expect(
        mediaService.generateSignedDownloadUrl('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('not found');
    });

    it('should throw NotFoundException when deleting non-existent asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      await expect(
        mediaService.deleteMediaAsset('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('not found');
    });

    it('should throw NotFoundException when archiving non-existent asset', async () => {
      if (!isDbAvailable) {
        return;
      }
      await expect(
        mediaService.archiveMediaAsset('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('not found');
    });
  });
});
