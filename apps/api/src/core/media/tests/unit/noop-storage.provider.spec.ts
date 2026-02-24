import { NoOpStorageProvider } from '../../providers/noop-storage.provider';

describe('NoOpStorageProvider', () => {
  let provider: NoOpStorageProvider;

  beforeEach(() => {
    provider = new NoOpStorageProvider();
  });

  describe('providerId', () => {
    it('should be "noop"', () => {
      expect(provider.providerId).toBe('noop');
    });
  });

  describe('upload', () => {
    it('should return stub upload result with correct size', async () => {
      const body = Buffer.from('test content');
      const result = await provider.upload('test-key', body, 'text/plain');

      expect(result).toEqual({
        storageKey: 'test-key',
        size: body.length,
        checksum: 'noop-checksum',
      });
    });

    it('should use provided key as storageKey', async () => {
      const result = await provider.upload('my/path/file.txt', Buffer.from(''), 'text/plain');

      expect(result.storageKey).toBe('my/path/file.txt');
    });
  });

  describe('download', () => {
    it('should return stub download result', async () => {
      const result = await provider.download('test-key');

      expect(result).toEqual({
        body: Buffer.from(''),
        contentType: 'application/octet-stream',
        size: 0,
      });
    });
  });

  describe('delete', () => {
    it('should resolve without error', async () => {
      await expect(provider.delete('test-key')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return false', async () => {
      const result = await provider.exists('test-key');
      expect(result).toBe(false);
    });
  });

  describe('generateSignedUrl', () => {
    it('should return stub signed URL for GET', async () => {
      const result = await provider.generateSignedUrl('test-key', 'GET', {
        expiresInSeconds: 3600,
      });

      expect(result).toBe('https://noop.local/test-key?signature=noop');
    });

    it('should return stub signed URL for PUT', async () => {
      const result = await provider.generateSignedUrl('my/path/file.txt', 'PUT', {
        expiresInSeconds: 300,
        contentType: 'text/plain',
      });

      expect(result).toBe('https://noop.local/my/path/file.txt?signature=noop');
    });
  });

  describe('initiateMultipartUpload', () => {
    it('should return stub multipart upload init', async () => {
      const result = await provider.initiateMultipartUpload('large-file', 'video/mp4');

      expect(result).toEqual({
        uploadId: 'noop-upload-id',
        storageKey: 'large-file',
      });
    });
  });

  describe('uploadPart', () => {
    it('should return stub part result with correct part number', async () => {
      const result = await provider.uploadPart(
        'upload-123',
        'test-key',
        3,
        Buffer.from('part data')
      );

      expect(result).toEqual({
        partNumber: 3,
        etag: 'noop-etag',
      });
    });

    it('should handle different part numbers', async () => {
      const result1 = await provider.uploadPart('upload-123', 'key', 1, Buffer.from(''));
      const result2 = await provider.uploadPart('upload-123', 'key', 5, Buffer.from(''));

      expect(result1.partNumber).toBe(1);
      expect(result2.partNumber).toBe(5);
    });
  });

  describe('completeMultipartUpload', () => {
    it('should return stub upload result', async () => {
      const parts = [
        { partNumber: 1, etag: 'etag1' },
        { partNumber: 2, etag: 'etag2' },
      ];
      const result = await provider.completeMultipartUpload('upload-123', 'test-key', parts);

      expect(result).toEqual({
        storageKey: 'test-key',
        size: 0,
        checksum: 'noop-checksum',
      });
    });

    it('should handle empty parts array', async () => {
      const result = await provider.completeMultipartUpload('upload-123', 'test-key', []);

      expect(result.storageKey).toBe('test-key');
    });
  });

  describe('abortMultipartUpload', () => {
    it('should resolve without error', async () => {
      await expect(
        provider.abortMultipartUpload('upload-123', 'test-key')
      ).resolves.toBeUndefined();
    });
  });
});
