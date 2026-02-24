import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ZodError } from 'zod';

import { LoginCommand } from '../commands/login.command';
import { LoginDto, LoginResponseDto } from '../dto/login.dto';
import { LoginResult } from '../handlers/login.handler';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60000 } }) // 10 requests per minute for login
  async login(@Body() body: LoginDto, @Res() res: Response): Promise<LoginResponseDto> {
    try {
      const input = LoginCommand.validate(body);
      const command = new LoginCommand(input);

      const result = await this.commandBus.execute<LoginCommand, LoginResult>(command);

      // Add deprecation headers to the response
      res.set('Deprecation', 'true');
      res.set('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
      res.set('Link', '<https://docs.zanafleet.com/auth-migration>; rel="deprecation"');

      const response: LoginResponseDto = {
        actorId: result.actorId,
        workspaceId: result.workspaceId,
        type: result.type,
        token: result.token,
        expiresAt: result.expiresAt,
      };

      return response;
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  private createValidationException(error: ZodError): BadRequestException {
    return new BadRequestException({
      message: 'Validation failed',
      issues: error.issues.map(({ path, message, code }) => ({
        path,
        message,
        code,
      })),
    });
  }
}
