import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { AssetEntity } from '../entities/asset.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SEARCH_PROVIDER } from '../../search/providers/search-provider.interface';
import { AssetType } from '@zanafleet/contracts';

describe('MatchingService', () => {
    let service: MatchingService;
    let assetRepository: Repository<AssetEntity>;

    beforeEach(async () => {
        const mockSearchProvider = {
            search: jest.fn().mockResolvedValue({ items: [] }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchingService,
                {
                    provide: getRepositoryToken(AssetEntity),
                    useValue: {
                        find: jest.fn(),
                    },
                },
                {
                    provide: SEARCH_PROVIDER,
                    useValue: mockSearchProvider,
                },
            ],
        }).compile();

        service = module.get<MatchingService>(MatchingService);
        assetRepository = module.get<Repository<AssetEntity>>(getRepositoryToken(AssetEntity));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('matchAssets', () => {
        it('should detect "Cold Chain" skill from refrigerated keywords', async () => {
            const mockAssets = [
                {
                    id: 'asset-1',
                    type: AssetType.VEHICLE,
                    toDomain: () => ({ assetId: 'asset-1' }),
                } as unknown as AssetEntity,
            ];

            jest.spyOn(assetRepository, 'find').mockResolvedValue(mockAssets);

            const result = await service.matchAssets('I need a refrigerated van for meat');

            expect(result.estimatedRequirements.requiredSkills).toContain('Cold Chain');
        });

        it('should detect "Heavy Lifting" skill from lift keywords', async () => {
            const mockAssets = [
                {
                    id: 'asset-2',
                    type: AssetType.VEHICLE,
                    toDomain: () => ({ assetId: 'asset-2' }),
                } as unknown as AssetEntity,
            ];

            jest.spyOn(assetRepository, 'find').mockResolvedValue(mockAssets);

            const result = await service.matchAssets('Need movers for heavy furniture');

            expect(result.estimatedRequirements.requiredSkills).toContain('Heavy Lifting');
        });

        it('should suggest bundling for office relocation', async () => {
            const mockAssets: AssetEntity[] = [];
            jest.spyOn(assetRepository, 'find').mockResolvedValue(mockAssets);

            const result = await service.matchAssets('Moving office to new location');

            expect(result.bundleSuggested).toBe(true);
        });

        it('should estimate volume for house moves', async () => {
            const mockAssets: AssetEntity[] = [];
            jest.spyOn(assetRepository, 'find').mockResolvedValue(mockAssets);

            const result = await service.matchAssets('Moving a 3-bedroom house');

            expect(result.estimatedRequirements.suggestedType).toBe(AssetType.VEHICLE);
            expect(result.estimatedRequirements.estimatedVolumeCBM).toBe(30);
        });

        it('should suggest warehouse for storage needs', async () => {
            const mockAssets: AssetEntity[] = [];
            jest.spyOn(assetRepository, 'find').mockResolvedValue(mockAssets);

            const result = await service.matchAssets('Need storage space for inventory');

            expect(result.estimatedRequirements.suggestedType).toBe(AssetType.WAREHOUSE);
        });
    });
});
