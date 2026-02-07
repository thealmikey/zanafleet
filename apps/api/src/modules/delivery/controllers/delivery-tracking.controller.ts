import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger'
import { InjectDataSource } from '@nestjs/typeorm'
import { DeliveryStatus } from '@zanafleet/contracts'
import { DataSource } from 'typeorm'

import { DeliveryService } from '../services/delivery.service'

class DeliveryTrackingStopDto {
  @ApiProperty({ description: 'Stop sequence number starting from 0', example: 0 })
  sequence!: number

  @ApiProperty({
    description: 'Type of stop',
    example: 'pickup',
    enum: ['pickup', 'dropoff', 'waypoint'],
  })
  type!: 'pickup' | 'dropoff' | 'waypoint'

  @ApiProperty({
    description: 'Location identifier of the stop',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  locationId!: string

  @ApiPropertyOptional({
    description: 'Scheduled time of the stop (if any)',
    example: '2025-01-01T10:00:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  scheduledTime!: Date | null

  @ApiPropertyOptional({
    description: 'Actual time of the stop (if any)',
    example: '2025-01-01T10:05:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  actualTime!: Date | null

  @ApiPropertyOptional({
    description: 'Additional notes for the stop',
    example: 'Leave with security at gate',
    nullable: true,
  })
  notes!: string | null
}

class RiderLastKnownLocationDto {
  @ApiProperty({ description: 'Latitude', example: -1.29 })
  latitude!: number

  @ApiProperty({ description: 'Longitude', example: 36.82 })
  longitude!: number

  @ApiPropertyOptional({
    description: 'When the rider was last seen at this location',
    example: '2025-01-01T09:59:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  lastSeenAt?: Date | null
}

class PublicRiderSummaryDto {
  @ApiProperty({
    description: 'Assigned rider identifier (if any)',
    example: 'rider-123',
    nullable: true,
  })
  riderId!: string | null

  @ApiPropertyOptional({
    description: 'Last known rider location (if resolvable)',
    type: RiderLastKnownLocationDto,
    nullable: true,
  })
  lastKnownLocation?: RiderLastKnownLocationDto | null
}

export class DeliveryTrackingResponseDto {
  @ApiProperty({
    description: 'Delivery identifier',
    example: 'd-123',
  })
  deliveryId!: string

  @ApiProperty({
    description: 'Current delivery status',
    enum: DeliveryStatus,
    example: DeliveryStatus.InTransit,
  })
  status!: DeliveryStatus

  @ApiPropertyOptional({
    description: 'Scheduled pickup time (if any)',
    type: String,
    format: 'date-time',
    example: '2025-01-01T10:00:00.000Z',
    nullable: true,
  })
  scheduledPickupTime!: Date | null

  @ApiPropertyOptional({
    description: 'Scheduled dropoff time (if any)',
    type: String,
    format: 'date-time',
    example: '2025-01-01T11:00:00.000Z',
    nullable: true,
  })
  scheduledDropoffTime!: Date | null

  @ApiProperty({
    description: 'Stops associated with this delivery (empty if none)',
    type: [DeliveryTrackingStopDto],
  })
  stops!: DeliveryTrackingStopDto[]

  @ApiPropertyOptional({
    description: 'Public rider summary (if a rider is assigned)',
    type: PublicRiderSummaryDto,
    nullable: true,
  })
  rider?: PublicRiderSummaryDto | null
}

@ApiTags('Deliveries')
@Controller('deliveries/track')
export class DeliveryTrackingController {
  constructor(
    private readonly deliveryService: DeliveryService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get(':token')
  @ApiOperation({
    summary: 'Track a delivery by public token',
    description:
      'Returns a minimal public view of a delivery: status, scheduled times, stop summaries, and optionally last-known rider location. Does not expose PII.',
  })
  @ApiParam({
    name: 'token',
    description: 'Public tracking token',
    example: 'f1c2d3e4a5b6c7d8e9f0a1b2c3d4e5f6',
  })
  @ApiOkResponse({
    description: 'Public delivery tracking view',
    type: DeliveryTrackingResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Delivery not found for token' })
  async getByToken(@Param('token') token: string): Promise<DeliveryTrackingResponseDto> {
    const base = await this.deliveryService.getPublicViewByToken(token)
    if (!base) {
      throw new NotFoundException('Delivery not found')
    }

    const rows = (await this.dataSource.query(
      `
      SELECT
        "sequence",
        "type",
        "locationId",
        "scheduledTime",
        "actualTime",
        "notes"
      FROM "delivery_stops"
      WHERE "deliveryId" = $1
      ORDER BY "sequence" ASC
    `,
      [base.deliveryId],
    )) as Array<{
      sequence: number
      type: 'pickup' | 'dropoff' | 'waypoint'
      locationId: string
      scheduledTime: string | Date | null
      actualTime: string | Date | null
      notes: string | null
    }>

    const stops: DeliveryTrackingStopDto[] = rows.map((r) => ({
      sequence: Number(r.sequence),
      type: r.type,
      locationId: r.locationId,
      scheduledTime: r.scheduledTime ? new Date(r.scheduledTime) : null,
      actualTime: r.actualTime ? new Date(r.actualTime) : null,
      notes: r.notes ?? null,
    }))

    const riderSummary: PublicRiderSummaryDto | null =
      base.assignedRiderId != null
        ? {
            riderId: base.assignedRiderId,
            // Optional: integrate with Rider module to resolve last known location.
            // Kept null here to avoid leaking PII and cross-module DB access.
            lastKnownLocation: null,
          }
        : null

    return {
      deliveryId: base.deliveryId,
      status: base.status,
      scheduledPickupTime: base.scheduledPickupTime ?? null,
      scheduledDropoffTime: base.scheduledDropoffTime ?? null,
      stops,
      rider: riderSummary,
    }
  }
}
