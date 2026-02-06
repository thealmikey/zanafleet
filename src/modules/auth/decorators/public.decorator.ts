import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for identifying public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public decorator
 * Marks routes as publicly accessible, bypassing authentication
 *
 * Usage:
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
