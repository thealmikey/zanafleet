/**
 * @zanafleet/domain
 *
 * Domain logic, entities, value objects, and aggregates for the ZanaFleet platform.
 * This package contains the core business logic that is independent of infrastructure.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Value Objects
// ============================================================================

export class EntityId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): EntityId {
    return new EntityId(uuidv4());
  }

  static from(value: string): EntityId {
    if (!value || typeof value !== 'string') {
      throw new Error('EntityId must be a non-empty string');
    }
    return new EntityId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: EntityId): boolean {
    return this.value === other.value;
  }
}

export class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Email {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Invalid email format');
    }
    return new Email(value.toLowerCase());
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {}

  static create(amount: number, currency: string): Money {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a 3-letter ISO code');
    }
    return new Money(amount, currency.toUpperCase());
  }

  static zero(currency: string): Money {
    return Money.create(0, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    return Money.create(this.amount - other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}

// ============================================================================
// Domain Event Base
// ============================================================================

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly correlationId?: string;
  public readonly causationId?: string;

  constructor(params?: { correlationId?: string; causationId?: string }) {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
    this.correlationId = params?.correlationId;
    this.causationId = params?.causationId;
  }

  abstract get eventType(): string;
  abstract get eventVersion(): string;
  abstract get aggregateId(): string;
  abstract get aggregateType(): string;
}

// ============================================================================
// Aggregate Root Base
// ============================================================================

export abstract class AggregateRoot {
  private domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public getDomainEvents(): readonly DomainEvent[] {
    return [...this.domainEvents];
  }

  public clearDomainEvents(): void {
    this.domainEvents = [];
  }
}

// ============================================================================
// Re-export contracts for convenience
// ============================================================================

export type {
  BaseEvent,
  SerializedEvent,
  JwtPayload,
  ValidatedUser,
  CreateActorInput,
  SignUpSessionResponse,
} from '@zanafleet/contracts';

export {
  ActorType,
  RoleScope,
  WorkspaceType,
  WorkspaceStatus,
  OwnerType,
  WalletType,
  SignUpSessionStatus,
} from '@zanafleet/contracts';
