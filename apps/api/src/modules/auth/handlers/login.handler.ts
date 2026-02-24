import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { ActorEntity } from '@api/modules/actor/entities/actor.entity';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { verifyPassword } from '@zanafleet/utils';
import { Repository } from 'typeorm';
import { validate as isUuid } from 'uuid';

import { LoginCommand } from '../commands/login.command';

/** Result of a successful login operation */
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
@CommandHandler(LoginCommand)
@Injectable()
export class LoginCommandHandler implements ICommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginCommandHandler.name);

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    const identifier: string = command.identifier;
    const password: string | undefined = command.password;

    this.logger.log(`Attempting login for identifier: ${identifier}`);

    let actor: ActorEntity | null = null;

    // 1. Try to find by ID if identifier is a UUID
    if (isUuid(identifier)) {
      const foundById: ActorEntity | null = await this.actorRepository.findOne({
        where: { id: identifier },
      });
      actor = foundById;
    }

    // 2. Try to find by linkedWallets if not found by ID
    if (!actor) {
      const foundByWallet: ActorEntity | null = await this.actorRepository
        .createQueryBuilder('actor')
        .where(':identifier = ANY(actor.linkedWallets)', { identifier })
        .getOne();
      actor = foundByWallet;
    }

    if (!actor) {
      this.logger.warn(`Login failed: Actor not found for identifier ${identifier}`);
      throw new UnauthorizedException('Invalid identifier');
    }

    // 3. Verify password if provided and actor has a passwordHash
    const actorPasswordHash: string | null | undefined = actor.passwordHash;
    if (password && actorPasswordHash) {
      const isPasswordValid = await verifyPassword(password, actorPasswordHash);
      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password for actor ${actor.id}`);
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // 4. Generate JWT token
    const actorId: string = actor.id;
    const actorEmail: string = actor.email;
    const actorWorkspaceId: string = actor.workspaceId ?? '';
    const actorRoles: string[] = actor.roles || [];
    const payload = {
      sub: actorId,
      email: actorEmail,
      workspaceId: actorWorkspaceId,
      roles: actorRoles,
    };

    const token = this.jwtService.sign(payload);

    // 5. Calculate expiration time
    const expiresIn = this.configService.get<string>('auth.jwt.expiresIn') || '1h';
    const expiresAt = new Date(Date.now() + this.parseExpirationTime(expiresIn));

    this.logger.log(`Login successful for actor: ${actorId}`);

    const domain = actor.toDomain();
    const resultActorId: string = domain.actorId;
    const resultWorkspaceId: string = domain.workspaceId ?? '';
    const resultType: ActorType = domain.type;

    return {
      actorId: resultActorId,
      workspaceId: resultWorkspaceId,
      type: resultType,
      token,
      expiresAt,
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
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
