import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SignUpSessionEntity } from '../entities/signup-session.entity';
import { GetSignUpSessionQuery } from '../queries/get-signup-session.query';
import { SignUpSessionResult } from './signup-result.interfaces';

/**
 * GetSignUpSessionQueryHandler
 *
 * Handles the GetSignUpSessionQuery by fetching the session from the database.
 * Part of the CQRS pattern - encapsulates read logic.
 */
@QueryHandler(GetSignUpSessionQuery)
@Injectable()
export class GetSignUpSessionQueryHandler
  implements IQueryHandler<GetSignUpSessionQuery>
{
  private readonly logger = new Logger(GetSignUpSessionQueryHandler.name);

  constructor(
    @InjectRepository(SignUpSessionEntity)
    private readonly signupSessionRepository: Repository<SignUpSessionEntity>,
  ) {}

  async execute(query: GetSignUpSessionQuery): Promise<SignUpSessionResult> {
    const { sessionId } = query;

    this.logger.debug(`Executing GetSignUpSessionQuery for session: ${sessionId}`);

    const session = await this.signupSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`SignUp session ${sessionId} not found`);
    }

    return session.toDomain();
  }
}
