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
    description: 'Location/city where the Sacco operates',
    example: 'Nairobi, Kenya',
  })
  location!: string;

  @ApiProperty({
    description: 'Contact phone number for the Sacco',
    example: '+254712345678',
  })
  contactPhone!: string;
}
