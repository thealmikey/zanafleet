/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateSaccoCommand } from '../commands/create-sacco.command';
import { CreateSaccoDto } from '../dto/create-sacco.dto';
import { SaccoResponseDto } from '../dto/sacco-response.dto';

/**
 * SaccoController
 * REST API endpoints for Sacco operations
 */
@ApiTags('Saccos')
@Controller('saccos')
export class SaccoController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Sacco' })
  @ApiResponse({ status: 201, description: 'Sacco created successfully', type: SaccoResponseDto })
  @ApiResponse({ status: 409, description: 'Sacco with this name already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateSaccoDto): Promise<Record<string, string>> {
    const input = CreateSaccoCommand.validate(dto);
    const saccoId = await this.commandBus.execute(new CreateSaccoCommand(input));
    return { id: saccoId };
  }
}
