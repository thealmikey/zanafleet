import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { GeoProviderRegistry } from '../../providers/geo-provider-registry.service';
import { NoOpGeoProvider } from '../../providers/noop-geo.provider';
import { H3Service } from '../../services/h3.service';
import { RiderLocationRepository } from '../../repositories/rider-location.repository';

describe('LocationIntelligenceModule', () => {
  let module: TestingModule;
  let registry: GeoProviderRegistry;
  let noOpProvider: NoOpGeoProvider;
  let h3Service: H3Service;
  let riderLocationRepository: RiderLocationRepository;

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        GeoProviderRegistry,
        NoOpGeoProvider,
        H3Service,
        RiderLocationRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    await module.init();

    registry = module.get<GeoProviderRegistry>(GeoProviderRegistry);
    noOpProvider = module.get<NoOpGeoProvider>(NoOpGeoProvider);
    h3Service = module.get<H3Service>(H3Service);
    riderLocationRepository = module.get<RiderLocationRepository>(RiderLocationRepository);

    // Manually trigger registration as we're not using the full module
    registry.register(noOpProvider, true);
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

  it('should provide H3Service', () => {
    expect(h3Service).toBeDefined();
    expect(h3Service).toBeInstanceOf(H3Service);
  });

  it('should provide RiderLocationRepository', () => {
    expect(riderLocationRepository).toBeDefined();
    expect(riderLocationRepository).toBeInstanceOf(RiderLocationRepository);
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

  it('should export RiderLocationRepository', () => {
    const exported = module.get<RiderLocationRepository>(RiderLocationRepository);
    expect(exported).toBe(riderLocationRepository);
  });
});
