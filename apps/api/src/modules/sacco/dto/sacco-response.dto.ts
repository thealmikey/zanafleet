import { LocationResponseDto } from '@api/core/location';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SaccoResponseDto
 * Output DTO for Sacco responses
 */
export class SaccoResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the Sacco',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the Sacco',
    example: 'Nairobi Taxi Sacco',
  })
  name!: string;

  @ApiProperty({
    type: LocationResponseDto,
    description: 'Location where the Sacco operates',
  })
  location!: LocationResponseDto;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+254712345678',
  })
  contactPhone!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt!: Date;
}
