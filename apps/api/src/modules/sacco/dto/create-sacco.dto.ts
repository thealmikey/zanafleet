import { CreateLocationDto } from '@api/core/location';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateSaccoDto
 * Input DTO for creating a new Sacco
 */
export class CreateSaccoDto {
  @ApiProperty({
    description: 'Name of the Sacco',
    example: 'Nairobi Taxi Sacco',
  })
  name!: string;

  @ApiProperty({
    type: CreateLocationDto,
    description: 'Location where the Sacco operates',
  })
  location!: CreateLocationDto;

  @ApiProperty({
    description: 'Contact phone number for the Sacco',
    example: '+254712345678',
  })
  contactPhone!: string;
}
