import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan } from 'typeorm';

import { InteractionEventEntity, InteractionEventType, InteractionActorType } from '../entities/interaction-event.entity';

/**
 * InteractionEventRepository
 * Provides query and persistence methods for interaction events
 */
@Injectable()
export class InteractionEventRepository {
  private readonly logger = new Logger(InteractionEventRepository.name);

  constructor(
    @InjectRepository(InteractionEventEntity)
    private readonly repository: Repository<InteractionEventEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Find an event by its ID
   */
  async findById(id: string): Promise<InteractionEventEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['stream'],
    });
  }

  /**
   * Find all events for a stream, ordered by creation time
   */
  async findByStreamId(streamId: string): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { streamId },
      order: { createdAt: 'ASC' },
      relations: ['stream'],
    });
  }

  /**
   * Find events by stream ID with pagination
   */
  async findByStreamIdPaginated(
    streamId: string,
    limit = 50,
    offset = 0,
  ): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { streamId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['stream'],
    });
  }

  /**
   * Find events by actor ID
   */
  async findByActorId(actorId: string): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find events by actor type
   */
  async findByActorType(actorType: InteractionActorType): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { actorType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find events by event type
   */
  async findByEventType(eventType: InteractionEventType): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { eventType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find human messages in a stream
   */
  async findHumanMessages(streamId: string): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { streamId, eventType: InteractionEventType.HUMAN_MESSAGE },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find AI responses in a stream
   */
  async findAIResponses(streamId: string): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { streamId, actorType: InteractionActorType.AI_AGENT },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find the latest event in a stream
   */
  async findLatestInStream(streamId: string): Promise<InteractionEventEntity | null> {
    return this.repository.findOne({
      where: { streamId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find events after a specific timestamp
   */
  async findAfter(streamId: string, timestamp: Date): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { streamId, createdAt: MoreThan(timestamp) },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find events before a specific timestamp
   */
  async findBefore(streamId: string, timestamp: Date): Promise<InteractionEventEntity[]> {
    return this.repository.find({
      where: { streamId, createdAt: LessThan(timestamp) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Save an event entity
   */
  async save(event: InteractionEventEntity): Promise<InteractionEventEntity> {
    return this.repository.save(event);
  }

  /**
   * Create a new event (generates ID)
   */
  async create(event: Partial<InteractionEventEntity>): Promise<InteractionEventEntity> {
    const entity = this.repository.create(event);
    return this.repository.save(entity);
  }

  /**
   * Append an event to a stream
   * Updates stream's participant list if new participant
   * Uses transaction for atomicity
   */
  async appendToStream(
    streamId: string,
    eventData: Partial<InteractionEventEntity>,
  ): Promise<InteractionEventEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Import here to avoid circular dependency
      const { InteractionStreamEntity } = await import('../entities/interaction-stream.entity');

      // Verify stream exists
      const stream = await manager.findOne(InteractionStreamEntity, {
        where: { id: streamId },
      });

      if (!stream) {
        throw new Error(`Stream not found: ${streamId}`);
      }

      // Create event
      const event = manager.create(InteractionEventEntity, {
        ...eventData,
        streamId,
      });

      const savedEvent = await manager.save(event);

      // Add participant if not already present
      if (!stream.participantIds.includes(eventData.actorId!)) {
        stream.participantIds = [...stream.participantIds, eventData.actorId!];
        await manager.save(stream);
      }

      this.logger.debug(`Appended event ${savedEvent.id} to stream ${streamId}`);
      return savedEvent;
    });
  }

  /**
   * Count events in a stream
   */
  async countByStreamId(streamId: string): Promise<number> {
    return this.repository.count({ where: { streamId } });
  }

  /**
   * Count events by type in a stream
   */
  async countByEventType(streamId: string, eventType: InteractionEventType): Promise<number> {
    return this.repository.count({ where: { streamId, eventType } });
  }

  /**
   * Delete all events for a stream
   */
  async deleteByStreamId(streamId: string): Promise<void> {
    await this.repository.delete({ streamId });
  }
}
