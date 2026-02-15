import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BindingTargetType, PolicyTrigger, PolicyEffect } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { SchedulingConstraintService } from '../../calendar/services/scheduling-constraint.service';
import { CustomerEntity } from '../../customer/entities/customer.entity';
import { PolicyEvaluationEngineService } from '../../policy/services/policy-evaluation-engine.service';
import { BusinessAvailabilityProjection } from '../entities/business-availability.projection';

export interface CommerceEvaluationResult {
    allowed: boolean;
    reason: string;
    suggestedReschedule?: Date;
    modifications?: Record<string, any>;
}

@Injectable()
export class CommerceContextEngine {
    constructor(
        private readonly schedulingService: SchedulingConstraintService,
        private readonly policyEngine: PolicyEvaluationEngineService,
        @InjectRepository(BusinessAvailabilityProjection)
        private readonly availabilityRepo: Repository<BusinessAvailabilityProjection>,
    ) { }

    async evaluateOrderPlacement(
        businessId: string,
        customer: CustomerEntity,
        context: {
            workspaceId: string;
            timestamp: Date;
            items: any[];
            totalAmount: number;
        }
    ): Promise<CommerceEvaluationResult> {
        // 1. Check Capacity (Projection)
        const availabilityProj = await this.availabilityRepo.findOne({ where: { businessId } });
        if (availabilityProj && availabilityProj.isAtCapacity) {
            return {
                allowed: false,
                reason: `Merchant is at full capacity (${availabilityProj.activeOrderCount}/${availabilityProj.capacityLimit}). Please try again later.`,
            };
        }

        // 2. Check Business Availability (Calendar)
        const availability = await this.schedulingService.evaluate({
            targetType: BindingTargetType.BUSINESS,
            targetId: businessId,
            timestamp: context.timestamp,
            timezone: 'Africa/Nairobi', // Default for now
            operationType: 'ORDER_PLACEMENT',
            workspaceId: context.workspaceId,
        });

        if (!availability.allowed) {
            return {
                allowed: false,
                reason: `Business is currently closed: ${availability.reason}`,
                suggestedReschedule: availability.suggestedReschedule,
            };
        }

        // 2. Check Customer & Order Policy (Abuse/Fraud/Limits)
        const policyResult = await this.policyEngine.evaluate({
            trigger: PolicyTrigger.ORDER_PLACEMENT,
            workspaceId: context.workspaceId,
            businessId: businessId,
            timestamp: context.timestamp,
            metadata: {
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phoneNumber: customer.phoneNumber,
                    cancellationRate: customer.metadata && typeof customer.metadata.cancellationRate === 'number'
                        ? customer.metadata.cancellationRate
                        : 0,
                },
                order: {
                    totalAmount: context.totalAmount,
                    itemCount: context.items.length,
                }
            }
        });

        if (policyResult.finalDecision.effect === PolicyEffect.BLOCK) {
            return {
                allowed: false,
                reason: `Order blocked by policy: ${policyResult.finalDecision.reason}`,
            };
        }

        return {
            allowed: true,
            reason: 'All commerce checks passed',
            modifications: policyResult.finalDecision.modifications,
        };
    }
}
