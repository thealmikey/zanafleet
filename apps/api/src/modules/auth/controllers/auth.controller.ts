import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ZodError } from 'zod';

import { LoginCommand } from '../commands/login.command';
import { LoginDto, LoginResponseDto } from '../dto/login.dto';
import { LoginResult } from '../handlers/login.handler';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    try {
      const input = LoginCommand.validate(body);
      const command = new LoginCommand(input);

      const result = await this.commandBus.execute<LoginCommand, LoginResult>(command);

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
