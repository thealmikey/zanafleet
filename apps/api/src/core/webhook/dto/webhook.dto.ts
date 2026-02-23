import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Create Subscription DTO
 */
export class CreateSubscriptionDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsUrl()
  url!: string;

  @IsArray()
  @IsString({ each: true })
  events!: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Update Subscription DTO
 */
export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Subscription Response DTO
 */
export class SubscriptionResponseDto {
  id!: string;
  workspaceId!: string;
  url!: string;
  events!: string[];
  secret!: string;
  isActive!: boolean;
  name?: string | null;
  description?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: {
    id: string;
    workspaceId: string;
    url: string;
    events: string[];
    secret: string;
    isActive: boolean;
    name?: string | null;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = entity.id;
    dto.workspaceId = entity.workspaceId;
    dto.url = entity.url;
    dto.events = entity.events;
    dto.secret = entity.secret;
    dto.isActive = entity.isActive;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  static fromEntityWithoutSecret(entity: {
    id: string;
    workspaceId: string;
    url: string;
    events: string[];
    isActive: boolean;
    name?: string | null;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Omit<SubscriptionResponseDto, 'secret'> {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      url: entity.url,
      events: entity.events,
      isActive: entity.isActive,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

/**
 * Delivery Log Response DTO
 */
export class DeliveryLogResponseDto {
  id!: string;
  subscriptionId!: string;
  workspaceId!: string;
  eventType!: string;
  payload!: Record<string, unknown>;
  responseStatus?: number | null;
  responseBody?: string | null;
  attemptNumber!: number;
  status!: string;
  nextRetryAt?: Date | null;
  deliveredAt?: Date | null;
  errorMessage?: string | null;
  createdAt!: Date;

  static fromEntity(entity: {
    id: string;
    subscriptionId: string;
    workspaceId: string;
    eventType: string;
    payload: Record<string, unknown>;
    responseStatus?: number | null;
    responseBody?: string | null;
    attemptNumber: number;
    status: string;
    nextRetryAt?: Date | null;
    deliveredAt?: Date | null;
    errorMessage?: string | null;
    createdAt: Date;
  }): DeliveryLogResponseDto {
    const dto = new DeliveryLogResponseDto();
    dto.id = entity.id;
    dto.subscriptionId = entity.subscriptionId;
    dto.workspaceId = entity.workspaceId;
    dto.eventType = entity.eventType;
    dto.payload = entity.payload;
    dto.responseStatus = entity.responseStatus;
    dto.responseBody = entity.responseBody;
    dto.attemptNumber = entity.attemptNumber;
    dto.status = entity.status;
    dto.nextRetryAt = entity.nextRetryAt;
    dto.deliveredAt = entity.deliveredAt;
    dto.errorMessage = entity.errorMessage;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

/**
 * List Query DTO for pagination
 */
export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
}

/**
 * Webhook Event Dispatch DTO
 */
export class WebhookEventDto {
  @IsString()
  eventType!: string;

  @IsString()
  workspaceId!: string;

  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  eventId?: string;

  @IsOptional()
  occurredAt?: Date;
}
