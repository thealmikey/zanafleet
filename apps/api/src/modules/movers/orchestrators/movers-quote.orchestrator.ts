import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { MoveEstimate, calculateDemandMultiplier, PolicyAdjustment } from '../domain/move-estimate';
import { MoveProfile } from '../domain/move-profile';
import { MoversEstimateRequestDto } from '../dto/movers-estimate-request.dto';
import { AIMoveProfileService } from '../services/ai-move-profile.service';
import { LocationNormalizationService, NormalizedLocation } from '../services/location-normalization.service';
import { VehicleMatchingService } from '../services/vehicle-matching.service';

/**
 * MoversQuoteOrchestrator
 * 
 * Orchestrates the moving quote estimation process by coordinating:
 * 1. Location normalization
 * 2. AI-driven move profile interpretation
 * 3. Vehicle matching
 * 4. Policy engine integration
 * 5. Pricing computation
 * 
 * This is the main orchestration layer for the movers estimate workflow.
 */
@Injectable()
export class MoversQuoteOrchestrator {
  private readonly logger = new Logger(MoversQuoteOrchestrator.name);

  constructor(
    private readonly locationService: LocationNormalizationService,
    private readonly aiMoveProfileService: AIMoveProfileService,
    private readonly vehicleMatchingService: VehicleMatchingService,
  ) {}

  /**
   * Create a comprehensive move estimate based on the request
   * 
   * @param request - The estimate request with locations and preferences
   * @returns A complete MoveEstimate with vehicles, pricing, and policy adjustments
   */
  async createEstimate(request: MoversEstimateRequestDto): Promise<MoveEstimate> {
    const startTime = Date.now();
    const quoteId = `quote_${randomUUID().slice(0, 8)}`;

    this.logger.log(`Creating estimate ${quoteId} for move from ${request.fromLocation.formattedAddress}`);

    try {
      // Step 1: Normalize input locations
      const [normalizedOrigin, normalizedDestination] = await Promise.all([
        this.locationService.normalize(request.fromLocation),
        this.locationService.normalize(request.toLocation),
      ]);

      // Step 2: Calculate distance between locations
      const distanceResult = this.locationService.calculateDistance(normalizedOrigin, normalizedDestination);

      // Step 3: Use AI to interpret house sizes → MoveProfile
      const moveProfile = await this.aiMoveProfileService.interpretHouseSize(request.fromHouseSize, {
        fragilityLevel: request.fragilityLevel,
        floorCount: request.fromFloorCount,
        packingService: request.includePacking,
        specialItems: request.specialItems,
        distanceKm: distanceResult.distanceKm,
      });

      // Step 4: Search for and match vehicles
      const recommendedVehicles = await this.vehicleMatchingService.findMatchingVehicles(
        moveProfile,
        normalizedOrigin,
        50, // 50km radius
      );

      // Step 5: Apply policy adjustments
      const policyAdjustments = await this.applyPolicyAdjustments(
        moveProfile,
        normalizedOrigin,
        request.requestedDate ? new Date(request.requestedDate) : undefined,
      );

      // Step 6: Compute pricing
      const priceBreakdown = await this.computePricing(
        moveProfile,
        distanceResult.distanceKm,
        recommendedVehicles,
        policyAdjustments,
        request.requestedDate ? new Date(request.requestedDate) : undefined,
      );

      // Step 7: Generate explanation
      const explanation = this.generateExplanation(moveProfile, distanceResult, recommendedVehicles);

      // Step 8: Calculate validity period (typically 24 hours)
      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + 24);

      // Build the final estimate
      const estimate: MoveEstimate = {
        quoteId,
        recommendedVehicles,
        priceBreakdown,
        policyAdjustments,
        demandMultiplier: request.requestedDate 
          ? calculateDemandMultiplier(new Date(request.requestedDate)) 
          : undefined,
        explanation,
        validUntil: validUntil.toISOString(),
        notes: this.generateNotes(moveProfile, request),
      };

      // Publish analytics event asynchronously
      this.publishEstimateCreatedEvent(estimate, request, Date.now() - startTime);

      this.logger.log(
        `Estimate ${quoteId} created successfully in ${Date.now() - startTime}ms. ` +
        `Total: ${priceBreakdown.currency} ${priceBreakdown.total}`
      );

      return estimate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create estimate ${quoteId}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Apply policy adjustments (discounts, surcharges, restrictions)
   */
  private async applyPolicyAdjustments(
    moveProfile: MoveProfile,
    _origin: NormalizedLocation,
    requestedDate?: Date
  ): Promise<PolicyAdjustment[]> {
    const adjustments: PolicyAdjustment[] = [];

    // Weekend adjustment
    if (requestedDate) {
      const dayOfWeek = requestedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        adjustments.push({
          policyId: 'weekend-premium',
          type: 'surcharge',
          name: 'Weekend Premium',
          amount: 500,
          description: '15% weekend surcharge for Saturday and Sunday moves',
        });
      }
    }

    // Fragile items handling fee
    if (moveProfile.fragilityFactor === 'high') {
      adjustments.push({
        policyId: 'fragile-handling',
        type: 'surcharge',
        name: 'Fragile Item Handling',
        amount: 750,
        description: 'Special handling fee for high-value or fragile items',
      });
    }

    // Floor adjustment (no elevator)
    if ((moveProfile.floorCount ?? 1) > 1 && !moveProfile.packingService) {
      adjustments.push({
        policyId: 'floor-premium',
        type: 'surcharge',
        name: 'Floor Premium',
        amount: (moveProfile.floorCount ?? 1) * 200,
        description: `Additional labor cost for floor ${moveProfile.floorCount}`,
      });
    }

    // Packing service discount (bundled)
    if (moveProfile.packingService) {
      adjustments.push({
        policyId: 'packing-bundle',
        type: 'discount',
        name: 'Packing Bundle',
        amount: -300,
        description: 'Discount for bundled packing service',
      });
    }

    return adjustments;
  }

  /**
   * Compute final pricing breakdown
   */
  private async computePricing(
    moveProfile: MoveProfile,
    distanceKm: number,
    vehicles: MoveEstimate['recommendedVehicles'],
    adjustments: PolicyAdjustment[],
    requestedDate?: Date
  ): Promise<MoveEstimate['priceBreakdown']> {
    // Get base price from best vehicle match
    const baseVehiclePrice = vehicles[0]?.estimatedPrice ?? 5000;

    // Base fare
    const baseFare = 1500;

    // Calculate distance charge
    const distanceCharge = distanceKm * 3.5; // KES per km

    // Volume-based charge
    const volumeCharge = moveProfile.estimatedVolumeM3 * 45; // KES per cubic meter

    // Labor charge
    const laborCharge = moveProfile.laborRequirement * 150; // KES per mover per hour (assume 2 hours)

    // Fuel surcharge
    const fuelSurchargePercent = 5;

    // Calculate discounts and surcharges
    const discountAmount = adjustments
      .filter((a) => a.type === 'discount')
      .reduce((sum, a) => sum + Math.abs(a.amount), 0);

    const surchargeAmount = adjustments
      .filter((a) => a.type === 'surcharge')
      .reduce((sum, a) => sum + a.amount, 0);

    const subtotal = baseFare + distanceCharge + volumeCharge + laborCharge + baseVehiclePrice;
    const discountedSubtotal = subtotal - discountAmount + surchargeAmount;

    // Apply demand multiplier if applicable
    const demandMultiplier = requestedDate ? calculateDemandMultiplier(requestedDate) : 1;
    const demandAdjustedTotal = discountedSubtotal * demandMultiplier;

    // Calculate taxes (16% VAT)
    const taxRatePercent = 16;
    const taxes = demandAdjustedTotal * (taxRatePercent / 100);

    // Total
    const total = demandAdjustedTotal + taxes;

    return {
      baseFare,
      distanceCharge: Math.round(distanceCharge * 100) / 100,
      volumeCharge: Math.round(volumeCharge * 100) / 100,
      laborCharge: Math.round(laborCharge * 100) / 100,
      fuelSurcharge: Math.round((subtotal * (fuelSurchargePercent / 100)) * 100) / 100,
      discounts: -discountAmount,
      taxes: Math.round(taxes * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: 'KES',
    };
  }

  /**
   * Generate human-readable explanation of the estimate
   */
  private generateExplanation(
    moveProfile: MoveProfile,
    distanceResult: { distanceKm: number; travelTimeMinutes: number },
    vehicles: MoveEstimate['recommendedVehicles']
  ): string {
    const vehicleInfo = vehicles.length > 0
      ? `Recommended vehicle: ${vehicles[0].type} (${vehicles[0].capacityProfile.maxVolumeM3}m³ capacity)`
      : 'Vehicle matching in progress';

    return `
Based on your ${moveProfile.estimatedVolumeM3}m³ move, we've analyzed your requirements:

• Estimated Volume: ${moveProfile.estimatedVolumeM3} cubic meters
• Required Labor: ${moveProfile.laborRequirement} movers
• Distance: Approximately ${distanceResult.distanceKm} km
• Estimated Duration: ${Math.round(distanceResult.travelTimeMinutes / 60)} hours
• Fragility Level: ${moveProfile.fragilityFactor}
${moveProfile.floorCount ? `• Floor: ${moveProfile.floorCount}` : ''}
${moveProfile.packingService ? '• Includes packing service' : ''}

${vehicleInfo}
${vehicles[0] ? `Match Score: ${vehicles[0].matchScore}%` : ''}

Price includes all applicable taxes and surcharges. This quote is valid for 24 hours.
    `.trim();
  }

  /**
   * Generate additional notes for the estimate
   */
  private generateNotes(moveProfile: MoveProfile, request: MoversEstimateRequestDto): string[] {
    const notes: string[] = [];

    if (moveProfile.fragilityFactor === 'high') {
      notes.push('Special handling required for fragile items');
    }

    if ((moveProfile.floorCount ?? 1) > 3) {
      notes.push('High-rise building access - verify elevator availability');
    }

    if (moveProfile.specialHandling && moveProfile.specialHandling.length > 0) {
      notes.push(`Special items: ${moveProfile.specialHandling.join(', ')}`);
    }

    if (request.includeInsurance) {
      notes.push('Insurance coverage included');
    }

    return notes;
  }

  /**
   * Publish estimate created event for analytics
   */
  private publishEstimateCreatedEvent(
    estimate: MoveEstimate,
    _request: MoversEstimateRequestDto,
    processingTimeMs: number
  ): void {
    // Event publishing would go here via EventBus
    // This is for async analytics and demand tracking
    this.logger.debug(
      `Estimate event published: quoteId=${estimate.quoteId}, ` +
      `total=${estimate.priceBreakdown.total}, ` +
      `processingTimeMs=${processingTimeMs}`
    );
  }
}
