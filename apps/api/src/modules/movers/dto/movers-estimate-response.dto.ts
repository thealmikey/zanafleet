import { MoveEstimate } from '../domain/move-estimate';

/**
 * Response wrapper for estimate API
 */
export class MoversEstimateResponseDto {
  /** Whether the request was successful */
  success!: boolean;
  /** The estimate data */
  data!: MoveEstimate;
  /** Error messages if any */
  errors?: string[];
  /** Optional metadata */
  metadata?: {
    processingTimeMs: number;
    generatedAt: string;
    quoteVersion: string;
  };
}

/**
 * Create a successful response
 */
export function createEstimateSuccessResponse(
  estimate: MoveEstimate,
  processingTimeMs: number = 0
): MoversEstimateResponseDto {
  return {
    success: true,
    data: estimate,
    metadata: {
      processingTimeMs,
      generatedAt: new Date().toISOString(),
      quoteVersion: '1.0.0',
    },
  };
}

/**
 * Create an error response
 */
export function createEstimateErrorResponse(errors: string[]): MoversEstimateResponseDto {
  return {
    success: false,
    data: {
      quoteId: '',
      recommendedVehicles: [],
      priceBreakdown: {
        baseFare: 0,
        distanceCharge: 0,
        volumeCharge: 0,
        laborCharge: 0,
        fuelSurcharge: 0,
        discounts: 0,
        taxes: 0,
        total: 0,
        currency: 'KES',
      },
      policyAdjustments: [],
      explanation: '',
      validUntil: new Date().toISOString(),
    },
    errors,
  };
}
