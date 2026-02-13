/**
 * MediaInsight DTOs for API Responses
 *
 * Data Transfer Objects for validating and documenting
 * MediaInsight structures in API requests and responses.
 *
 * @module media-insight
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Item category enum values for DTO validation.
 */
const ITEM_CATEGORIES = [
  'furniture',
  'appliance',
  'fragile',
  'box',
  'vehicle',
  'other',
] as const;

/**
 * Size class enum values for DTO validation.
 */
const SIZE_CLASSES = ['small', 'medium', 'large', 'extra-large'] as const;

/**
 * DTO for a detected item from media analysis.
 * Used for API validation and Swagger documentation.
 */
export class DetectedItemDto {
  @ApiProperty({
    description: 'Human-readable label for the detected item',
    example: 'sofa',
  })
  @IsString()
  label!: string;

  @ApiProperty({
    description: 'Category classification for handling requirements',
    enum: ITEM_CATEGORIES,
    example: 'furniture',
  })
  @IsEnum(ITEM_CATEGORIES)
  category!: string;

  @ApiProperty({
    description: 'Size classification for volume estimation',
    enum: SIZE_CLASSES,
    example: 'large',
  })
  @IsEnum(SIZE_CLASSES)
  sizeClass!: string;

  @ApiProperty({
    description: 'Number of items of this type detected',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Confidence score for this detection (0-1)',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

/**
 * DTO for MediaInsight V1 structure.
 * Used for API validation and Swagger documentation.
 */
export class MediaInsightDto {
  @ApiProperty({
    description: 'Schema version for deserialization and migration',
    default: '1.0.0',
  })
  @IsString()
  schemaVersion!: string;

  @ApiProperty({
    description: 'Items detected in the analyzed media',
    type: [DetectedItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetectedItemDto)
  detectedItems!: DetectedItemDto[];

  @ApiProperty({
    description: 'Total estimated volume in cubic meters',
    example: 25.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  estimatedTotalVolumeM3!: number;

  @ApiProperty({
    description: 'Labor intensity on a 1-5 scale',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  estimatedLaborIntensity!: number;

  @ApiProperty({
    description: 'Fragility score from 0-1, where 1 is extremely fragile',
    example: 0.3,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  fragilityScore!: number;

  @ApiProperty({
    description: 'Whether special handling is required',
    example: false,
  })
  @IsBoolean()
  specialHandlingRequired!: boolean;

  @ApiProperty({
    description: 'Overall confidence in the analysis (0-1)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  perceptionConfidence!: number;

  @ApiProperty({
    description: 'AI model version used for analysis',
    example: 'gpt-4-vision-preview',
  })
  @IsString()
  modelVersion!: string;

  @ApiProperty({
    description: 'Timestamp when analysis was performed (ISO 8601)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsString()
  analyzedAt!: string;

  @ApiProperty({
    description: 'URLs or asset IDs of media that were analyzed',
    example: ['https://storage.example.com/img1.jpg'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  mediaReferences!: string[];
}
