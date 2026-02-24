import { StorageProviderRegistry } from '../../providers/storage-provider-registry.service';
import { StorageProvider } from '../../providers/storage-provider.interface';

class MockStorageProvider implements StorageProvider {
  constructor(public readonly providerId: string) {}

  async upload(): Promise<{ storageKey: string; size: number; checksum: string }> {
    return { storageKey: 'test', size: 0, checksum: 'test' };
  }

  async download(): Promise<{ body: Buffer; contentType: string; size: number }> {
    return { body: Buffer.from(''), contentType: 'application/octet-stream', size: 0 };
  }

  async delete(): Promise<void> {}

  async exists(): Promise<boolean> {
    return false;
  }

  async generateSignedUrl(): Promise<string> {
    return 'https://test.local';
  }

  async initiateMultipartUpload(): Promise<{ uploadId: string; storageKey: string }> {
    return { uploadId: 'test', storageKey: 'test' };
  }

  async uploadPart(): Promise<{ partNumber: number; etag: string }> {
    return { partNumber: 1, etag: 'test' };
  }

  async completeMultipartUpload(): Promise<{ storageKey: string; size: number; checksum: string }> {
    return { storageKey: 'test', size: 0, checksum: 'test' };
  }

  async abortMultipartUpload(): Promise<void> {}
}

describe('StorageProviderRegistry', () => {
  let registry: StorageProviderRegistry;

  beforeEach(() => {
    registry = new StorageProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new MockStorageProvider('test-provider');
      registry.register(provider);

      expect(registry.has('test-provider')).toBe(true);
      expect(registry.get('test-provider')).toBe(provider);
    });

    it('should set first registered provider as default', () => {
      const provider = new MockStorageProvider('first-provider');
      registry.register(provider);

      expect(registry.getDefaultId()).toBe('first-provider');
      expect(registry.getDefault()).toBe(provider);
    });

    it('should set provider as default when setAsDefault is true', () => {
      const first = new MockStorageProvider('first');
      const second = new MockStorageProvider('second');

      registry.register(first);
      registry.register(second, true);

      expect(registry.getDefaultId()).toBe('second');
    });

    it('should not change default when setAsDefault is false', () => {
      const first = new MockStorageProvider('first');
      const second = new MockStorageProvider('second');

      registry.register(first);
      registry.register(second, false);

      expect(registry.getDefaultId()).toBe('first');
    });

    it('should replace existing provider with same id', () => {
      const original = new MockStorageProvider('same-id');
      const replacement = new MockStorageProvider('same-id');

      registry.register(original);
      registry.register(replacement);

      expect(registry.get('same-id')).toBe(replacement);
    });
  });

  describe('get', () => {
    it('should return undefined for unregistered provider', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('should return registered provider', () => {
      const provider = new MockStorageProvider('test');
      registry.register(provider);

      expect(registry.get('test')).toBe(provider);
    });
  });

  describe('getDefault', () => {
    it('should return undefined when no providers registered', () => {
      expect(registry.getDefault()).toBeUndefined();
    });

    it('should return default provider', () => {
      const provider = new MockStorageProvider('default');
      registry.register(provider);

      expect(registry.getDefault()).toBe(provider);
    });
  });

  describe('setDefault', () => {
    it('should throw when provider is not registered', () => {
      expect(() => registry.setDefault('non-existent')).toThrow(
        "Cannot set default: provider 'non-existent' is not registered"
      );
    });

    it('should set default to registered provider', () => {
      const first = new MockStorageProvider('first');
      const second = new MockStorageProvider('second');

      registry.register(first);
      registry.register(second);
      registry.setDefault('second');

      expect(registry.getDefaultId()).toBe('second');
      expect(registry.getDefault()).toBe(second);
    });
  });

  describe('getRegisteredIds', () => {
    it('should return empty array when no providers registered', () => {
      expect(registry.getRegisteredIds()).toEqual([]);
    });

    it('should return all registered provider ids', () => {
      registry.register(new MockStorageProvider('a'));
      registry.register(new MockStorageProvider('b'));
      registry.register(new MockStorageProvider('c'));

      const ids = registry.getRegisteredIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
    });
  });

  describe('has', () => {
    it('should return false for unregistered provider', () => {
      expect(registry.has('non-existent')).toBe(false);
    });

    it('should return true for registered provider', () => {
      registry.register(new MockStorageProvider('exists'));
      expect(registry.has('exists')).toBe(true);
    });
  });

  describe('getDefaultId', () => {
    it('should return null when no providers registered', () => {
      expect(registry.getDefaultId()).toBeNull();
    });

    it('should return default provider id', () => {
      registry.register(new MockStorageProvider('my-provider'));
      expect(registry.getDefaultId()).toBe('my-provider');
    });
  });
});
