import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TripEntity } from '../entities/trip.entity';

export class CreateTripDto {
  assetId!: string;
  operatorId!: string;
  bundleId?: string;
  startTime!: Date;
}

@Controller('assets/trips')
export class TripController {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>
  ) {}

  /**
   * Create a new trip record
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTripDto) {
    const trip = this.tripRepository.create({
      id: require('uuid').v4(),
      assetId: dto.assetId,
      operatorId: dto.operatorId,
      bundleId: dto.bundleId,
      startTime: dto.startTime,
    });

    await this.tripRepository.save(trip);
    return trip.toDomain();
  }

  /**
   * Get trips by bundleId (for multi-asset projects)
   */
  @Get()
  async findByBundle(@Query('bundleId') bundleId?: string) {
    if (!bundleId) {
      return { data: [] };
    }

    const trips = await this.tripRepository.find({
      where: { bundleId },
      relations: ['asset'],
    });

    return { data: trips.map((t) => t.toDomain()) };
  }

  /**
   * Get trip details by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: ['asset'],
    });

    if (!trip) {
      throw new Error(`Trip with ID "${id}" not found`);
    }

    return trip.toDomain();
  }
}
