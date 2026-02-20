/**
 * SDUI Controller
 *
 * REST endpoints for Server-Driven UI operations.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';

import {
  SDUIRequest,
  SDUIActionRequest,
  SDUIActionResponse,
  UISchema,
} from './interfaces';
import { SDUIService } from './services/sdui.service';

/**
 * SDUI Controller
 *
 * Provides REST API endpoints for server-driven UI.
 */
@Controller('sdui')
export class SDUIController {
  private readonly sduiService: SDUIService;

  constructor(sduiService: SDUIService) {
    this.sduiService = sduiService;
  }

  /**
   * Get available screens
   *
   * @returns List of available screen IDs
   */
  @Get('screens')
  async getScreens(): Promise<{ screens: string[] }> {
    const screens = this.sduiService.getAvailableScreens();
    return { screens };
  }

  /**
   * Get a screen schema
   *
   * @param screenId - Screen identifier
   * @param actorId - Actor ID for personalized content
   * @param preview - Preview mode flag
   * @returns UI schema for the screen
   */
  @Get('screens/:screenId')
  async getScreen(
    @Param('screenId') screenId: string,
    @Query('actorId') actorId?: string,
    @Query('preview') preview?: boolean
  ): Promise<UISchema> {
    if (!screenId) {
      throw new BadRequestException('screenId is required');
    }

    const request: SDUIRequest = {
      screenId,
      actorId,
      preview: preview === true,
    };

    return this.sduiService.getScreen(request);
  }

  /**
   * Execute an action on a screen
   *
   * @param screenId - Screen identifier
   * @param actionId - Action identifier
   * @param body - Action execution data
   * @returns Action response
   */
  @Post('screens/:screenId/actions/:actionId')
  @HttpCode(HttpStatus.OK)
  async executeAction(
    @Param('screenId') screenId: string,
    @Param('actionId') actionId: string,
    @Body() body: { actorId: string; payload?: Record<string, unknown>; context?: Record<string, unknown> }
  ): Promise<SDUIActionResponse> {
    if (!screenId || !actionId) {
      throw new BadRequestException('screenId and actionId are required');
    }

    if (!body?.actorId) {
      throw new BadRequestException('actorId is required in body');
    }

    const request: SDUIActionRequest = {
      screenId,
      actionId,
      actorId: body.actorId,
      payload: body.payload,
      context: body.context,
    };

    return this.sduiService.executeAction(request);
  }

  /**
   * Get navigation for an actor
   *
   * @param actorId - Actor identifier
   * @returns Navigation configuration
   */
  @Get('navigation')
  async getNavigation(
    @Query('actorId') actorId: string
  ): Promise<{ navigation: unknown }> {
    if (!actorId) {
      throw new BadRequestException('actorId is required');
    }

    const navigation = await this.sduiService.getNavigation(actorId);
    return { navigation };
  }

  /**
   * Health check endpoint
   *
   * @returns Health status
   */
  @Get('health')
  async health(): Promise<{ status: string; screens: number }> {
    const screens = this.sduiService.getAvailableScreens();
    return {
      status: 'healthy',
      screens: screens.length,
    };
  }
}
