import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ZodError } from 'zod';

import { LoginCommand } from '../commands/login.command';
import { KeycloakTokenDto } from '../dto/keycloak-token.dto';
import { LoginDto } from '../dto/login.dto';
import { LoginResult } from '../handlers/login.handler';
import {
  KeycloakTokenPayload,
  KeycloakUserSyncService,
} from '../services/keycloak-user-sync.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly keycloakUserSyncService: KeycloakUserSyncService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto): Promise<LoginResult> {
    try {
      const input = LoginCommand.validate(body);
      const command = new LoginCommand(input);

      return await this.commandBus.execute<LoginCommand, LoginResult>(command);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          issues: error.issues.map(({ path, message, code }) => ({
            path,
            message,
            code,
          })),
        });
      }
      throw error;
    }
  }

  @Post('keycloak/token')
  @HttpCode(HttpStatus.OK)
  async exchangeKeycloakToken(@Body() body: KeycloakTokenDto): Promise<{
    user: { id: string; email: string; name: string; roles: string[] };
    token: string;
    expiresAt: Date;
  }> {
    try {
      const tokenParts = body.accessToken.split('.');
      if (tokenParts.length !== 3) {
        throw new UnauthorizedException('Invalid token format');
      }

      const payloadBase64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');

      let payload: KeycloakTokenPayload;
      try {
        payload = JSON.parse(payloadJson) as KeycloakTokenPayload;
      } catch {
        throw new UnauthorizedException('Invalid token payload');
      }

      if (!payload.email) {
        throw new UnauthorizedException('Token missing email claim');
      }

      if (!payload.iss || !payload.iss.includes('/realms/')) {
        throw new UnauthorizedException('Invalid token issuer');
      }

      const { actor } = await this.keycloakUserSyncService.syncUser(payload);

      const jwtPayload = {
        sub: actor.id,
        email: actor.email,
        workspaceId: actor.workspaceId,
        roles: actor.roles || [],
      };

      const token = this.jwtService.sign(jwtPayload);

      const expiresIn = this.configService.get<string>('auth.jwt.expiresIn') || '1h';
      const expiresAt = new Date(Date.now() + this.parseExpirationTime(expiresIn));

      return {
        user: {
          id: actor.id,
          email: actor.email,
          name: actor.username || actor.email.split('@')[0],
          roles: actor.roles || [],
        },
        token,
        expiresAt,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException('Token exchange failed');
    }
  }

  /**
   * Parses expiration time string to milliseconds
   * @param expiresIn - Expiration string (e.g., '1h', '30m', '7d')
   * @returns Expiration time in milliseconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 3600 * 1000,
      d: 86400 * 1000,
    };
    return value * (multipliers[unit] || 3600 * 1000);
  }
}
