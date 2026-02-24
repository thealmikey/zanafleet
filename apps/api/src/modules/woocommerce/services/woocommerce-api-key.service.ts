import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { WooCommerceApiKeyEntity } from '../entities/woocommerce-api-key.entity';

/**
 * DTO for API key creation
 */
export class CreateApiKeyDto {
  actorId!: string;
  storeId!: string;
  name!: string;
  expiresInDays?: number;
}

/**
 * DTO for API key validation result
 */
export class ValidateApiKeyResult {
  valid!: boolean;
  apiKey?: WooCommerceApiKeyEntity;
  actorId?: string;
  storeId?: string;
  error?: string;
}

/**
 * WooCommerce API Key Service
 *
 * Manages API keys for WooCommerce integration with Keycloak-backed authentication.
 *
 * Features:
 * - Cryptographically secure key generation
 * - Key hash storage (never store raw keys)
 * - Actor/Keycloak user association
 * - Key expiration support
 * - Usage tracking
 */
@Injectable()
export class WooCommerceApiKeyService {
  private readonly logger = new Logger(WooCommerceApiKeyService.name);
  private readonly KEY_PREFIX = 'wf_live';

  constructor(
    @InjectRepository(WooCommerceApiKeyEntity)
    private readonly apiKeyRepository: Repository<WooCommerceApiKeyEntity>
  ) {}

  /**
   * Generate a new API key pair
   *
   * @param dto - Key creation parameters
   * @returns Object containing the raw key (only shown once) and key metadata
   */
  async createKey(dto: CreateApiKeyDto): Promise<{
    key: string;
    secret: string;
    keyId: string;
    expiresAt: Date | null;
  }> {
    // Generate cryptographically secure random key
    const rawKey = `${this.KEY_PREFIX}_${randomBytes(24).toString('hex')}`;
    const rawSecret = randomBytes(32).toString('hex') + randomBytes(32).toString('hex');

    // Hash the key for storage (SHA-256)
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    // Calculate expiration if specified
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create the entity
    const apiKey = this.apiKeyRepository.create({
      id: uuidv4(),
      actorId: dto.actorId,
      storeId: dto.storeId,
      keyHash,
      keyPrefix: this.KEY_PREFIX,
      apiSecret: rawSecret,
      name: dto.name,
      isActive: true,
      expiresAt,
    });

    await this.apiKeyRepository.save(apiKey);

    this.logger.log(`Created API key ${apiKey.id} for actor ${dto.actorId}`);

    return {
      key: rawKey,
      secret: rawSecret,
      keyId: apiKey.id,
      expiresAt,
    };
  }

  /**
   * Validate an API key
   *
   * @param rawKey - The raw API key to validate
   * @returns Validation result with key metadata if valid
   */
  async validateKey(rawKey: string): Promise<ValidateApiKeyResult> {
    // Hash the provided key
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    // Look up the key
    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash },
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check if active
    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is revoked' };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used timestamp
    await this.apiKeyRepository.update(apiKey.id, {
      lastUsedAt: new Date(),
    });

    return {
      valid: true,
      apiKey,
      actorId: apiKey.actorId || undefined,
      storeId: apiKey.storeId,
    };
  }

  /**
   * List all API keys for a store
   *
   * @param storeId - The store ID
   * @returns List of API keys (without secrets)
   */
  async listKeysForStore(storeId: string): Promise<
    {
      id: string;
      name: string;
      isActive: boolean;
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      createdAt: Date;
    }[]
  > {
    const keys = await this.apiKeyRepository.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  /**
   * List all API keys for an actor (Keycloak user)
   *
   * @param actorId - The actor ID
   * @returns List of API keys
   */
  async listKeysForActor(actorId: string): Promise<
    {
      id: string;
      storeId: string;
      name: string;
      isActive: boolean;
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      createdAt: Date;
    }[]
  > {
    const keys = await this.apiKeyRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
    });

    return keys.map((key) => ({
      id: key.id,
      storeId: key.storeId,
      name: key.name,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  /**
   * Revoke an API key
   *
   * @param keyId - The key ID to revoke
   * @returns True if revoked successfully
   */
  async revokeKey(keyId: string): Promise<boolean> {
    const result = await this.apiKeyRepository.update(keyId, {
      isActive: false,
    });

    const success = result.affected != null && result.affected > 0;
    if (success) {
      this.logger.log(`Revoked API key ${keyId}`);
    }

    return success;
  }

  /**
   * Delete an API key permanently
   *
   * @param keyId - The key ID to delete
   * @returns True if deleted successfully
   */
  async deleteKey(keyId: string): Promise<boolean> {
    const result = await this.apiKeyRepository.delete(keyId);

    const success = result.affected != null && result.affected > 0;
    if (success) {
      this.logger.log(`Deleted API key ${keyId}`);
    }

    return success;
  }

  /**
   * Get key by ID
   *
   * @param keyId - The key ID
   * @returns The API key entity
   */
  async getKeyById(keyId: string): Promise<WooCommerceApiKeyEntity | null> {
    return this.apiKeyRepository.findOne({
      where: { id: keyId },
    });
  }
}
