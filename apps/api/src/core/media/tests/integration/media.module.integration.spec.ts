import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MediaModule } from '../../media.module';
import { MediaService } from '../../services/media.service';
import { StorageProviderRegistry } from '../../providers/storage-provider-registry.service';
import { MediaAssetEntity } from '../../entities/media-asset.entity';
import {
  CreateMediaAssetInput,
  MediaAssetStatus,
  OwnerEntityType,
} from '@zanafleet/contracts';

const isDbAvailable = Boolean(process.env.TEST_DB_HOST || process.env.CI);
const describeWithDb = isDbAvailable ? describe : describe.skip;

describeWithDb('MediaModule Integration', () => {
  let module: TestingModule | null = null;
  let mediaService: MediaService;
  let storageRegistry: StorageProviderRegistry;
  let mediaAssetRepository: Repository<MediaAssetEntity>;

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
      mediaAssetRepository = module.get<Repository<MediaAssetEntity>>(
        getRepositoryToken(MediaAssetEntity),
      );
    } catch (error) {
      console.warn(
        'MediaModule integration test setup failed:',
        (error as Error).message,
      );
      throw error;
    }
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('module initialization', () => {
    it('should initialize with NoOp provider as default', () => {
      expect(storageRegistry.getDefaultId()).toBe('noop');
      expect(storageRegistry.getDefault()).toBeDefined();
    });
  });

  describe('full media asset lifecycle', () => {
    let createdAssetId: string;
    const testOwnerId = '11111111-1111-1111-1111-111111111111';

    it('should create a media asset', async () => {
      const body = Buffer.from('integration test content');
      const input: CreateMediaAssetInput = {
        filename: 'integration-test.jpg',
        mimeType: 'image/jpeg',
        size: body.length,
        checksum: 'integration-test-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Business,
        metadata: {
          width: 800,
          height: 600,
        },
      };

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
      const result = await mediaService.getMediaAsset(createdAssetId);

      expect(result).not.toBeNull();
      expect(result!.mediaAssetId).toBe(createdAssetId);
      expect(result!.filename).toBe('integration-test.jpg');
      expect(result!.status).toBe(MediaAssetStatus.Active);
    });

    it('should generate a signed download URL', async () => {
      const result = await mediaService.generateSignedDownloadUrl(createdAssetId, 1800);

      expect(result).toBeDefined();
      expect(result.url).toContain('noop.local');
      expect(result.method).toBe('GET');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should archive the media asset', async () => {
      await mediaService.archiveMediaAsset(createdAssetId);

      const result = await mediaService.getMediaAsset(createdAssetId);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(MediaAssetStatus.Archived);
    });

    it('should not allow download URL for archived asset', async () => {
      await expect(mediaService.generateSignedDownloadUrl(createdAssetId)).rejects.toThrow(
        'is not active',
      );
    });

    it('should soft delete the media asset', async () => {
      const deleteBody = Buffer.from('delete me');
      const anotherInput: CreateMediaAssetInput = {
        filename: 'to-be-deleted.txt',
        mimeType: 'text/plain',
        size: deleteBody.length,
        checksum: 'delete-test-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Rider,
      };

      const created = await mediaService.createMediaAsset(anotherInput, deleteBody);
      await mediaService.deleteMediaAsset(created.mediaAssetId);

      const result = await mediaService.getMediaAsset(created.mediaAssetId);
      expect(result).toBeNull();
    });

    it('should permanently delete the media asset', async () => {
      const permanentBody = Buffer.from('permanent');
      const permanentInput: CreateMediaAssetInput = {
        filename: 'permanent-delete.txt',
        mimeType: 'text/plain',
        size: permanentBody.length,
        checksum: 'permanent-delete-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Delivery,
      };

      const created = await mediaService.createMediaAsset(
        permanentInput,
        permanentBody,
      );
      await mediaService.deleteMediaAsset(created.mediaAssetId, true);

      const result = await mediaService.getMediaAsset(created.mediaAssetId);
      expect(result).toBeNull();
    });
  });

  describe('size validation', () => {
    const testOwnerId = '22222222-2222-2222-2222-222222222222';

    it('should reject asset creation when input.size does not match body.length', async () => {
      const input: CreateMediaAssetInput = {
        filename: 'size-mismatch.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'test-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Rider,
      };
      const body = Buffer.from('short');

      await expect(mediaService.createMediaAsset(input, body)).rejects.toThrow(
        'Size mismatch',
      );
    });

    it('should accept asset creation when input.size matches body.length', async () => {
      const content = 'exact length content';
      const input: CreateMediaAssetInput = {
        filename: 'size-match.txt',
        mimeType: 'text/plain',
        size: content.length,
        checksum: 'valid-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Business,
      };
      const body = Buffer.from(content);

      const result = await mediaService.createMediaAsset(input, body);

      expect(result).toBeDefined();
      expect(result.size).toBe(content.length);
    });
  });

  describe('signed upload URL generation', () => {
    const testOwnerId = '44444444-4444-4444-4444-444444444444';

    it('should generate a signed upload URL for Pending asset', async () => {
      const assetId = uuidv4();
      const entity = MediaAssetEntity.fromDomain({
        mediaAssetId: assetId,
        filename: 'pending-upload.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        checksum: 'pending-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Business,
        status: MediaAssetStatus.Pending,
        storageKey: `Business/${testOwnerId}/${assetId}/pending-upload.jpg`,
        storageProviderId: 'noop',
        createdAt: new Date(),
      });

      await mediaAssetRepository.save(entity);

      const result = await mediaService.generateSignedUploadUrl(assetId, 600);

      expect(result).toBeDefined();
      expect(result.url).toContain('noop.local');
      expect(result.method).toBe('PUT');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate a signed upload URL for Uploading asset', async () => {
      const assetId = uuidv4();
      const entity = MediaAssetEntity.fromDomain({
        mediaAssetId: assetId,
        filename: 'uploading-file.mp4',
        mimeType: 'video/mp4',
        size: 5000000,
        checksum: 'uploading-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Rider,
        status: MediaAssetStatus.Uploading,
        storageKey: `Rider/${testOwnerId}/${assetId}/uploading-file.mp4`,
        storageProviderId: 'noop',
        createdAt: new Date(),
      });

      await mediaAssetRepository.save(entity);

      const result = await mediaService.generateSignedUploadUrl(assetId);

      expect(result).toBeDefined();
      expect(result.url).toContain('noop.local');
      expect(result.method).toBe('PUT');
    });

    it('should reject signed upload URL for Active asset', async () => {
      const body = Buffer.from('active content');
      const input: CreateMediaAssetInput = {
        filename: 'active-asset.txt',
        mimeType: 'text/plain',
        size: body.length,
        checksum: 'active-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Business,
      };

      const created = await mediaService.createMediaAsset(input, body);

      await expect(
        mediaService.generateSignedUploadUrl(created.mediaAssetId),
      ).rejects.toThrow('is not in an uploadable state');
    });
  });

  describe('error handling', () => {
    it('should return null for non-existent asset', async () => {
      const result = await mediaService.getMediaAsset('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });

    it('should throw NotFoundException for signed URL of non-existent asset', async () => {
      await expect(
        mediaService.generateSignedDownloadUrl('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('not found');
    });

    it('should throw NotFoundException when deleting non-existent asset', async () => {
      await expect(
        mediaService.deleteMediaAsset('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('not found');
    });

    it('should throw NotFoundException when archiving non-existent asset', async () => {
      await expect(
        mediaService.archiveMediaAsset('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('not found');
    });
  });

  describe('concurrent operations', () => {
    let testOwnerId: string;

    beforeEach(() => {
      testOwnerId = uuidv4();
    });

    it('should handle concurrent archiveMediaAsset and deleteMediaAsset calls consistently', async () => {
      const input: CreateMediaAssetInput = {
        filename: 'concurrent-test.txt',
        mimeType: 'text/plain',
        size: 20,
        checksum: 'concurrent-test-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Business,
      };
      const body = Buffer.from('concurrent test data');

      const created = await mediaService.createMediaAsset(input, body);
      const assetId = created.mediaAssetId;

      const results = await Promise.allSettled([
        mediaService.archiveMediaAsset(assetId),
        mediaService.deleteMediaAsset(assetId),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );

      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      for (const result of rejected) {
        expect(result.reason.message).toMatch(/not found|was modified by another request/i);
      }

      const finalAsset = await mediaService.getMediaAsset(assetId);

      if (finalAsset !== null) {
        expect(finalAsset.status).toBe(MediaAssetStatus.Archived);
      }
    });

    it('should handle multiple concurrent deleteMediaAsset calls without double-deletion errors', async () => {
      const input: CreateMediaAssetInput = {
        filename: 'multi-delete-test.txt',
        mimeType: 'text/plain',
        size: 25,
        checksum: 'multi-delete-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Rider,
      };
      const body = Buffer.from('multi delete test content');

      const created = await mediaService.createMediaAsset(input, body);
      const assetId = created.mediaAssetId;

      const results = await Promise.allSettled([
        mediaService.deleteMediaAsset(assetId),
        mediaService.deleteMediaAsset(assetId),
        mediaService.deleteMediaAsset(assetId),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );

      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      for (const result of rejected) {
        expect(result.reason.message).toMatch(/not found|was modified by another request/i);
      }

      const finalAsset = await mediaService.getMediaAsset(assetId);
      expect(finalAsset).toBeNull();
    });

    it('should handle concurrent archiveMediaAsset calls consistently', async () => {
      const input: CreateMediaAssetInput = {
        filename: 'multi-archive-test.txt',
        mimeType: 'text/plain',
        size: 26,
        checksum: 'multi-archive-checksum',
        ownerId: testOwnerId,
        ownerType: OwnerEntityType.Delivery,
      };
      const body = Buffer.from('multi archive test content');

      const created = await mediaService.createMediaAsset(input, body);
      const assetId = created.mediaAssetId;

      const results = await Promise.allSettled([
        mediaService.archiveMediaAsset(assetId),
        mediaService.archiveMediaAsset(assetId),
        mediaService.archiveMediaAsset(assetId),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );

      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      for (const result of rejected) {
        expect(result.reason.message).toMatch(/was modified by another request/i);
      }

      const finalAsset = await mediaService.getMediaAsset(assetId);
      expect(finalAsset).not.toBeNull();
      expect(finalAsset!.status).toBe(MediaAssetStatus.Archived);
    });
  });
});
