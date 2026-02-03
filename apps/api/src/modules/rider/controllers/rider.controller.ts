/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateRiderCommand } from '../commands/create-rider.command';
import { CreateRiderDto } from '../dto/create-rider.dto';
import { RiderResponseDto } from '../dto/rider-response.dto';

/**
 * RiderController
 * REST API endpoints for Rider operations
 */
@ApiTags('Riders')
@Controller('riders')
export class RiderController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Rider' })
  @ApiResponse({ status: 201, description: 'Rider created successfully', type: RiderResponseDto })
  @ApiResponse({ status: 409, description: 'Rider with this phone or national ID already exists' })
  @ApiResponse({ status: 404, description: 'Sacco not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateRiderDto): Promise<Record<string, string>> {
    const input = CreateRiderCommand.validate(dto);
    const riderId = await this.commandBus.execute(new CreateRiderCommand(input));
    return { id: riderId };
  }
}
