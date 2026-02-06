import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as isUuid } from 'uuid';

import { verifyPassword } from '../../../core/utils/password.util';
import { ActorType } from '../../actor/dto/actor.enums';
import { ActorEntity } from '../../actor/entities/actor.entity';
import { LoginCommand } from '../commands/login.command';

export interface LoginResult {
  actorId: string;
  workspaceId: string;
  type: ActorType;
  token: string;
  expiresAt: Date;
}

/**
 * LoginCommandHandler
 *
 * Handles LoginCommand by looking up an Actor by ID or wallet address,
 * optionally verifying password, and generating a JWT token.
 */
@CommandHandler(LoginCommand)
@Injectable()
export class LoginCommandHandler implements ICommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginCommandHandler.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Executes the login process
   *
   * @param command LoginCommand
   * @returns Actor info with JWT token on success
   * @throws UnauthorizedException if actor not found or credentials invalid
   */
  async execute(command: LoginCommand): Promise<LoginResult> {
    const { identifier, password } = command;

    this.logger.log(`Attempting login for identifier: ${identifier}`);

    let actor: ActorEntity | null = null;

    // 1. Try to find by ID if identifier is a UUID
    if (isUuid(identifier)) {
      actor = await this.actorRepository.findOne({
        where: { id: identifier },
      });
    }

    // 2. Try to find by linkedWallets if not found by ID
    if (!actor) {
      actor = await this.actorRepository
        .createQueryBuilder('actor')
        .where(':identifier = ANY(actor.linkedWallets)', { identifier })
        .getOne();
    }

    if (!actor) {
      this.logger.warn(`Login failed: Actor not found for identifier ${identifier}`);
      throw new UnauthorizedException('Invalid identifier');
    }

    // 3. Verify password if provided and actor has a passwordHash
    if (password && actor.passwordHash) {
      const isPasswordValid = await verifyPassword(password, actor.passwordHash);
      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password for actor ${actor.id}`);
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // 4. Generate JWT token
    const payload = {
      sub: actor.id,
      email: actor.email,
      workspaceId: actor.workspaceId,
      roles: actor.roles || [],
    };

    const token = this.jwtService.sign(payload);

    // 5. Calculate expiration time
    const expiresIn = this.configService.get<string>('auth.jwt.expiresIn') || '1h';
    const expiresAt = new Date(Date.now() + this.parseExpirationTime(expiresIn));

    this.logger.log(`Login successful for actor: ${actor.id}`);

    const domain = actor.toDomain();
    return {
      actorId: domain.actorId,
      workspaceId: domain.workspaceId,
      type: domain.type,
      token,
      expiresAt,
    };
  }

  /**
   * Parses expiration time string to milliseconds
   * @param expiresIn - Expiration string (e.g., '1h', '30m', '7d')
   * @returns Expiration time in milliseconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600 * 1000; // default 1 hour
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
