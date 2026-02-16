/**
 * Sandbox Auth Guard
 *
 * A permissive guard that always allows requests in sandbox mode.
 * Used as a replacement for JwtAuthGuard when running without Keycloak.
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Sandbox Auth Guard
 *
 * Bypasses all authentication in sandbox mode.
 * This allows all requests to pass through without JWT validation.
 */
@Injectable()
export class SandboxAuthGuard implements CanActivate {
  /**
   * Always returns true to allow all requests in sandbox mode
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Log the request for debugging
    console.log(`[SANDBOX] Allowing request: ${request.method} ${request.url}`);
    return true;
  }
}
