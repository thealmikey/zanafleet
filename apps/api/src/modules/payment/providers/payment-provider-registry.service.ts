import { Injectable, Logger } from '@nestjs/common';

import { ProviderCapability } from './dto/payment-provider.types';
import { PaymentProvider } from './payment-provider.interface';

/**
 * PaymentProviderRegistry
 * Registry service for managing payment providers
 * Follows the GeoProviderRegistry pattern with additional capability filtering
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly logger = new Logger(PaymentProviderRegistry.name);
  private readonly providers = new Map<string, PaymentProvider>();
  private defaultProviderId: string | null = null;

  register(provider: PaymentProvider, setAsDefault = false): void {
    if (this.providers.has(provider.providerId)) {
      this.logger.warn(`Replacing existing payment provider: ${provider.providerId}`);
    }
    this.providers.set(provider.providerId, provider);
    this.logger.log(
      `Registered payment provider: ${provider.providerId} (${provider.displayName})`,
    );

    if (setAsDefault || this.defaultProviderId === null) {
      this.defaultProviderId = provider.providerId;
      this.logger.log(`Set default payment provider: ${provider.providerId}`);
    }
  }

  get(providerId: string): PaymentProvider | undefined {
    return this.providers.get(providerId);
  }

  getDefault(): PaymentProvider | undefined {
    if (!this.defaultProviderId) {
      return undefined;
    }
    return this.providers.get(this.defaultProviderId);
  }

  setDefault(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Payment provider not found: ${providerId}`);
    }
    this.defaultProviderId = providerId;
    this.logger.log(`Set default payment provider: ${providerId}`);
  }

  getByCapability(capability: ProviderCapability): PaymentProvider[] {
    return Array.from(this.providers.values()).filter((provider) =>
      provider.capabilities.includes(capability),
    );
  }

  getRegisteredIds(): string[] {
    return Array.from(this.providers.keys());
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  getDefaultId(): string | null {
    return this.defaultProviderId;
  }
}
