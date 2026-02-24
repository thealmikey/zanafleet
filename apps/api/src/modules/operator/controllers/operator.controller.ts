import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { OperatorEntity } from '../entities/operator.entity';
import { OperatorOnboardedEventV1 } from '../events/operator-onboarded.event';

export class CreateOperatorDto {
  actorId!: string;
  skills!: string[];
}

@Controller('operators')
export class OperatorController {
  constructor(
    @InjectRepository(OperatorEntity)
    private readonly operatorRepository: Repository<OperatorEntity>,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Onboard a new operator
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOperatorDto) {
    const operatorId = uuidv4();
    const now = new Date();

    const entity = new OperatorEntity();
    entity.id = operatorId;
    entity.actorId = dto.actorId;
    entity.skills = dto.skills;
    entity.reputationScore = 5.0; // Starting fresh
    entity.createdAt = now;
    entity.updatedAt = now;

    await this.operatorRepository.save(entity);

    // Step 2: Emit domain event for extensions (e.g., career graph in Neo4j)
    const event = new OperatorOnboardedEventV1({
      eventId: uuidv4(),
      operatorId,
      actorId: entity.actorId,
      skills: entity.skills,
      reputationScore: entity.reputationScore,
      createdAt: now,
      occurredAt: now,
    });
    this.eventBus.publish(event);

    return entity.toDomain();
  }

  /**
   * Get operator profile
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const operator = await this.operatorRepository.findOne({ where: { id } });
    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }
    return operator.toDomain();
  }

  /**
   * Get operator by Actor ID
   */
  @Get('actor/:actorId')
  async findByActor(@Param('actorId') actorId: string) {
    const operator = await this.operatorRepository.findOne({ where: { actorId } });
    if (!operator) {
      throw new NotFoundException(`Operator profile for actor "${actorId}" not found`);
    }
    return operator.toDomain();
  }
}
