import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BusinessType } from '@zanafleet/contracts';
import { CreateLocationDto } from '@api/core/location';

/**
 * CreateBusinessDto
 * Input DTO for creating a new Business
 */
export class CreateBusinessDto {
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
    type: CreateLocationDto,
    description: 'Location where the business operates',
  })
  location!: CreateLocationDto;

  @ApiProperty({
    description: 'Type of business',
    enum: BusinessType,
    example: BusinessType.Retail,
  })
  businessType!: BusinessType;

  @ApiPropertyOptional({
    description: 'Email address (optional)',
    example: 'info@business.com',
  })
  email?: string | null;
}
