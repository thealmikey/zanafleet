import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AssetType, AssetStatus } from '@zanafleet/contracts';
import { Repository, In } from 'typeorm';

import { SearchDocument } from '../../search/dto/search.dto';
import { SEARCH_PROVIDER, ISearchProvider } from '../../search/providers/search-provider.interface';
import { AssetEntity } from '../entities/asset.entity';

export interface MatchingRequirements {
  suggestedType: AssetType;
  estimatedVolumeCBM: number;
  tags: string[];
  requiredSkills?: string[];
  isBundle?: boolean;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    @Inject(SEARCH_PROVIDER)
    private readonly searchProvider: ISearchProvider
  ) {}

  /**
   * AI-assisted matching logic
   * Estimates requirements from natural language input and matches assets.
   */
  async matchAssets(input: string) {
    this.logger.log(`Matching assets for input: "${input}"`);

    // AI logic (mocked for now, structured for LLM integration)
    // Step 1: Analyze input volume/type/skills
    const requirements = await this.estimateRequirements(input);

    // Step 2: Query assets matching requirements
    const matchedAssets = await this.findMatchingAssets(requirements);

    return {
      estimatedRequirements: requirements,
      matches: matchedAssets.map((a) => a.toDomain()),
      bundleSuggested: requirements.isBundle,
      message:
        matchedAssets.length > 0
          ? `Found ${matchedAssets.length} assets matching your needs.`
          : 'No direct matches found, showing best available alternatives.',
    };
  }

  /**
   * Estimator (would be powered by LLM in production)
   */
  private async estimateRequirements(input: string): Promise<MatchingRequirements> {
    const lowerInput = input.toLowerCase();
    const skills: string[] = [];
    let isBundle = false;

    // Skill detection
    if (
      lowerInput.includes('refrigerated') ||
      lowerInput.includes('perishable') ||
      lowerInput.includes('cold')
    ) {
      skills.push('Cold Chain');
    }
    if (
      lowerInput.includes('lift') ||
      lowerInput.includes('heavy') ||
      lowerInput.includes('mover')
    ) {
      skills.push('Heavy Lifting');
    }
    if (
      lowerInput.includes('cross-border') ||
      lowerInput.includes('uganda') ||
      lowerInput.includes('tanzania')
    ) {
      skills.push('Cross-Border Transit');
    }

    // Bundling detection (multiple entities)
    if (
      lowerInput.includes('office') ||
      lowerInput.includes('relocation') ||
      lowerInput.includes('project')
    ) {
      isBundle = true;
    }

    // Simple heuristic for demo purposes
    if (
      lowerInput.includes('house') ||
      lowerInput.includes('moving') ||
      lowerInput.includes('furniture')
    ) {
      return {
        suggestedType: AssetType.VEHICLE,
        estimatedVolumeCBM: 30,
        tags: ['logistics', 'moving', 'heavy-duty'],
        requiredSkills: skills,
        isBundle: isBundle || lowerInput.includes('house'),
      };
    }

    if (
      lowerInput.includes('package') ||
      lowerInput.includes('food') ||
      lowerInput.includes('small')
    ) {
      return {
        suggestedType: AssetType.VEHICLE,
        estimatedVolumeCBM: 1,
        tags: ['delivery', 'express'],
        requiredSkills: skills,
      };
    }

    if (
      lowerInput.includes('warehouse') ||
      lowerInput.includes('store') ||
      lowerInput.includes('storage')
    ) {
      return {
        suggestedType: AssetType.WAREHOUSE,
        estimatedVolumeCBM: 100,
        tags: ['storage', 'warehouse'],
        requiredSkills: skills,
      };
    }

    return {
      suggestedType: AssetType.VEHICLE,
      estimatedVolumeCBM: 5,
      tags: ['general'],
      requiredSkills: skills,
      isBundle,
    };
  }

  /**
   * Finder (integrates with asset repository/search engine)
   */
  private async findMatchingAssets(requirements: MatchingRequirements): Promise<AssetEntity[]> {
    try {
      // Step 1: Use platform search engine for discovery
      const results = await this.searchProvider.search({
        query: requirements.tags.join(' '),
        entityTypes: ['Asset'],
        workspaceId: 'system', // TODO: get from context
        limit: 5,
      });

      if (results.items.length > 0) {
        const ids = results.items.map((d: SearchDocument) => d.entityId);
        this.logger.debug(`Found ${ids.length} assets via search provider`);
        return this.assetRepository.find({
          where: { id: In(ids) },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Search provider failed: ${
          error instanceof Error ? error.message : String(error)
        }. Falling back to DB query.`
      );
    }

    // Step 2: Fallback to basic DB query
    return this.assetRepository.find({
      where: {
        type: requirements.suggestedType,
        status: AssetStatus.ACTIVE,
      },
      take: 5,
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
