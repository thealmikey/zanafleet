import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  NotFoundException,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZodError } from 'zod';

import { FinalizeSignUpCommand } from '../commands/finalize-signup.command';
import { InitiateSignUpCommand } from '../commands/initiate-signup.command';
import { UpdateSignUpStepCommand } from '../commands/update-signup-step.command';
import { FinalizeSignUpDto } from '../dto/finalize-signup.dto';
import { InitiateSignUpDto } from '../dto/initiate-signup.dto';
import { SignUpSessionDto } from '../dto/signup-session.dto';
import { UpdateSignUpStepDto } from '../dto/update-signup-step.dto';
import { SignUpSessionEntity } from '../entities/signup-session.entity';

@Controller('signup')
export class SignUpController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(SignUpSessionEntity)
    private readonly signupRepository: Repository<SignUpSessionEntity>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async initiate(
    @Body() body: InitiateSignUpDto,
  ): Promise<{ sessionId: string; expiresAt: string }> {
    try {
      const input = InitiateSignUpCommand.validate(body);
      const command = new InitiateSignUpCommand(input);
      const sessionId = await this.commandBus.execute<
        InitiateSignUpCommand,
        string
      >(command);

      const session = await this.signupRepository.findOne({
        where: { id: sessionId },
      });

      return {
        sessionId,
        expiresAt: session?.expiresAt.toISOString() ?? '',
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
    @Body() body: UpdateSignUpStepDto,
  ): Promise<{ sessionId: string; status: string; completedSteps: string[] }> {
    try {
      const input = UpdateSignUpStepCommand.validate({
        ...body,
        sessionId: id,
      });
      const command = new UpdateSignUpStepCommand(input);
      await this.commandBus.execute(command);

      const session = await this.signupRepository.findOne({
        where: { id },
      });

      if (!session) {
        throw new NotFoundException(`SignUp session ${id} not found`);
      }

      return {
        sessionId: session.id,
        status: session.status,
        completedSteps: session.completedSteps,
      };
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
    @Body() _body: FinalizeSignUpDto,
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
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SignUpSessionDto> {
    const session = await this.signupRepository.findOne({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`SignUp session ${id} not found`);
    }

    return this.mapToDto(session);
  }

  private mapToDto(entity: SignUpSessionEntity): SignUpSessionDto {
    const domain = entity.toDomain();
    const dto = new SignUpSessionDto();
    dto.sessionId = domain.sessionId;
    dto.status = domain.status;
    dto.actorType = domain.actorType;
    dto.workspaceId = domain.workspaceId;
    dto.roles = domain.roles;
    dto.linkedWallets = domain.linkedWallets;
    dto.completedSteps = domain.completedSteps;
    dto.expiresAt = domain.expiresAt;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
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
