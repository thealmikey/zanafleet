import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Keycloak realm access structure containing realm-level roles
 */
export const KeycloakRealmAccessSchema = z.object({
  roles: z.array(z.string()).default([]),
});

export type KeycloakRealmAccess = z.infer<typeof KeycloakRealmAccessSchema>;

/**
 * Keycloak resource access structure containing client-level roles
 */
export const KeycloakResourceAccessSchema = z.record(
  z.string(),
  z.object({
    roles: z.array(z.string()).default([]),
  })
);

export type KeycloakResourceAccess = z.infer<typeof KeycloakResourceAccessSchema>;

/**
 * Zod validation schema for Keycloak token payload
 * Covers standard OIDC claims and Keycloak-specific claims
 */
export const KeycloakTokenPayloadSchema = z.object({
  // Standard OIDC claims
  sub: z.string().min(1, 'Subject (sub) is required'),
  iss: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
  auth_time: z.number().optional(),
  nonce: z.string().optional(),
  acr: z.string().optional(),
  azp: z.string().optional(),
  session_state: z.string().optional(),
  sid: z.string().optional(),

  // User identity claims
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  preferred_username: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  name: z.string().optional(),
  locale: z.string().optional(),

  // Keycloak-specific claims
  realm_access: KeycloakRealmAccessSchema.optional(),
  resource_access: KeycloakResourceAccessSchema.optional(),
  scope: z.string().optional(),
  typ: z.string().optional(),
});

export type KeycloakTokenPayload = z.infer<typeof KeycloakTokenPayloadSchema>;

/**
 * DTO class for Keycloak realm access with Swagger documentation
 */
export class KeycloakRealmAccessDto {
  @ApiProperty({
    description: 'Array of realm-level roles assigned to the user',
    example: ['offline_access', 'uma_authorization', 'default-roles-zanafleet'],
    type: [String],
  })
  roles!: string[];
}

/**
 * DTO class for Keycloak resource (client) access with Swagger documentation
 */
export class KeycloakResourceAccessDto {
  @ApiProperty({
    description: 'Array of client-level roles assigned to the user',
    example: ['manage-account', 'view-profile'],
    type: [String],
  })
  roles!: string[];
}

/**
 * KeycloakTokenDto
 *
 * Data transfer object representing a decoded Keycloak JWT token payload.
 * Contains standard OIDC claims and Keycloak-specific extensions.
 */
export class KeycloakTokenDto {
  @ApiProperty({
    description: 'Subject - Keycloak user ID (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  sub!: string;

  @ApiPropertyOptional({
    description: 'Issuer - Keycloak realm URL',
    example: 'https://auth.zanafleet.com/realms/zanafleet',
  })
  iss?: string;

  @ApiPropertyOptional({
    description: 'Audience - intended recipient(s) of the token',
    example: 'account',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  aud?: string | string[];

  @ApiPropertyOptional({
    description: 'Expiration time (Unix timestamp)',
    example: 1704067200,
  })
  exp?: number;

  @ApiPropertyOptional({
    description: 'Issued at time (Unix timestamp)',
    example: 1704063600,
  })
  iat?: number;

  @ApiPropertyOptional({
    description: 'Authentication time (Unix timestamp)',
    example: 1704063600,
  })
  auth_time?: number;

  @ApiPropertyOptional({
    description: 'Nonce value for replay attack prevention',
    example: 'abc123xyz',
  })
  nonce?: string;

  @ApiPropertyOptional({
    description: 'Authentication Context Class Reference',
    example: '1',
  })
  acr?: string;

  @ApiPropertyOptional({
    description: 'Authorized party - client ID that initiated authentication',
    example: 'zanafleet-api',
  })
  azp?: string;

  @ApiPropertyOptional({
    description: 'Session state identifier',
    example: 'session-state-uuid',
  })
  session_state?: string;

  @ApiPropertyOptional({
    description: 'Session ID',
    example: 'session-id-uuid',
  })
  sid?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Whether the email has been verified',
    example: true,
  })
  email_verified?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred username in Keycloak',
    example: 'john_doe',
  })
  preferred_username?: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  given_name?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  family_name?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'User locale preference',
    example: 'en',
  })
  locale?: string;

  @ApiPropertyOptional({
    description: 'Realm-level role access',
    type: KeycloakRealmAccessDto,
  })
  realm_access?: KeycloakRealmAccess;

  @ApiPropertyOptional({
    description: 'Client-level role access, keyed by client ID',
    example: { account: { roles: ['manage-account', 'view-profile'] } },
  })
  resource_access?: KeycloakResourceAccess;

  @ApiPropertyOptional({
    description: 'OAuth scopes granted',
    example: 'openid email profile',
  })
  scope?: string;

  @ApiPropertyOptional({
    description: 'Token type',
    example: 'Bearer',
  })
  typ?: string;

  /**
   * Validates token payload using Zod schema
   * @throws ZodError if validation fails
   */
  static validate(input: unknown): KeycloakTokenPayload {
    return KeycloakTokenPayloadSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, KeycloakTokenPayload> {
    return KeycloakTokenPayloadSchema.safeParse(input);
  }

  /**
   * Extracts all roles from realm and resource access
   * @param payload - Keycloak token payload
   * @returns Combined array of all roles
   */
  static extractAllRoles(payload: KeycloakTokenPayload): string[] {
    const roles: string[] = [];

    if (payload.realm_access?.roles) {
      roles.push(...payload.realm_access.roles);
    }

    if (payload.resource_access) {
      for (const clientAccess of Object.values(payload.resource_access)) {
        if (clientAccess.roles) {
          roles.push(...clientAccess.roles);
        }
      }
    }

    return [...new Set(roles)];
  }
}
