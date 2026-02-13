import { HouseSize } from './house-size.enum';
import { LocationSuggestion } from './location-suggestion.dto';

/**
 * Moving Quote Request DTO
 * Represents a user's request for a moving quote
 */
export interface MovingQuoteRequest {
  movingFrom: LocationSuggestion;
  movingTo: LocationSuggestion;
  currentHouseSize: HouseSize;
  destinationHouseSize: HouseSize;
  preferredDate?: Date;
  accessRestrictions?: string[];
  specialItems?: string[];
  requireElevator?: boolean;
  requirePackingService?: boolean;
}

/**
 * Request for pre-authorizing a quote (for payment hold)
 */
export interface QuotePreAuthorizationRequest {
  quoteId: string;
  estimatedAmount: number;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Pre-authorization response
 */
export interface QuotePreAuthorizationResponse {
  preAuthId: string;
  status: 'pending' | 'authorized' | 'failed';
  expiresAt: Date;
}
