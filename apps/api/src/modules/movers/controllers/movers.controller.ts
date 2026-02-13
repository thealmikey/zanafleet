import { Controller, Get, Post, Body, Query, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { 
  MovingQuoteRequest, 
  MovingQuote,
  LocationSuggestion,
  QuotePreAuthorizationRequest,
  QuotePreAuthorizationResponse,
  MoversEstimateRequestDto,
  validateMoversEstimateRequest,
} from '../dto';
import { LOCATION_AUTOCOMPLETE_PROVIDER, LocationAutocompleteProvider } from '../providers';
import { VehicleRecommendationService } from '../services/vehicle-recommendation.service';
import { MoversPricingService } from '../services/movers-pricing.service';
import { MoversQuoteOrchestrator } from '../orchestrators/movers-quote.orchestrator';
import { MoversEstimateResponseDto, createEstimateSuccessResponse, createEstimateErrorResponse } from '../dto/movers-estimate-response.dto';

/**
 * Movers Controller
 * 
 * REST API endpoints for the Movers homepage experience.
 */
@Controller('mover')
export class MoversController {
  private readonly logger = new Logger(MoversController.name);

  constructor(
    @Inject(LOCATION_AUTOCOMPLETE_PROVIDER) private readonly locationProvider: LocationAutocompleteProvider,
    private readonly vehicleRecommendationService: VehicleRecommendationService,
    private readonly pricingService: MoversPricingService,
    private readonly quoteOrchestrator: MoversQuoteOrchestrator,
  ) {}

  /**
   * GET /mover/locations/suggestions
   * 
   * Get location autocomplete suggestions
   */
  @Get('locations/suggestions')
  async getLocationSuggestions(
    @Query('q') query: string,
    @Query('lat') latitude?: string,
    @Query('lng') longitude?: string,
    @Query('limit') limit?: string,
  ): Promise<LocationSuggestion[]> {
    this.logger.debug(`Location search: ${query} (lat: ${latitude}, lng: ${longitude})`);
    
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const suggestions = await this.locationProvider.searchSuggestions(query, {
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        limit: limit ? Number(limit) : 10,
      });

      return suggestions;
    } catch (error) {
      this.logger.error(`Location search failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * POST /mover/quote
   * 
   * Calculate a moving quote (legacy endpoint)
   */
  @Post('quote')
  async calculateQuote(
    @Body() request: MovingQuoteRequest,
  ): Promise<MovingQuote> {
    this.logger.log(`Calculating quote for: ${request.movingFrom.formattedAddress} → ${request.movingTo.formattedAddress}`);

    // Validate required fields
    if (!request.movingFrom || !request.movingTo) {
      throw new HttpException('Origin and destination are required', HttpStatus.BAD_REQUEST);
    }

    if (!request.currentHouseSize || !request.destinationHouseSize) {
      throw new HttpException('House sizes are required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Calculate distance using Haversine formula
      const distanceKm = this.haversineDistance(
        request.movingFrom.latitude,
        request.movingFrom.longitude,
        request.movingTo.latitude,
        request.movingTo.longitude
      );

      // Get vehicle recommendations
      const vehicles = await this.vehicleRecommendationService.recommendVehicles(
        request.currentHouseSize,
        request.destinationHouseSize,
        distanceKm,
      );

      // Calculate pricing
      const pricing = await this.pricingService.calculateQuote(request);

      // Combine results
      return {
        ...pricing,
        vehicles,
      };
    } catch (error) {
      this.logger.error(`Quote calculation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      throw new HttpException(
        'Failed to calculate quote. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /mover/estimate
   * 
   * Create a comprehensive moving estimate using the orchestration layer
   * This is the new AI-powered estimate endpoint
   */
  @Post('estimate')
  async createEstimate(
    @Body() request: MoversEstimateRequestDto,
  ): Promise<MoversEstimateResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `Creating estimate from ${request.fromLocation?.formattedAddress} → ${request.toLocation?.formattedAddress}`
    );

    // Validate request
    const validationErrors = validateMoversEstimateRequest(request);
    if (validationErrors.length > 0) {
      this.logger.warn(`Estimate request validation failed: ${validationErrors.join(', ')}`);
      return createEstimateErrorResponse(validationErrors);
    }

    try {
      // Delegate to orchestrator
      const estimate = await this.quoteOrchestrator.createEstimate(request);
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Estimate ${estimate.quoteId} created in ${processingTimeMs}ms. ` +
        `Total: ${estimate.priceBreakdown.currency} ${estimate.priceBreakdown.total}`
      );

      return createEstimateSuccessResponse(estimate, processingTimeMs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Estimate creation failed: ${errorMessage}`);

      return createEstimateErrorResponse(['Failed to create estimate. Please try again.']);
    }
  }

  /**
   * POST /mover/quote/pre-authorize
   * 
   * Pre-authorize a quote amount
   */
  @Post('quote/pre-authorize')
  async preAuthorizeQuote(
    @Body() _request: QuotePreAuthorizationRequest,
  ): Promise<QuotePreAuthorizationResponse> {
    this.logger.log(`Pre-authorizing quote`);

    // Placeholder for payment integration
    return {
      preAuthId: `preauth_${Date.now()}`,
      status: 'authorized',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Haversine formula for calculating distance between two points
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
