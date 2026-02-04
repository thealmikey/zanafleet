import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { VehicleType } from '@zanafleet/contracts';
import { CreateLocationDto } from '@api/core/location';

/**
 * CreateRiderDto
 * Input DTO for creating a new Rider
 */
export class CreateRiderDto {
  @ApiProperty({
    description: 'Full name of the rider',
    example: 'John Kamau',
  })
  fullName!: string;

  @ApiProperty({
    description: 'National ID (Kenyan ID)',
    example: '12345678',
  })
  nationalId!: string;

  @ApiProperty({
    description: 'Phone number (primary identity)',
    example: '+254712345678',
  })
  phone!: string;

  @ApiPropertyOptional({
    type: CreateLocationDto,
    description: 'Location where rider operates (auto-filled from Sacco if provided)',
  })
  location?: CreateLocationDto;

  @ApiProperty({
    description: 'Type of vehicle operated',
    enum: VehicleType,
    example: VehicleType.Bike,
  })
  vehicleType!: VehicleType;

  @ApiPropertyOptional({
    description: 'Sacco ID (transport cooperative)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  saccoId?: string | null;

  @ApiPropertyOptional({
    description: 'Email address (optional)',
    example: 'john@example.com',
  })
  email?: string | null;
}
