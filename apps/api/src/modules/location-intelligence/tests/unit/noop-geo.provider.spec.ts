import { GeoPoint } from '../../providers/geo-provider.interface';
import { NoOpGeoProvider } from '../../providers/noop-geo.provider';

describe('NoOpGeoProvider', () => {
  let provider: NoOpGeoProvider;

  beforeEach(() => {
    provider = new NoOpGeoProvider();
  });

  describe('providerId', () => {
    it('should have providerId "noop"', () => {
      expect(provider.providerId).toBe('noop');
    });
  });

  describe('geocode', () => {
    it('should return null for any address', async () => {
      const result = await provider.geocode('123 Main St, Nairobi, Kenya');
      expect(result).toBeNull();
    });

    it('should return null for empty address', async () => {
      const result = await provider.geocode('');
      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should return null for any point', async () => {
      const point: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
      const result = await provider.reverseGeocode(point);
      expect(result).toBeNull();
    });

    it('should return null for origin point', async () => {
      const point: GeoPoint = { latitude: 0, longitude: 0 };
      const result = await provider.reverseGeocode(point);
      expect(result).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for any two points', async () => {
      const from: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
      const to: GeoPoint = { latitude: -1.3, longitude: 36.85 };
      const result = await provider.calculateDistance(from, to);
      expect(result).toBe(0);
    });

    it('should return 0 for same point', async () => {
      const point: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
      const result = await provider.calculateDistance(point, point);
      expect(result).toBe(0);
    });

    it('should return 0 for distant points', async () => {
      const nairobi: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
      const london: GeoPoint = { latitude: 51.5074, longitude: -0.1278 };
      const result = await provider.calculateDistance(nairobi, london);
      expect(result).toBe(0);
    });
  });

  describe('GeoProvider contract compliance', () => {
    it('should implement all required interface methods', () => {
      expect(typeof provider.providerId).toBe('string');
      expect(typeof provider.geocode).toBe('function');
      expect(typeof provider.reverseGeocode).toBe('function');
      expect(typeof provider.calculateDistance).toBe('function');
    });

    it('should return promises from all async methods', async () => {
      const geocodeResult = provider.geocode('test');
      const reverseResult = provider.reverseGeocode({ latitude: 0, longitude: 0 });
      const distanceResult = provider.calculateDistance(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 1 }
      );

      expect(geocodeResult).toBeInstanceOf(Promise);
      expect(reverseResult).toBeInstanceOf(Promise);
      expect(distanceResult).toBeInstanceOf(Promise);

      await expect(geocodeResult).resolves.toBeNull();
      await expect(reverseResult).resolves.toBeNull();
      await expect(distanceResult).resolves.toBe(0);
    });
  });
});
