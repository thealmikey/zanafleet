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

export class LocationId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): LocationId {
    return new LocationId(uuidv4());
  }

  static from(value: string): LocationId {
    if (!value || typeof value !== 'string') {
      throw new Error('LocationId must be a non-empty string');
    }
    return new LocationId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: LocationId): boolean {
    return this.value === other.value;
  }
}

export class Location {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly humanReadableName: string,
    public readonly administrativeArea: string,
    public readonly country: string,
  ) {}

  static create(data: {
    latitude: number;
    longitude: number;
    humanReadableName: string;
    administrativeArea: string;
    country?: string;
  }): Location {
    // Validate latitude
    if (typeof data.latitude !== 'number' || isNaN(data.latitude)) {
      throw new Error('Latitude must be a valid number');
    }
    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }

    // Validate longitude
    if (typeof data.longitude !== 'number' || isNaN(data.longitude)) {
      throw new Error('Longitude must be a valid number');
    }
    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }

    // Validate humanReadableName
    const humanReadableName = data.humanReadableName?.trim();
    if (!humanReadableName) {
      throw new Error('Human readable name is required and cannot be empty');
    }

    // Validate administrativeArea
    const administrativeArea = data.administrativeArea?.trim();
    if (!administrativeArea) {
      throw new Error('Administrative area is required and cannot be empty');
    }

    // Country defaults to 'Kenya'
    const country = data.country?.trim() || 'Kenya';

    return new Location(
      data.latitude,
      data.longitude,
      humanReadableName,
      administrativeArea,
      country,
    );
  }

  equals(other: Location): boolean {
    return (
      this.latitude === other.latitude &&
      this.longitude === other.longitude &&
      this.humanReadableName === other.humanReadableName &&
      this.administrativeArea === other.administrativeArea &&
      this.country === other.country
    );
  }

  toJSON(): {
    latitude: number;
    longitude: number;
    humanReadableName: string;
    administrativeArea: string;
    country: string;
  } {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      humanReadableName: this.humanReadableName,
      administrativeArea: this.administrativeArea,
      country: this.country,
    };
  }

  static fromJSON(data: {
    latitude: number;
    longitude: number;
    humanReadableName: string;
    administrativeArea: string;
    country?: string;
  }): Location {
    return Location.create(data);
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
  LocationData,
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
