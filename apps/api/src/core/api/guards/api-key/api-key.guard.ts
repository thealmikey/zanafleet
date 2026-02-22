import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * API Key Guard for external integrations (e.g., WooCommerce)
 * 
 * Validates requests using X-API-Key and X-API-Secret headers
 * against configured values in environment variables.
 * 
 * Usage:
 * ```typescript
 * @Controller('deliveries')
 * @UseGuards(ApiKeyGuard)
 * export class DeliveriesController {
 *   // All endpoints require valid API key
 * }
 * ```
 * 
 * Environment variables:
 * - ZANAFLEET_API_KEY: The API key to validate
 * - ZANAFLEET_API_SECRET: The API secret to validate
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly validApiKey: string | undefined;
  private readonly validApiSecret: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.validApiKey = this.configService.get<string>('ZANAFLEET_API_KEY');
    this.validApiSecret = this.configService.get<string>('ZANAFLEET_API_SECRET');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const apiSecret = request.headers['x-api-secret'];

    // If no API keys configured, allow all requests (development mode)
    if (!this.validApiKey && !this.validApiSecret) {
      this.logger.warn(
        'ApiKeyGuard: No API keys configured - allowing all requests (development mode)'
      );
      // Set a mock user for downstream guards
      request.user = {
        actorId: 'api-key-auth',
        type: 'external',
      };
      return true;
    }

    // Check API key
    if (!apiKey) {
      this.logger.warn('ApiKeyGuard: Missing X-API-Key header');
      throw new UnauthorizedException('X-API-Key header is required');
    }

    if (apiKey !== this.validApiKey) {
      this.logger.warn(`ApiKeyGuard: Invalid API key provided`);
      throw new UnauthorizedException('Invalid API key');
    }

    // Check API secret if configured
    if (this.validApiSecret && apiSecret !== this.validApiSecret) {
      this.logger.warn(`ApiKeyGuard: Invalid API secret provided`);
      throw new UnauthorizedException('Invalid API secret');
    }

    // Set user for downstream guards
    request.user = {
      actorId: 'api-key-auth',
      type: 'external',
      apiKey: apiKey,
    };

    this.logger.debug('ApiKeyGuard: API key authentication successful');
    return true;
  }
}
