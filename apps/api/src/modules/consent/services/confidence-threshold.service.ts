import { Injectable, Logger } from '@nestjs/common';

/**
 * ConfidenceThresholdService
 * 
 * Manages confidence thresholds for different capability types.
 * Determines whether a proposal should be made or clarification requested.
 * 
 * Default thresholds:
 * - Payment: 0.95
 * - Order: 0.90
 * - Move Estimate: 0.85
 * - Default: 0.70
 */
@Injectable()
export class ConfidenceThresholdService {
  private readonly logger = new Logger(ConfidenceThresholdService.name);
  
  /**
   * Default threshold for unknown capabilities
   */
  private readonly DEFAULT_THRESHOLD = 0.70;

  /**
   * Confidence thresholds by capability category
   */
  private readonly thresholds: Record<string, number> = {
    // High-risk capabilities require higher confidence
    'Payment': 0.95,
    'ProcessPayment': 0.95,
    'Refund': 0.95,
    'Transfer': 0.95,
    
    // Medium-high risk
    'CreateOrder': 0.90,
    'UpdateOrder': 0.90,
    'CancelOrder': 0.90,
    
    // Medium risk
    'RequestMoveEstimate': 0.85,
    'MoveEstimate': 0.85,
    'CreateDelivery': 0.85,
    'UpdateDelivery': 0.85,
    
    // Lower risk - can proceed with lower confidence
    'Search': 0.60,
    'View': 0.50,
    'List': 0.50,
  };

  /**
   * Get the confidence threshold for a capability
   */
  getThreshold(capabilityName: string): number {
    // Check for exact match
    if (capabilityName in this.thresholds) {
      return this.thresholds[capabilityName];
    }

    // Check for category match
    for (const [key, value] of Object.entries(this.thresholds)) {
      if (capabilityName.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // Return default
    this.logger.debug(`Using default threshold ${this.DEFAULT_THRESHOLD} for capability: ${capabilityName}`);
    return this.DEFAULT_THRESHOLD;
  }

  /**
   * Determine if a proposal should be made based on confidence
   * 
   * @param confidence - The AI confidence score (0-1)
   * @param capabilityName - The capability being proposed
   * @returns true if proposal should be made
   */
  shouldPropose(confidence: number, capabilityName: string): boolean {
    const threshold = this.getThreshold(capabilityName);
    const should = confidence >= threshold;
    
    this.logger.debug(
      `shouldPropose: ${confidence} >= ${threshold} = ${should} for ${capabilityName}`,
    );
    
    return should;
  }

  /**
   * Determine if clarification should be requested
   * 
   * @param confidence - The AI confidence score (0-1)
   * @param capabilityName - The capability being proposed
   * @returns true if clarification should be requested
   */
  shouldClarify(confidence: number, capabilityName: string): boolean {
    const threshold = this.getThreshold(capabilityName);
    
    // Clarification is needed when confidence is below threshold
    // but above a minimum bar (to avoid clarification for very low confidence)
    const minimumBar = threshold * 0.7; // 70% of threshold
    
    const shouldClarify = confidence < threshold && confidence >= minimumBar;
    
    this.logger.debug(
      `shouldClarify: ${confidence} < ${threshold} && ${confidence} >= ${minimumBar} = ${shouldClarify} for ${capabilityName}`,
    );
    
    return shouldClarify;
  }

  /**
   * Determine if the proposal should be auto-rejected (very low confidence)
   * 
   * @param confidence - The AI confidence score (0-1)
   * @param capabilityName - The capability being proposed
   * @returns true if proposal should be rejected
   */
  shouldReject(confidence: number, capabilityName: string): boolean {
    const threshold = this.getThreshold(capabilityName);
    const minimumBar = threshold * 0.7;
    
    return confidence < minimumBar;
  }

  /**
   * Get the action recommended based on confidence level
   */
  getRecommendedAction(
    confidence: number,
    capabilityName: string,
  ): 'propose' | 'clarify' | 'reject' {
    if (this.shouldPropose(confidence, capabilityName)) {
      return 'propose';
    }
    
    if (this.shouldClarify(confidence, capabilityName)) {
      return 'clarify';
    }
    
    return 'reject';
  }

  /**
   * Set a custom threshold for a capability
   */
  setThreshold(capabilityName: string, threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    
    this.thresholds[capabilityName] = threshold;
    this.logger.log(`Set threshold ${threshold} for capability: ${capabilityName}`);
  }

  /**
   * Get all configured thresholds
   */
  getAllThresholds(): Record<string, number> {
    return { ...this.thresholds };
  }

  /**
   * Reset threshold to default for a capability
   */
  resetThreshold(capabilityName: string): void {
    // Reset to a default value based on category
    const defaults: Record<string, number> = {
      'Payment': 0.95,
      'ProcessPayment': 0.95,
      'CreateOrder': 0.90,
      'RequestMoveEstimate': 0.85,
    };
    
    const defaultValue = defaults[capabilityName] ?? this.DEFAULT_THRESHOLD;
    this.thresholds[capabilityName] = defaultValue;
    this.logger.log(`Reset threshold to ${defaultValue} for capability: ${capabilityName}`);
  }
}
