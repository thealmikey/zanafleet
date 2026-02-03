/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateBusinessCommand } from '../commands/create-business.command';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { BusinessResponseDto } from '../dto/business-response.dto';

/**
 * BusinessController
 * REST API endpoints for Business operations
 */
@ApiTags('Businesses')
@Controller('businesses')
export class BusinessController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Business' })
  @ApiResponse({ status: 201, description: 'Business created successfully', type: BusinessResponseDto })
  @ApiResponse({ status: 409, description: 'Business with this phone already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateBusinessDto): Promise<Record<string, string>> {
    const input = CreateBusinessCommand.validate(dto);
    const businessId = await this.commandBus.execute(new CreateBusinessCommand(input));
    return { id: businessId };
  }
}
