import { Injectable, Logger } from '@nestjs/common';

import { GeoProvider } from './geo-provider.interface';

/**
 * Registry service for managing multiple GeoProvider implementations.
 * Allows runtime registration and selection of geo providers.
 */
@Injectable()
export class GeoProviderRegistry {
  private readonly logger = new Logger(GeoProviderRegistry.name);
  private readonly providers = new Map<string, GeoProvider>();
  private defaultProviderId: string | null = null;

  /**
   * Register a geo provider with the registry.
   * @param provider - The provider to register
   * @param setAsDefault - Whether to set this provider as the default
   */
  register(provider: GeoProvider, setAsDefault = false): void {
    if (this.providers.has(provider.providerId)) {
      this.logger.warn(`Provider '${provider.providerId}' is already registered, replacing`);
    }
    this.providers.set(provider.providerId, provider);
    this.logger.log(`Registered geo provider: ${provider.providerId}`);

    if (setAsDefault || this.defaultProviderId === null) {
      this.defaultProviderId = provider.providerId;
      this.logger.log(`Set default geo provider: ${provider.providerId}`);
    }
  }

  /**
   * Get a provider by its ID.
   * @param providerId - The provider ID
   * @returns The provider, or undefined if not found
   */
  get(providerId: string): GeoProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get the default provider.
   * @returns The default provider, or undefined if none registered
   */
  getDefault(): GeoProvider | undefined {
    if (this.defaultProviderId === null) {
      return undefined;
    }
    return this.providers.get(this.defaultProviderId);
  }

  /**
   * Set the default provider by ID.
   * @param providerId - The provider ID to set as default
   * @throws Error if the provider is not registered
   */
  setDefault(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Cannot set default: provider '${providerId}' is not registered`);
    }
    this.defaultProviderId = providerId;
    this.logger.log(`Set default geo provider: ${providerId}`);
  }

  /**
   * Get all registered provider IDs.
   */
  getRegisteredIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered.
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get the current default provider ID.
   */
  getDefaultId(): string | null {
    return this.defaultProviderId;
  }
}
