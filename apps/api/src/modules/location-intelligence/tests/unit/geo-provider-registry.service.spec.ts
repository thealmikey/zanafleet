import { GeoProvider, GeoPoint, Address } from '../../providers/geo-provider.interface';
import { GeoProviderRegistry } from '../../providers/geo-provider-registry.service';

class MockGeoProvider implements GeoProvider {
  constructor(public readonly providerId: string) {}

  async geocode(_address: string): Promise<GeoPoint | null> {
    return { latitude: 1, longitude: 2 };
  }

  async reverseGeocode(_point: GeoPoint): Promise<Address | null> {
    return { formattedAddress: 'Mock Address' };
  }

  async calculateDistance(_from: GeoPoint, _to: GeoPoint): Promise<number> {
    return 100;
  }
}

describe('GeoProviderRegistry', () => {
  let registry: GeoProviderRegistry;

  beforeEach(() => {
    registry = new GeoProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new MockGeoProvider('test');
      registry.register(provider);

      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')).toBe(provider);
    });

    it('should set first registered provider as default', () => {
      const provider = new MockGeoProvider('first');
      registry.register(provider);

      expect(registry.getDefaultId()).toBe('first');
      expect(registry.getDefault()).toBe(provider);
    });

    it('should set provider as default when setAsDefault is true', () => {
      const first = new MockGeoProvider('first');
      const second = new MockGeoProvider('second');

      registry.register(first);
      registry.register(second, true);

      expect(registry.getDefaultId()).toBe('second');
    });

    it('should not override default when setAsDefault is false', () => {
      const first = new MockGeoProvider('first');
      const second = new MockGeoProvider('second');

      registry.register(first);
      registry.register(second, false);

      expect(registry.getDefaultId()).toBe('first');
    });

    it('should replace existing provider with same ID', () => {
      const original = new MockGeoProvider('test');
      const replacement = new MockGeoProvider('test');

      registry.register(original);
      registry.register(replacement);

      expect(registry.get('test')).toBe(replacement);
    });
  });

  describe('get', () => {
    it('should return undefined for unregistered provider', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should return the correct provider', () => {
      const provider = new MockGeoProvider('test');
      registry.register(provider);

      expect(registry.get('test')).toBe(provider);
    });
  });

  describe('getDefault', () => {
    it('should return undefined when no providers registered', () => {
      expect(registry.getDefault()).toBeUndefined();
    });

    it('should return the default provider', () => {
      const provider = new MockGeoProvider('test');
      registry.register(provider);

      expect(registry.getDefault()).toBe(provider);
    });
  });

  describe('setDefault', () => {
    it('should throw when provider is not registered', () => {
      expect(() => registry.setDefault('nonexistent')).toThrow(
        "Cannot set default: provider 'nonexistent' is not registered",
      );
    });

    it('should set the default provider', () => {
      const first = new MockGeoProvider('first');
      const second = new MockGeoProvider('second');

      registry.register(first);
      registry.register(second);
      registry.setDefault('second');

      expect(registry.getDefaultId()).toBe('second');
      expect(registry.getDefault()).toBe(second);
    });
  });

  describe('getRegisteredIds', () => {
    it('should return empty array when no providers', () => {
      expect(registry.getRegisteredIds()).toEqual([]);
    });

    it('should return all registered provider IDs', () => {
      registry.register(new MockGeoProvider('alpha'));
      registry.register(new MockGeoProvider('beta'));
      registry.register(new MockGeoProvider('gamma'));

      const ids = registry.getRegisteredIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('alpha');
      expect(ids).toContain('beta');
      expect(ids).toContain('gamma');
    });
  });

  describe('has', () => {
    it('should return false for unregistered provider', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should return true for registered provider', () => {
      registry.register(new MockGeoProvider('test'));
      expect(registry.has('test')).toBe(true);
    });
  });

  describe('getDefaultId', () => {
    it('should return null when no providers', () => {
      expect(registry.getDefaultId()).toBeNull();
    });

    it('should return the default provider ID', () => {
      registry.register(new MockGeoProvider('test'));
      expect(registry.getDefaultId()).toBe('test');
    });
  });
});
