import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

/**
 * PolicyEvaluatedV1 event structure
 * Matches the event published by PolicyEvaluationEngineService
 */
export interface PolicyEvaluatedV1 {
  eventId: string;
  eventType: 'PolicyEvaluatedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: Date;
  aggregateId: string;
  aggregateType: 'Policy';

  trigger: string;
  workspaceId: string;
  decision: string;
  matchedPolicies: Array<{
    policyId: string;
    name: string;
    effect: string;
    outputs?: Record<string, unknown>;
  }>;
  processingTimeMs: number;

  deliveryId?: string;
  businessId?: string;
  riderId?: string;

  correlationId?: string;
  causationId?: string;
}

/**
 * PolicyEvaluatedListener
 * Listens for PolicyEvaluatedV1 events to capture pricing policy decisions for audit
 */
@Injectable()
@EventsHandler()
export class PolicyEvaluatedListener implements IEventHandler<PolicyEvaluatedV1> {
  private readonly logger = new Logger(PolicyEvaluatedListener.name);

  async handle(event: PolicyEvaluatedV1): Promise<void> {
    if (event.eventType !== 'PolicyEvaluatedEvent-V1') {
      return;
    }

    const isPricingRelated =
      event.trigger === 'DELIVERY_PRICING' ||
      event.matchedPolicies.some(
        (p) => p.outputs?.surgeMultiplier !== undefined || p.outputs?.adjustment !== undefined
      );

    if (!isPricingRelated) {
      return;
    }

    this.logger.log(
      `Pricing policy evaluated: trigger=${event.trigger}, decision=${event.decision}, ` +
        `policies=${event.matchedPolicies.length}, processingTime=${event.processingTimeMs}ms`
    );

    for (const policy of event.matchedPolicies) {
      if (policy.outputs?.surgeMultiplier !== undefined) {
        this.logger.debug(
          `Policy ${policy.policyId} (${policy.name}) applied surge multiplier: ${policy.outputs.surgeMultiplier}`
        );
      }

      if (policy.outputs?.adjustment !== undefined) {
        this.logger.debug(
          `Policy ${policy.policyId} (${policy.name}) applied adjustment: ${JSON.stringify(
            policy.outputs.adjustment
          )}`
        );
      }
    }
  }
}
