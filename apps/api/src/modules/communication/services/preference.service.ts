import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationPreferenceEntity } from '../entities/preference.entity';
import { NotificationChannel, RecipientType } from '../dto/notification.enums';

/**
 * PreferenceService
 *
 * Manages notification preferences per recipient, channel, and workspace.
 * Implements opt-out model: defaults to enabled if no preference record exists.
 *
 * Supports:
 * - Workspace-scoped preferences with fallback to global preferences
 * - Checking if notifications are enabled for a recipient/channel/workspace
 * - Setting and retrieving preferences with audit trail
 */
@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  constructor(
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferenceRepository: Repository<NotificationPreferenceEntity>,
  ) {}

  /**
   * Check if a notification is enabled for a recipient.
   *
   * Lookup order:
   * 1. Workspace-specific preference (if workspaceId provided)
   * 2. Global preference (workspaceId IS NULL)
   * 3. Default to true if no preference record exists (opt-out model)
   *
   * @param recipientId ID of the recipient
   * @param recipientType Type of the recipient (ACTOR, RIDER, BUSINESS)
   * @param channel Notification channel (email, sms, push)
   * @param workspaceId Optional workspace ID for scoped preferences
   * @returns True if notifications are enabled (default), false if explicitly disabled
   */
  async isEnabled(
    recipientId: string,
    recipientType: RecipientType,
    channel: NotificationChannel,
    workspaceId?: string,
  ): Promise<boolean> {
    const baseQuery = this.preferenceRepository
      .createQueryBuilder('pref')
      .where('pref.recipientId = :recipientId', { recipientId })
      .andWhere('pref.recipientType = :recipientType', { recipientType })
      .andWhere('pref.channel = :channel', { channel });

    // Try workspace-specific preference first
    if (workspaceId) {
      const workspacePreference = await baseQuery
        .andWhere('pref.workspaceId = :workspaceId', { workspaceId })
        .getOne();

      if (workspacePreference !== null && workspacePreference !== undefined) {
        this.logger.debug(
          `Found workspace preference for ${recipientId}/${recipientType}/${channel}/${workspaceId}: ${workspacePreference.enabled}`,
        );
        return workspacePreference.enabled;
      }
    }

    // Fall back to global preference (workspaceId IS NULL)
    const globalPreference = await baseQuery
      .andWhere('pref.workspaceId IS NULL')
      .getOne();

    if (globalPreference !== null && globalPreference !== undefined) {
      this.logger.debug(
        `Found global preference for ${recipientId}/${recipientType}/${channel}: ${globalPreference.enabled}`,
      );
      return globalPreference.enabled;
    }

    // Default to enabled (opt-out model)
    this.logger.debug(
      `No preference found for ${recipientId}/${recipientType}/${channel}, defaulting to enabled`,
    );
    return true;
  }

  /**
   * Set a notification preference.
   *
   * Creates or updates a preference record. Emits PreferenceUpdatedEventV1 for audit trail.
   *
   * @param recipientId ID of the recipient
   * @param recipientType Type of the recipient
   * @param channel Notification channel
   * @param enabled Whether notifications are enabled for this channel
   * @param options Optional workspaceId and updatedBy (actorId)
   * @returns Void
   */
  async setPreference(
    recipientId: string,
    recipientType: RecipientType,
    channel: NotificationChannel,
    enabled: boolean,
    options?: {
      workspaceId?: string;
      updatedBy?: string;
    },
  ): Promise<void> {
    const workspaceId = options?.workspaceId ?? null;
    const updatedBy = options?.updatedBy ?? null;

    // Use upsert to create or update the preference
    await this.preferenceRepository.upsert(
      {
        recipientId,
        recipientType,
        channel,
        workspaceId,
        enabled,
        updatedBy,
      },
      {
        conflictPaths: ['recipientId', 'recipientType', 'channel', 'workspaceId'],
        skipUpdateIfNoValuesChanged: false,
      },
    );

    this.logger.debug(
      `Set preference for ${recipientId}/${recipientType}/${channel} to ${enabled}` +
        (workspaceId ? ` for workspace ${workspaceId}` : ' (global)') +
        (updatedBy ? ` by ${updatedBy}` : ''),
    );
  }

  /**
   * Get all preferences for a recipient.
   *
   * @param recipientId ID of the recipient
   * @param recipientType Type of the recipient
   * @returns Array of all preferences for the recipient across all channels and workspaces
   */
  async getPreferences(
    recipientId: string,
    recipientType: RecipientType,
  ): Promise<NotificationPreferenceEntity[]> {
    const preferences = await this.preferenceRepository
      .createQueryBuilder('pref')
      .where('pref.recipientId = :recipientId', { recipientId })
      .andWhere('pref.recipientType = :recipientType', { recipientType })
      .orderBy('pref.channel', 'ASC')
      .addOrderBy('pref.workspaceId', 'ASC')
      .getMany();

    this.logger.debug(
      `Retrieved ${preferences.length} preferences for ${recipientId}/${recipientType}`,
    );
    return preferences;
  }
}
