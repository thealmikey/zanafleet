import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  CreateSubscriptionDto,
  DeliveryLogResponseDto,
  ListQueryDto,
  SubscriptionResponseDto,
} from '../dto/webhook.dto';
import { WebhookService } from '../services/webhook.service';

/**
 * WebhookController
 *
 * REST API controller for managing webhook subscriptions and viewing delivery logs.
 * All endpoints require workspace context via X-Workspace-Id header.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Extract workspace ID from header
   */
  private getWorkspaceId(workspaceIdHeader: string | undefined): string {
    if (!workspaceIdHeader) {
      throw new UnauthorizedException('X-Workspace-Id header is required');
    }
    return workspaceIdHeader;
  }

  /**
   * POST /webhooks/subscriptions
   * Create a new webhook subscription
   */
  @Post('subscriptions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new webhook subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing workspace ID' })
  async createSubscription(
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Body() dto: CreateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    const workspaceId = this.getWorkspaceId(workspaceIdHeader);
    return this.webhookService.subscribe(workspaceId, dto);
  }

  /**
   * GET /webhooks/subscriptions
   * List all webhook subscriptions for a workspace
   */
  @Get('subscriptions')
  @ApiOperation({ summary: 'List webhook subscriptions' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing workspace ID' })
  async listSubscriptions(
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Query() query: ListQueryDto
  ): Promise<{
    data: Omit<SubscriptionResponseDto, 'secret'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const workspaceId = this.getWorkspaceId(workspaceIdHeader);
    return this.webhookService.listByWorkspace(workspaceId, query);
  }

  /**
   * GET /webhooks/subscriptions/:id
   * Get a single subscription by ID
   */
  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Get a webhook subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing workspace ID' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscription(
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id', ParseUUIDPipe) subscriptionId: string
  ): Promise<Omit<SubscriptionResponseDto, 'secret'>> {
    const workspaceId = this.getWorkspaceId(workspaceIdHeader);
    return this.webhookService.getSubscription(workspaceId, subscriptionId);
  }

  /**
   * DELETE /webhooks/subscriptions/:id
   * Delete a webhook subscription
   */
  @Delete('subscriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiResponse({ status: 204, description: 'Subscription deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing workspace ID' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async deleteSubscription(
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id', ParseUUIDPipe) subscriptionId: string
  ): Promise<void> {
    const workspaceId = this.getWorkspaceId(workspaceIdHeader);
    await this.webhookService.unsubscribe(workspaceId, subscriptionId);
  }

  /**
   * GET /webhooks/deliveries
   * List delivery logs for a workspace
   */
  @Get('deliveries')
  @ApiOperation({ summary: 'List webhook delivery logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'subscriptionId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of delivery logs' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing workspace ID' })
  async listDeliveries(
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Query() query: ListQueryDto
  ): Promise<{ data: DeliveryLogResponseDto[]; total: number; page: number; limit: number }> {
    const workspaceId = this.getWorkspaceId(workspaceIdHeader);
    return this.webhookService.listDeliveries(workspaceId, query);
  }

  /**
   * GET /webhooks/deliveries/:id
   * Get a single delivery log by ID
   */
  @Get('deliveries/:id')
  @ApiOperation({ summary: 'Get a webhook delivery log' })
  @ApiParam({ name: 'id', description: 'Delivery log ID', type: String })
  @ApiResponse({ status: 200, description: 'Delivery log details' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing workspace ID' })
  @ApiResponse({ status: 404, description: 'Delivery log not found' })
  async getDelivery(
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id', ParseUUIDPipe) deliveryId: string
  ): Promise<DeliveryLogResponseDto> {
    const workspaceId = this.getWorkspaceId(workspaceIdHeader);
    return this.webhookService.getDelivery(workspaceId, deliveryId);
  }

  /**
   * POST /webhooks/deliveries/:id/retry
   * Retry a failed delivery
   */
  @Post('deliveries/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiParam({ name: 'id', description: 'Delivery log ID', type: String })
  @ApiResponse({ status: 202, description: 'Retry initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing workspace ID' })
  @ApiResponse({ status: 404, description: 'Delivery log not found' })
  async retryDelivery(
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id', ParseUUIDPipe) deliveryId: string
  ): Promise<{ message: string }> {
    const workspaceId = this.getWorkspaceId(workspaceIdHeader);
    await this.webhookService.retryDelivery(workspaceId, deliveryId);
    return { message: 'Retry initiated' };
  }
}
