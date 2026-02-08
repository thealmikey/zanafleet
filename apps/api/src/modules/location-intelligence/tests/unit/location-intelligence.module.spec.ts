import { Test, TestingModule } from '@nestjs/testing';
import { LocationIntelligenceModule } from '../../location-intelligence.module';
import { GeoProviderRegistry } from '../../providers/geo-provider-registry.service';
import { NoOpGeoProvider } from '../../providers/noop-geo.provider';

describe('LocationIntelligenceModule', () => {
  let module: TestingModule;
  let registry: GeoProviderRegistry;
  let noOpProvider: NoOpGeoProvider;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LocationIntelligenceModule],
    }).compile();

    await module.init();

    registry = module.get<GeoProviderRegistry>(GeoProviderRegistry);
    noOpProvider = module.get<NoOpGeoProvider>(NoOpGeoProvider);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide GeoProviderRegistry', () => {
    expect(registry).toBeDefined();
    expect(registry).toBeInstanceOf(GeoProviderRegistry);
  });

  it('should provide NoOpGeoProvider', () => {
    expect(noOpProvider).toBeDefined();
    expect(noOpProvider).toBeInstanceOf(NoOpGeoProvider);
  });

  it('should register NoOpGeoProvider as default on init', () => {
    expect(registry.has('noop')).toBe(true);
    expect(registry.getDefaultId()).toBe('noop');
    expect(registry.getDefault()).toBe(noOpProvider);
  });

  it('should export GeoProviderRegistry', () => {
    const exported = module.get<GeoProviderRegistry>(GeoProviderRegistry);
    expect(exported).toBe(registry);
  });

  it('should export NoOpGeoProvider', () => {
    const exported = module.get<NoOpGeoProvider>(NoOpGeoProvider);
    expect(exported).toBe(noOpProvider);
  });
});
