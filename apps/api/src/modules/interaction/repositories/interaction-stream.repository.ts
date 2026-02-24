import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import {
  InteractionStreamEntity,
  InteractionContextType,
  InteractionStreamState,
} from '../entities/interaction-stream.entity';

/**
 * InteractionStreamRepository
 * Provides query and persistence methods for interaction streams
 */
@Injectable()
export class InteractionStreamRepository {
  private readonly logger = new Logger(InteractionStreamRepository.name);

  constructor(
    @InjectRepository(InteractionStreamEntity)
    private readonly repository: Repository<InteractionStreamEntity>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Find a stream by its ID
   */
  async findById(id: string): Promise<InteractionStreamEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['events'],
    });
  }

  /**
   * Find a stream by context type and ID
   * Used to find or associate with existing domain entities
   */
  async findByContext(
    contextType: InteractionContextType,
    contextId: string
  ): Promise<InteractionStreamEntity | null> {
    return this.repository.findOne({
      where: { contextType, contextId },
      relations: ['events'],
    });
  }

  /**
   * Find all streams for a given context type
   */
  async findAllByContextType(
    contextType: InteractionContextType
  ): Promise<InteractionStreamEntity[]> {
    return this.repository.find({
      where: { contextType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all active streams
   */
  async findActive(): Promise<InteractionStreamEntity[]> {
    return this.repository.find({
      where: { state: InteractionStreamState.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find streams by participant ID
   */
  async findByParticipant(participantId: string): Promise<InteractionStreamEntity[]> {
    return this.repository
      .createQueryBuilder('stream')
      .where(':participantId = ANY(stream.participantIds)', { participantId })
      .orderBy('stream.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Save a stream entity
   */
  async save(stream: InteractionStreamEntity): Promise<InteractionStreamEntity> {
    return this.repository.save(stream);
  }

  /**
   * Create a new stream (generates ID)
   */
  async create(stream: Partial<InteractionStreamEntity>): Promise<InteractionStreamEntity> {
    const entity = this.repository.create(stream);
    return this.repository.save(entity);
  }

  /**
   * Update stream state
   */
  async updateState(id: string, state: InteractionStreamState): Promise<void> {
    await this.repository.update(id, { state });
  }

  /**
   * Add a participant to a stream
   */
  async addParticipant(streamId: string, participantId: string): Promise<void> {
    const stream = await this.findById(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    if (!stream.hasParticipant(participantId)) {
      stream.addParticipant(participantId);
      await this.repository.save(stream);
    }
  }

  /**
   * Find or create a stream for a given context
   * Uses transaction to ensure idempotency
   */
  async findOrCreate(
    contextType: InteractionContextType,
    contextId: string,
    initialParticipants: string[] = []
  ): Promise<InteractionStreamEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Check if stream already exists
      const existing = await manager.findOne(InteractionStreamEntity, {
        where: { contextType, contextId },
      });

      if (existing) {
        this.logger.debug(`Found existing stream: ${existing.id}`);
        return existing;
      }

      // Create new stream
      const stream = manager.create(InteractionStreamEntity, {
        contextType,
        contextId,
        participantIds: initialParticipants,
        state: InteractionStreamState.ACTIVE,
        metadata: {},
      });

      const saved = await manager.save(stream);
      this.logger.debug(`Created new stream: ${saved.id}`);
      return saved;
    });
  }

  /**
   * Delete a stream by ID
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /**
   * Count streams by state
   */
  async countByState(state: InteractionStreamState): Promise<number> {
    return this.repository.count({ where: { state } });
  }
}
