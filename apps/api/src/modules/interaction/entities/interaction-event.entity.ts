import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';

import { InteractionStreamEntity } from './interaction-stream.entity';

/**
 * InteractionEventType Enum
 *
 * Defines all possible event types that can occur within an interaction stream.
 * Organized by category for clarity.
 */
export enum InteractionEventType {
  // Human interactions
  HUMAN_MESSAGE = 'HUMAN_MESSAGE',
  HUMAN_ACTION = 'HUMAN_ACTION',

  // AI interactions
  AI_RESPONSE = 'AI_RESPONSE',
  AI_INTENT_DETECTED = 'AI_INTENT_DETECTED',
  AI_SUMMARIZATION = 'AI_SUMMARIZATION',

  // System interactions
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
  POLICY_VIOLATION = 'POLICY_VIOLATION',

  // External integrations
  SLACK_MESSAGE = 'SLACK_MESSAGE',
  TICKET_RESPONSE = 'TICKET_RESPONSE',
  EMAIL_RECEIVED = 'EMAIL_RECEIVED',
  WEBHOOK_EVENT = 'WEBHOOK_EVENT',

  // Domain events projected to stream
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',
}

/**
 * InteractionActorType Enum
 *
 * Defines all possible actor types that can create interaction events.
 * Extends the ActorType with AI_AGENT and EXTERNAL_INTEGRATION.
 */
export enum InteractionActorType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  DRIVER = 'DRIVER',
  RIDER = 'RIDER',
  SYSTEM = 'SYSTEM',
  AI_AGENT = 'AI_AGENT',
  EXTERNAL_INTEGRATION = 'EXTERNAL_INTEGRATION',
}

/**
 * InteractionEvent Entity
 *
 * Represents a single event within an interaction stream.
 * This is the fundamental building block of the Interaction Engine.
 *
 * Key concepts:
 * - streamId: Links event to its parent stream
 * - actorId/actorType: Identifies who/what created the event
 * - eventType: Categorizes the event
 * - payload: Contains event-specific data
 * - createdAt: Immutable timestamp (events are append-only)
 */
@Entity('interaction_events')
@Index(['streamId', 'createdAt'])
@Index(['actorType'])
@Index(['eventType'])
export class InteractionEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  streamId!: string;

  @Column('uuid')
  actorId!: string;

  @Column('enum', { enum: InteractionActorType })
  actorType!: InteractionActorType;

  @Column('enum', { enum: InteractionEventType })
  eventType!: InteractionEventType;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @Column('timestamp with time zone')
  createdAt!: Date;

  @ManyToOne(() => InteractionStreamEntity, (stream) => stream.events)
  @JoinColumn({ name: 'streamId' })
  stream!: InteractionStreamEntity;

  /**
   * Get the display name for this event type
   */
  getEventTypeDisplayName(): string {
    return InteractionEventType[this.eventType] || this.eventType;
  }

  /**
   * Check if this event was created by a human
   */
  isHumanEvent(): boolean {
    return (
      this.eventType === InteractionEventType.HUMAN_MESSAGE ||
      this.eventType === InteractionEventType.HUMAN_ACTION
    );
  }

  /**
   * Check if this event was created by an AI
   */
  isAIEvent(): boolean {
    return (
      this.eventType === InteractionEventType.AI_RESPONSE ||
      this.eventType === InteractionEventType.AI_INTENT_DETECTED ||
      this.eventType === InteractionEventType.AI_SUMMARIZATION
    );
  }

  /**
   * Check if this event was created by an external integration
   */
  isExternalEvent(): boolean {
    return (
      this.eventType === InteractionEventType.SLACK_MESSAGE ||
      this.eventType === InteractionEventType.TICKET_RESPONSE ||
      this.eventType === InteractionEventType.EMAIL_RECEIVED ||
      this.eventType === InteractionEventType.WEBHOOK_EVENT
    );
  }

  /**
   * Check if this event is a system notification
   */
  isSystemEvent(): boolean {
    return (
      this.eventType === InteractionEventType.SYSTEM_NOTIFICATION ||
      this.eventType === InteractionEventType.POLICY_VIOLATION
    );
  }
}
