import { LocationResponseDto } from '@api/core/location';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessType } from '@zanafleet/contracts';

/**
 * BusinessResponseDto
 * Output DTO for Business responses
 */
export class BusinessResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the business',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the business',
    example: 'Nairobi Supermarket Ltd',
  })
  businessName!: string;

  @ApiProperty({
    description: 'Phone number (primary identity)',
    example: '+254712345678',
  })
  phone!: string;

  @ApiProperty({
    type: LocationResponseDto,
    description: 'Location where the business operates',
  })
  location!: LocationResponseDto;

  @ApiProperty({
    description: 'Type of business',
    enum: BusinessType,
    example: BusinessType.Retail,
  })
  businessType!: BusinessType;

  @ApiProperty({
    description: 'Email address',
    example: 'info@business.com',
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
