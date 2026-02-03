import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodError } from 'zod';

import { FinalizeSignUpCommand } from '../commands/finalize-signup.command';
import { InitiateSignUpCommand } from '../commands/initiate-signup.command';
import { UpdateSignUpStepCommand } from '../commands/update-signup-step.command';
import { FinalizeSignUpDto } from '../dto/finalize-signup.dto';
import { InitiateSignUpDto } from '../dto/initiate-signup.dto';
import { SignUpSessionDto } from '../dto/signup-session.dto';
import { UpdateSignUpStepDto } from '../dto/update-signup-step.dto';
import { SignUpSessionResult, UpdateSignUpStepResult } from '../handlers/signup-result.interfaces';
import { GetSignUpSessionQuery } from '../queries/get-signup-session.query';

@Controller('signup')
export class SignUpController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async initiate(
    @Body() body: InitiateSignUpDto
  ): Promise<{ sessionId: string; expiresAt: string }> {
    try {
      const input = InitiateSignUpCommand.validate(body);
      const command = new InitiateSignUpCommand(input);
      const result = await this.commandBus.execute<
        InitiateSignUpCommand,
        { sessionId: string; expiresAt: Date }
      >(command);

      return {
        sessionId: result.sessionId,
        expiresAt: result.expiresAt.toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  @Patch(':id')
  async updateStep(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateSignUpStepDto
  ): Promise<UpdateSignUpStepResult> {
    try {
      const input = UpdateSignUpStepCommand.validate({
        ...body,
        sessionId: id,
      });
      const command = new UpdateSignUpStepCommand(input);
      const result = await this.commandBus.execute<UpdateSignUpStepCommand, UpdateSignUpStepResult>(
        command
      );

      return result;
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  async finalize(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _body: FinalizeSignUpDto
  ): Promise<{ actorId: string; workspaceId: string }> {
    try {
      const input = FinalizeSignUpCommand.validate({ sessionId: id });
      const command = new FinalizeSignUpCommand(input);
      return await this.commandBus.execute<
        FinalizeSignUpCommand,
        { actorId: string; workspaceId: string }
      >(command);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<SignUpSessionDto> {
    try {
      const input = GetSignUpSessionQuery.validate({ sessionId: id });
      const query = new GetSignUpSessionQuery(input);
      const result = await this.queryBus.execute<GetSignUpSessionQuery, SignUpSessionResult>(query);
      return this.mapResultToDto(result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  private mapResultToDto(result: SignUpSessionResult): SignUpSessionDto {
    const dto: SignUpSessionDto = new SignUpSessionDto();
    dto.sessionId = result.sessionId;
    dto.status = result.status;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    dto.actorType = result.actorType;
    dto.workspaceIds = result.workspaceIds;
    dto.roles = result.roles;
    dto.linkedWallets = result.linkedWallets;
    dto.completedSteps = result.completedSteps;
    dto.expiresAt = result.expiresAt;
    dto.createdAt = result.createdAt;
    dto.updatedAt = result.updatedAt;
    return dto;
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
