import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  mixin,
  Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PolicyEffect, PolicyTrigger } from '@zanafleet/contracts';

import { EvaluationContext } from '../../../modules/policy/dto/policy.types';
import { PolicyEvaluationEngineService } from '../../../modules/policy/services/policy-evaluation-engine.service';

/**
 * Options for configuring the PolicyGuard.
 */
export interface PolicyGuardOptions {
  /** The policy trigger that initiates evaluation */
  trigger: PolicyTrigger;
  /** Whether to allow the request if policy evaluation fails. Defaults to true. */
  failOpen?: boolean;
  /** Optional function to build additional context from the request */
  buildContext?: (request: PolicyGuardRequest) => Partial<EvaluationContext>;
}

/**
 * Request shape expected by PolicyGuard
 */
export interface PolicyGuardRequest {
  user?: {
    actorId?: string;
    workspaceId?: string;
  };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  policyDecision?: unknown;
}

/**
 * PolicyGuard Factory
 *
 * Creates a NestJS Guard that evaluates policies before allowing route access.
 * Use this for mutating endpoints where policy-based authorization is required.
 *
 * Usage:
 * ```typescript
 * @Post('deliveries')
 * @UseGuards(AuthGuard, PolicyGuard({ trigger: PolicyTrigger.DELIVERY_CREATION }))
 * createDelivery() { ... }
 *
 * @Post('riders/:riderId/assign')
 * @UseGuards(AuthGuard, PolicyGuard({
 *   trigger: PolicyTrigger.RIDER_ASSIGNMENT,
 *   buildContext: (req) => ({ riderId: req.params.riderId }),
 * }))
 * assignRider() { ... }
 * ```
 *
 * The guard:
 * 1. Builds an EvaluationContext from the request
 * 2. Calls PolicyEvaluationEngineService.evaluate()
 * 3. Throws ForbiddenException if effect is BLOCK or REQUIRE_APPROVAL
 * 4. Attaches the policy decision to request.policyDecision for downstream use
 *
 * @param options - Configuration options for the guard
 * @returns A NestJS Guard class
 */
export function PolicyGuard(options: PolicyGuardOptions): Type<CanActivate> {
  @Injectable()
  class PolicyGuardMixin implements CanActivate {
    private readonly logger = new Logger(`PolicyGuard[${options.trigger}]`);
    private policyEvaluationEngine: PolicyEvaluationEngineService | null = null;

    constructor(private readonly moduleRef: ModuleRef) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<PolicyGuardRequest>();
      const user = request.user;

      if (!user?.workspaceId) {
        this.logger.warn('PolicyGuard: No authenticated user with workspaceId found');
        throw new ForbiddenException('Authentication required');
      }

      if (!this.policyEvaluationEngine) {
        try {
          this.policyEvaluationEngine = this.moduleRef.get(PolicyEvaluationEngineService, {
            strict: false,
          });
        } catch {
          this.logger.error('PolicyGuard: PolicyEvaluationEngineService not available');
          if (options.failOpen === false) {
            throw new ForbiddenException('Policy evaluation service unavailable');
          }
          return true;
        }
      }

      const policyEngine = this.policyEvaluationEngine;
      if (!policyEngine) {
        this.logger.error('PolicyGuard: PolicyEvaluationEngineService is null after resolution');
        if (options.failOpen === false) {
          throw new ForbiddenException('Policy evaluation service unavailable');
        }
        return true;
      }

      const baseContext: EvaluationContext = {
        trigger: options.trigger,
        workspaceId: user.workspaceId,
        actorId: user.actorId,
        timestamp: new Date(),
      };

      const additionalContext = options.buildContext ? options.buildContext(request) : {};

      const evaluationContext: EvaluationContext = {
        ...baseContext,
        ...additionalContext,
      };

      try {
        const result = await policyEngine.evaluate(evaluationContext, {
          failOpen: options.failOpen ?? true,
        });

        if (result.finalDecision.effect === PolicyEffect.BLOCK) {
          this.logger.debug(
            `PolicyGuard: Request blocked by policy ${result.finalDecision.policyId}: ${result.finalDecision.reason}`
          );
          throw new ForbiddenException(result.finalDecision.reason);
        }

        if (result.finalDecision.effect === PolicyEffect.REQUIRE_APPROVAL) {
          this.logger.debug(
            `PolicyGuard: Request requires approval per policy ${result.finalDecision.policyId}`
          );
          throw new ForbiddenException(`Approval required: ${result.finalDecision.reason}`);
        }

        request.policyDecision = result.finalDecision;

        this.logger.debug(
          `PolicyGuard: Request allowed with effect ${result.finalDecision.effect} (${result.processingTimeMs}ms)`
        );

        return true;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }

        this.logger.error(
          `PolicyGuard: Evaluation error: ${error instanceof Error ? error.message : String(error)}`
        );

        if (options.failOpen === false) {
          throw new ForbiddenException('Policy evaluation failed');
        }

        return true;
      }
    }
  }

  return mixin(PolicyGuardMixin);
}
