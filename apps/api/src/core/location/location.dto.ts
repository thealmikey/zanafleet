import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({
    description: 'Latitude coordinate (degrees)',
    example: -1.29,
    minimum: -90,
    maximum: 90,
  })
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate (degrees)',
    example: 36.82,
    minimum: -180,
    maximum: 180,
  })
  longitude!: number;

  @ApiProperty({
    description: 'Human-readable name of the location',
    example: 'Westlands',
    minLength: 1,
    maxLength: 255,
  })
  humanReadableName!: string;

  @ApiProperty({
    description: 'Administrative area (e.g., city, county, region)',
    example: 'Nairobi',
    minLength: 1,
    maxLength: 255,
  })
  administrativeArea!: string;

  @ApiPropertyOptional({
    description: 'Country name',
    example: 'Kenya',
    default: 'Kenya',
    minLength: 1,
    maxLength: 100,
  })
  country?: string;
}

export class LocationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the location',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  locationId!: string;

  @ApiProperty({
    description: 'Latitude coordinate (degrees)',
    example: -1.29,
  })
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate (degrees)',
    example: 36.82,
  })
  longitude!: number;

  @ApiProperty({
    description: 'Human-readable name of the location',
    example: 'Westlands',
  })
  humanReadableName!: string;

  @ApiProperty({
    description: 'Administrative area (e.g., city, county, region)',
    example: 'Nairobi',
  })
  administrativeArea!: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Kenya',
  })
  country!: string;

  @ApiProperty({
    description: 'When the location was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the location was last updated',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;
}
