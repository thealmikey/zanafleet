import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import {
  NotificationDispatchCoordinator,
  DispatchResult,
  BatchDispatchResult,
  DeliveryStatus,
} from '../coordinators/notification-dispatch.coordinator';
import { NotificationChannel, RecipientType } from '../dto/notification.enums';

export class DispatchNotificationDto {
  recipientId!: string;
  recipientType!: RecipientType;
  templateName!: string;
  variables!: Record<string, string>;
  channels!: NotificationChannel[];
  fallbackChannels?: NotificationChannel[];
  workspaceId!: string;
  locale?: string;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
  recipientContact?: {
    email?: string;
    phone?: string;
    deviceToken?: string;
    whatsappId?: string;
  };
}

export class BatchDispatchDto {
  notifications!: DispatchNotificationDto[];
}

@Controller('notifications')
@UseGuards(CapabilityGuard)
@RequireCapability('notification.send')
export class NotificationsController {
  constructor(private readonly coordinator: NotificationDispatchCoordinator) {}

  @Post('dispatch')
  @HttpCode(HttpStatus.OK)
  async dispatch(@Body() dto: DispatchNotificationDto): Promise<DispatchResult> {
    return this.coordinator.dispatch(dto);
  }

  @Post('dispatch/batch')
  @HttpCode(HttpStatus.OK)
  async dispatchBatch(@Body() dto: BatchDispatchDto): Promise<BatchDispatchResult> {
    return this.coordinator.dispatchBatch(dto.notifications);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string): Promise<{ status: DeliveryStatus | null }> {
    const status = await this.coordinator.getDeliveryStatus(id);
    return { status };
  }
}
