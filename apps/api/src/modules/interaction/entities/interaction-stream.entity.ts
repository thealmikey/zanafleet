import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { InteractionEventEntity } from './interaction-event.entity';

export enum InteractionStreamState {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

export enum InteractionContextType {
  ORDER = 'ORDER',
  DELIVERY = 'DELIVERY',
  PAYMENT = 'PAYMENT',
  MOVES_QUOTE = 'MOVES_QUOTE',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
  GENERAL = 'GENERAL',
}

/**
 * InteractionStream Entity
 * 
 * Represents a contextual thread of interactions within the platform.
 * This is the aggregate root for all interaction events.
 * 
 * Key concepts:
 * - contextType/contextId: Links stream to domain entities (Order, Delivery, etc.)
 * - participantIds: Tracks all actors who have participated in this stream
 * - metadata: Flexible storage for stream-specific data
 * - state: Controls stream lifecycle (ACTIVE → CLOSED → ARCHIVED)
 */
@Entity('interaction_streams')
@Index(['contextType', 'contextId'])
@Index(['state'])
@Index(['createdAt'])
export class InteractionStreamEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('enum', { enum: InteractionContextType })
  contextType!: InteractionContextType;

  @Column('uuid')
  contextId!: string;

  @Column('enum', {
    enum: InteractionStreamState,
    default: InteractionStreamState.ACTIVE,
  })
  state!: InteractionStreamState;

  @Column('simple-json', { nullable: true })
  metadata!: Record<string, unknown>;

  @Column('text', {
    array: true,
    default: () => "ARRAY[]::text[]",
  })
  participantIds!: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany(() => InteractionEventEntity, (event) => event.stream)
  events!: InteractionEventEntity[];

  /**
   * Check if a participant is part of this stream
   */
  hasParticipant(participantId: string): boolean {
    return this.participantIds.includes(participantId);
  }

  /**
   * Add a participant to the stream
   */
  addParticipant(participantId: string): void {
    if (!this.hasParticipant(participantId)) {
      this.participantIds = [...this.participantIds, participantId];
    }
  }

  /**
   * Archive the stream
   */
  archive(): void {
    this.state = InteractionStreamState.ARCHIVED;
  }

  /**
   * Close the stream
   */
  close(): void {
    this.state = InteractionStreamState.CLOSED;
  }
}
