import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MediaService } from '../../services/media.service';
import { MediaAssetEntity } from '../../entities/media-asset.entity';
import { StorageProviderRegistry } from '../../providers/storage-provider-registry.service';
import { StorageProvider } from '../../providers/storage-provider.interface';
import {
  CreateMediaAssetInput,
  MediaAssetStatus,
  OwnerEntityType,
} from '@zanafleet/contracts';

describe('MediaService', () => {
  let service: MediaService;
  let storageRegistry: jest.Mocked<StorageProviderRegistry>;
  let repository: jest.Mocked<Repository<MediaAssetEntity>>;
  let mockProvider: jest.Mocked<StorageProvider>;

  const mockMediaAssetId = '123e4567-e89b-12d3-a456-426614174000';
  const mockOwnerId = '987fcdeb-51a2-3b4c-d567-890123456789';

  beforeEach(async () => {
    mockProvider = {
      providerId: 'test-provider',
      upload: jest.fn().mockResolvedValue({
        storageKey: 'test-key',
        size: 100,
        checksum: 'test-checksum',
      }),
      download: jest.fn().mockResolvedValue({
        body: Buffer.from(''),
        contentType: 'application/octet-stream',
        size: 0,
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      generateSignedUrl: jest.fn().mockResolvedValue('https://signed.url/test'),
      initiateMultipartUpload: jest.fn(),
      uploadPart: jest.fn(),
      completeMultipartUpload: jest.fn(),
      abortMultipartUpload: jest.fn(),
    } as jest.Mocked<StorageProvider>;

    const mockRegistry = {
      getDefault: jest.fn().mockReturnValue(mockProvider),
      get: jest.fn().mockReturnValue(mockProvider),
    };

    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: StorageProviderRegistry,
          useValue: mockRegistry,
        },
        {
          provide: getRepositoryToken(MediaAssetEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    storageRegistry = module.get(StorageProviderRegistry);
    repository = module.get(getRepositoryToken(MediaAssetEntity));
  });

  describe('createMediaAsset', () => {
    it('should create a media asset and upload to storage', async () => {
      const input: CreateMediaAssetInput = {
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        checksum: 'provided-checksum',
        ownerId: mockOwnerId,
        ownerType: OwnerEntityType.Business,
      };
      const body = Buffer.from('test content');

      repository.save.mockImplementation(async (entity) => {
        const typedEntity = entity as MediaAssetEntity;
        typedEntity.updatedAt = new Date();
        return typedEntity;
      });

      const result = await service.createMediaAsset(input, body);

      expect(mockProvider.upload).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.filename).toBe(input.filename);
      expect(result.mimeType).toBe(input.mimeType);
      expect(result.ownerType).toBe(input.ownerType);
      expect(result.status).toBe(MediaAssetStatus.Active);
      expect(result.checksum).toBe('provided-checksum');
    });

    it('should calculate checksum if not provided', async () => {
      const input: CreateMediaAssetInput = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: 12,
        checksum: '',
        ownerId: mockOwnerId,
        ownerType: OwnerEntityType.Rider,
      };
      const body = Buffer.from('test content');

      repository.save.mockImplementation(async (entity) => {
        const typedEntity = entity as MediaAssetEntity;
        expect(typedEntity.checksum).toHaveLength(64);
        typedEntity.updatedAt = new Date();
        return typedEntity;
      });

      const result = await service.createMediaAsset(input, body);

      expect(repository.save).toHaveBeenCalled();
      expect(result.checksum).toHaveLength(64);
    });

    it('should generate correct storage key pattern', async () => {
      const input: CreateMediaAssetInput = {
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 5000,
        checksum: 'abc123',
        ownerId: mockOwnerId,
        ownerType: OwnerEntityType.Delivery,
      };
      const body = Buffer.from('pdf content');

      repository.save.mockImplementation(async (entity) => {
        const typedEntity = entity as MediaAssetEntity;
        expect(typedEntity.storageKey).toMatch(
          new RegExp(`^${OwnerEntityType.Delivery}/${mockOwnerId}/[a-f0-9-]+/document\\.pdf$`),
        );
        typedEntity.updatedAt = new Date();
        return typedEntity;
      });

      await service.createMediaAsset(input, body);

      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw if no storage provider is configured', async () => {
      storageRegistry.getDefault.mockReturnValue(undefined);

      const input: CreateMediaAssetInput = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'test',
        ownerId: mockOwnerId,
        ownerType: OwnerEntityType.Business,
      };

      await expect(service.createMediaAsset(input, Buffer.from(''))).rejects.toThrow(
        'No storage provider configured',
      );
    });
  });

  describe('getMediaAsset', () => {
    it('should return media asset by id', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.filename = 'test.jpg';
      entity.mimeType = 'image/jpeg';
      entity.size = 1024;
      entity.checksum = 'abc123';
      entity.ownerId = mockOwnerId;
      entity.ownerType = OwnerEntityType.Business;
      entity.status = MediaAssetStatus.Active;
      entity.storageKey = 'Business/owner/asset/test.jpg';
      entity.storageProviderId = 'test-provider';
      entity.metadata = null;
      entity.archivedAt = null;
      entity.deletedAt = null;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      repository.findOne.mockResolvedValue(entity);

      const result = await service.getMediaAsset(mockMediaAssetId);

      expect(result).not.toBeNull();
      expect(result!.mediaAssetId).toBe(mockMediaAssetId);
      expect(result!.filename).toBe('test.jpg');
    });

    it('should return null if asset not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getMediaAsset('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null if asset is deleted', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Deleted;

      repository.findOne.mockResolvedValue(entity);

      const result = await service.getMediaAsset(mockMediaAssetId);

      expect(result).toBeNull();
    });

    it('should return archived asset', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.filename = 'archived.jpg';
      entity.mimeType = 'image/jpeg';
      entity.size = 512;
      entity.checksum = 'def456';
      entity.ownerId = mockOwnerId;
      entity.ownerType = OwnerEntityType.Sacco;
      entity.status = MediaAssetStatus.Archived;
      entity.storageKey = 'Sacco/owner/asset/archived.jpg';
      entity.storageProviderId = 'test-provider';
      entity.metadata = null;
      entity.archivedAt = new Date();
      entity.deletedAt = null;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      repository.findOne.mockResolvedValue(entity);

      const result = await service.getMediaAsset(mockMediaAssetId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(MediaAssetStatus.Archived);
    });
  });

  describe('generateSignedDownloadUrl', () => {
    it('should generate signed GET URL for active asset', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.storageKey = 'test-storage-key';
      entity.status = MediaAssetStatus.Active;
      entity.storageProviderId = 'test-provider';

      repository.findOne.mockResolvedValue(entity);
      mockProvider.generateSignedUrl.mockResolvedValue('https://signed.url/download');

      const result = await service.generateSignedDownloadUrl(mockMediaAssetId, 1800);

      expect(mockProvider.generateSignedUrl).toHaveBeenCalledWith('test-storage-key', 'GET', {
        expiresInSeconds: 1800,
      });
      expect(result.url).toBe('https://signed.url/download');
      expect(result.method).toBe('GET');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should use default expiration of 3600 seconds', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.storageKey = 'test-key';
      entity.status = MediaAssetStatus.Active;
      entity.storageProviderId = 'test-provider';

      repository.findOne.mockResolvedValue(entity);

      await service.generateSignedDownloadUrl(mockMediaAssetId);

      expect(mockProvider.generateSignedUrl).toHaveBeenCalledWith('test-key', 'GET', {
        expiresInSeconds: 3600,
      });
    });

    it('should throw NotFoundException if asset not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.generateSignedDownloadUrl('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if asset is not active', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Deleted;

      repository.findOne.mockResolvedValue(entity);

      await expect(service.generateSignedDownloadUrl(mockMediaAssetId)).rejects.toThrow(
        'is not active',
      );
    });

    it('should throw if asset is archived', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Archived;

      repository.findOne.mockResolvedValue(entity);

      await expect(service.generateSignedDownloadUrl(mockMediaAssetId)).rejects.toThrow(
        'is not active',
      );
    });

    it('should fall back to default provider if storageProviderId is null', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.storageKey = 'fallback-key';
      entity.status = MediaAssetStatus.Active;
      entity.storageProviderId = null;

      repository.findOne.mockResolvedValue(entity);

      await service.generateSignedDownloadUrl(mockMediaAssetId);

      expect(storageRegistry.getDefault).toHaveBeenCalled();
    });
  });

  describe('generateSignedUploadUrl', () => {
    it('should generate signed PUT URL for Pending asset', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.storageKey = 'test-storage-key';
      entity.mimeType = 'image/png';
      entity.status = MediaAssetStatus.Pending;
      entity.storageProviderId = 'test-provider';

      repository.findOne.mockResolvedValue(entity);
      mockProvider.generateSignedUrl.mockResolvedValue('https://signed.url/upload');

      const result = await service.generateSignedUploadUrl(mockMediaAssetId, 600);

      expect(mockProvider.generateSignedUrl).toHaveBeenCalledWith('test-storage-key', 'PUT', {
        expiresInSeconds: 600,
        contentType: 'image/png',
      });
      expect(result.url).toBe('https://signed.url/upload');
      expect(result.method).toBe('PUT');
    });

    it('should generate signed PUT URL for Uploading asset', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.storageKey = 'test-storage-key';
      entity.mimeType = 'video/mp4';
      entity.status = MediaAssetStatus.Uploading;
      entity.storageProviderId = 'test-provider';

      repository.findOne.mockResolvedValue(entity);
      mockProvider.generateSignedUrl.mockResolvedValue('https://signed.url/upload');

      const result = await service.generateSignedUploadUrl(mockMediaAssetId);

      expect(result.url).toBe('https://signed.url/upload');
      expect(result.method).toBe('PUT');
    });

    it('should throw NotFoundException if asset not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.generateSignedUploadUrl('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if asset is Active', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Active;

      repository.findOne.mockResolvedValue(entity);

      await expect(service.generateSignedUploadUrl(mockMediaAssetId)).rejects.toThrow(
        'is not in an uploadable state',
      );
    });

    it('should throw if asset is Archived', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Archived;

      repository.findOne.mockResolvedValue(entity);

      await expect(service.generateSignedUploadUrl(mockMediaAssetId)).rejects.toThrow(
        'is not in an uploadable state',
      );
    });

    it('should throw if asset is Deleted', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Deleted;

      repository.findOne.mockResolvedValue(entity);

      await expect(service.generateSignedUploadUrl(mockMediaAssetId)).rejects.toThrow(
        'is not in an uploadable state',
      );
    });

    it('should throw if no provider available', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.storageKey = 'test-key';
      entity.mimeType = 'text/plain';
      entity.status = MediaAssetStatus.Pending;
      entity.storageProviderId = null;

      repository.findOne.mockResolvedValue(entity);
      storageRegistry.getDefault.mockReturnValue(undefined);

      await expect(service.generateSignedUploadUrl(mockMediaAssetId)).rejects.toThrow(
        'No storage provider available',
      );
    });
  });

  describe('deleteMediaAsset', () => {
    it('should soft delete asset by default', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Active;
      entity.storageKey = 'test-key';

      repository.findOne.mockResolvedValue(entity);
      repository.save.mockResolvedValue(entity);

      await service.deleteMediaAsset(mockMediaAssetId);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MediaAssetStatus.Deleted,
          deletedAt: expect.any(Date),
        }),
      );
      expect(mockProvider.delete).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('should permanently delete asset when permanent is true', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Active;
      entity.storageKey = 'test-storage-key';
      entity.storageProviderId = 'test-provider';

      repository.findOne.mockResolvedValue(entity);

      await service.deleteMediaAsset(mockMediaAssetId, true);

      expect(mockProvider.delete).toHaveBeenCalledWith('test-storage-key');
      expect(repository.remove).toHaveBeenCalledWith(entity);
    });

    it('should throw NotFoundException if asset not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.deleteMediaAsset('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw error when permanent delete has no provider available', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.storageKey = 'orphan-key';
      entity.storageProviderId = null;

      repository.findOne.mockResolvedValue(entity);
      storageRegistry.getDefault.mockReturnValue(undefined);

      await expect(service.deleteMediaAsset(mockMediaAssetId, true)).rejects.toThrow(
        'no storage provider available',
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('archiveMediaAsset', () => {
    it('should archive asset', async () => {
      const entity = new MediaAssetEntity();
      entity.id = mockMediaAssetId;
      entity.status = MediaAssetStatus.Active;

      repository.findOne.mockResolvedValue(entity);
      repository.save.mockResolvedValue(entity);

      await service.archiveMediaAsset(mockMediaAssetId);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MediaAssetStatus.Archived,
          archivedAt: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if asset not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.archiveMediaAsset('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
