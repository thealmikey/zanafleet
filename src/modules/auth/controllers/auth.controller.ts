import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ZodError } from 'zod';

import { LoginCommand } from '../commands/login.command';
import { LoginDto } from '../dto/login.dto';
import { LoginResult } from '../handlers/login.handler';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

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
}
