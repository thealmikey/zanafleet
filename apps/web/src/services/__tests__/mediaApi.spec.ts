import { setupServer } from 'msw/node';
import { handlers, resetMockSessions } from '../../mocks/handlers';
import { createMediaAsset, getSignedUrl, uploadToSignedUrl } from '../mediaApi';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockSessions();
});
afterAll(() => server.close());

describe('mediaApi', () => {
  const testInput = {
    filename: 'avatar.png',
    mimeType: 'image/png',
    size: 123,
    ownerId: 'user_1',
    ownerType: 'Rider',
  };

  describe('createMediaAsset', () => {
    it('returns mediaAssetId and storageKey containing ownerType/ownerId/filename', async () => {
      const result = await createMediaAsset(testInput);

      expect(result.mediaAssetId).toBeDefined();
      expect(typeof result.mediaAssetId).toBe('string');
      expect(result.storageKey).toBeDefined();
      expect(result.storageKey).toContain(testInput.ownerType);
      expect(result.storageKey).toContain(testInput.ownerId);
      expect(result.storageKey).toContain(testInput.filename);
    });
  });

  describe('getSignedUrl', () => {
    it('returns method PUT and URL starting with /mock-storage/ for PUT operation', async () => {
      const asset = await createMediaAsset(testInput);

      const signedUrlResp = await getSignedUrl(asset.mediaAssetId, 'PUT');

      expect(signedUrlResp.method).toBe('PUT');
      expect(signedUrlResp.url.startsWith('/mock-storage/')).toBe(true);
    });
  });

  describe('uploadToSignedUrl', () => {
    it('PUTs a blob to the signed URL without throwing', async () => {
      const asset = await createMediaAsset(testInput);
      const signedUrlResp = await getSignedUrl(asset.mediaAssetId, 'PUT');

      const blob = new Blob(['test content'], { type: 'image/png' });

      await expect(
        uploadToSignedUrl(signedUrlResp.url, blob, 'image/png')
      ).resolves.toBeUndefined();
    });
  });
});
