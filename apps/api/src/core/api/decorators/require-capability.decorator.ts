import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for storing required capabilities on route handlers.
 */
export const CAPABILITY_KEY = 'required_capabilities';

/**
 * RequireCapability Decorator
 *
 * Marks a route handler as requiring one or more capabilities.
 * Used in conjunction with CapabilityGuard to enforce access control.
 *
 * @example
 * ```typescript
 * @Get('admin/users')
 * @UseGuards(CapabilityGuard)
 * @RequireCapability('admin_read_users')
 * getUsers() { ... }
 *
 * @Post('admin/users')
 * @UseGuards(CapabilityGuard)
 * @RequireCapability('admin_read_users', 'admin_write_users')
 * createUser() { ... }
 * ```
 *
 * @param capabilities - One or more capability names required for access
 */
export const RequireCapability = (...capabilities: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(CAPABILITY_KEY, capabilities);
