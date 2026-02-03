import { ApiProperty } from '@nestjs/swagger';

import { VehicleType } from '@zanafleet/contracts';

/**
 * RiderResponseDto
 * Output DTO for Rider responses
 */
export class RiderResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the rider',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Full name of the rider',
    example: 'John Kamau',
  })
  fullName!: string;

  @ApiProperty({
    description: 'National ID',
    example: '12345678',
  })
  nationalId!: string;

  @ApiProperty({
    description: 'Phone number (primary identity)',
    example: '+254712345678',
  })
  phone!: string;

  @ApiProperty({
    description: 'Location/city where rider operates',
    example: 'Nairobi, Kenya',
  })
  location!: string;

  @ApiProperty({
    description: 'Type of vehicle',
    enum: VehicleType,
    example: VehicleType.Bike,
  })
  vehicleType!: VehicleType;

  @ApiProperty({
    description: 'Sacco ID if rider belongs to a Sacco',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  saccoId!: string | null;

  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
    nullable: true,
  })
  email!: string | null;

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
