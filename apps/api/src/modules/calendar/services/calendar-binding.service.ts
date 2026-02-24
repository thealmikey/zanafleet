import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BindingTargetType,
  CalendarScope,
  CalendarBindingResponse,
  CalendarOverrideResponse,
  CreateCalendarBindingInput,
  CreateCalendarOverrideInput,
} from '@zanafleet/contracts';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CalendarBindingEntity } from '../entities/calendar-binding.entity';
import { CalendarOverrideEntity } from '../entities/calendar-override.entity';
import { CalendarRepository } from '../repositories/calendar.repository';

/**
 * Resolved calendar binding with calendar details.
 */
export interface ResolvedBinding {
  binding: CalendarBindingResponse;
  inheritanceLevel: number;
  effectivePriority: number;
}

/**
 * Context for resolving effective calendars with inheritance.
 */
export interface InheritanceContext {
  workspaceId?: string;
  businessId?: string;
  saccoId?: string;
  riderId?: string;
}

/**
 * CalendarBindingService
 * Manages calendar bindings to domain entities and overrides.
 * Implements inheritance resolution following the scope hierarchy:
 * GLOBAL < NATIONAL < SACCO < BUSINESS < RIDER
 */
@Injectable()
export class CalendarBindingService {
  private readonly logger = new Logger(CalendarBindingService.name);

  constructor(
    private readonly calendarRepository: CalendarRepository,
    @InjectRepository(CalendarBindingEntity)
    private readonly bindingRepo: Repository<CalendarBindingEntity>,
    @InjectRepository(CalendarOverrideEntity)
    private readonly overrideRepo: Repository<CalendarOverrideEntity>
  ) {}

  /**
   * Bind a calendar to a target entity.
   * @param input Binding creation input
   */
  async bindCalendar(input: CreateCalendarBindingInput): Promise<CalendarBindingResponse> {
    const calendar = await this.calendarRepository.findById(input.calendarId);
    if (!calendar) {
      throw new NotFoundException(`Calendar not found: ${input.calendarId}`);
    }

    const now = new Date();
    const entity = CalendarBindingEntity.fromDomain({
      bindingId: uuidv4(),
      calendarId: input.calendarId,
      targetType: input.targetType,
      targetId: input.targetId,
      priority: input.priority,
      inheritParent: input.inheritParent,
      createdAt: now,
    });

    const saved = await this.bindingRepo.save(entity);
    this.logger.log(`Bound calendar ${input.calendarId} to ${input.targetType}:${input.targetId}`);
    return this.toBindingResponse(saved);
  }

  /**
   * Remove a calendar binding.
   * @param bindingId The binding ID to remove
   */
  async unbindCalendar(bindingId: string): Promise<void> {
    const binding = await this.bindingRepo.findOne({ where: { id: bindingId } });
    if (!binding) {
      throw new NotFoundException(`Binding not found: ${bindingId}`);
    }

    await this.bindingRepo.delete(bindingId);
    this.logger.log(`Removed binding: ${bindingId}`);
  }

  /**
   * Get all calendar bindings for a specific target entity.
   * @param targetType The target entity type
   * @param targetId The target entity ID
   */
  async getBindingsForTarget(
    targetType: BindingTargetType,
    targetId: string
  ): Promise<CalendarBindingResponse[]> {
    const bindings = await this.bindingRepo.find({
      where: { targetType, targetId, isActive: true },
      order: { priority: 'DESC' },
    });

    return bindings.map((b) => this.toBindingResponse(b));
  }

  /**
   * Resolve effective calendars for a target with inheritance.
   * Inheritance follows the scope hierarchy: GLOBAL → NATIONAL → SACCO → BUSINESS → RIDER
   * Higher levels are inherited unless inheritParent is false.
   *
   * @param targetType The primary target type
   * @param targetId The primary target ID
   * @param context Additional context for inheritance resolution
   */
  async resolveEffectiveCalendars(
    targetType: BindingTargetType,
    targetId: string,
    context: InheritanceContext = {}
  ): Promise<ResolvedBinding[]> {
    const resolvedBindings: ResolvedBinding[] = [];
    const inheritanceChain = this.buildInheritanceChain(targetType, targetId, context);

    let shouldInherit = true;
    for (let level = 0; level < inheritanceChain.length; level++) {
      const { type, id } = inheritanceChain[level];

      if (!shouldInherit && level > 0) {
        break;
      }

      const bindings = await this.bindingRepo.find({
        where: { targetType: type, targetId: id, isActive: true },
        order: { priority: 'DESC' },
      });

      for (const binding of bindings) {
        const effectivePriority = this.calculateEffectivePriority(binding.priority, level);

        resolvedBindings.push({
          binding: this.toBindingResponse(binding),
          inheritanceLevel: level,
          effectivePriority,
        });

        if (!binding.inheritParent) {
          shouldInherit = false;
        }
      }
    }

    return resolvedBindings.sort((a, b) => b.effectivePriority - a.effectivePriority);
  }

  /**
   * Get active overrides for a target scope at a specific time.
   * @param targetScope The target scope
   * @param targetScopeId The target scope ID (nullable for GLOBAL)
   * @param atTime The time to check for active overrides
   */
  async getActiveOverrides(
    targetScope: CalendarScope,
    targetScopeId: string | null,
    atTime: Date = new Date()
  ): Promise<CalendarOverrideResponse[]> {
    const qb = this.overrideRepo
      .createQueryBuilder('override')
      .where('override.isActive = :isActive', { isActive: true })
      .andWhere('override.targetScope = :targetScope', { targetScope })
      .andWhere('override.validFrom <= :atTime', { atTime })
      .andWhere('override.validUntil >= :atTime', { atTime });

    if (targetScopeId !== null) {
      qb.andWhere('override.targetScopeId = :targetScopeId', { targetScopeId });
    } else {
      qb.andWhere('override.targetScopeId IS NULL');
    }

    const overrides = await qb.orderBy('override.priority', 'DESC').getMany();

    return overrides.map((o) => this.toOverrideResponse(o));
  }

  /**
   * Get all active overrides applicable to a context with inheritance.
   * Collects overrides from all relevant scopes in the hierarchy.
   * @param context The inheritance context
   * @param atTime The time to check for active overrides
   */
  async getActiveOverridesWithInheritance(
    context: InheritanceContext,
    atTime: Date = new Date()
  ): Promise<CalendarOverrideResponse[]> {
    const allOverrides: CalendarOverrideResponse[] = [];

    const globalOverrides = await this.getActiveOverrides(CalendarScope.GLOBAL, null, atTime);
    allOverrides.push(...globalOverrides);

    if (context.workspaceId) {
      const workspaceOverrides = await this.getActiveOverrides(
        CalendarScope.NATIONAL,
        context.workspaceId,
        atTime
      );
      allOverrides.push(...workspaceOverrides);
    }

    if (context.saccoId) {
      const saccoOverrides = await this.getActiveOverrides(
        CalendarScope.SACCO,
        context.saccoId,
        atTime
      );
      allOverrides.push(...saccoOverrides);
    }

    if (context.businessId) {
      const businessOverrides = await this.getActiveOverrides(
        CalendarScope.BUSINESS,
        context.businessId,
        atTime
      );
      allOverrides.push(...businessOverrides);
    }

    if (context.riderId) {
      const riderOverrides = await this.getActiveOverrides(
        CalendarScope.RIDER,
        context.riderId,
        atTime
      );
      allOverrides.push(...riderOverrides);
    }

    return allOverrides.sort((a, b) => {
      const scopeDiff = this.scopePriority(b.targetScope) - this.scopePriority(a.targetScope);
      if (scopeDiff !== 0) return scopeDiff;
      return b.priority - a.priority;
    });
  }

  /**
   * Apply a calendar override.
   * @param input Override creation input
   */
  async applyOverride(input: CreateCalendarOverrideInput): Promise<CalendarOverrideResponse> {
    const now = new Date();
    const entity = CalendarOverrideEntity.fromDomain({
      overrideId: uuidv4(),
      targetScope: input.targetScope,
      targetScopeId: input.targetScopeId,
      exceptionType: input.exceptionType,
      reason: input.reason,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      isActive: input.isActive,
      createdAt: now,
    });

    const saved = await this.overrideRepo.save(entity);
    this.logger.log(
      `Applied override ${saved.id} (${input.exceptionType}) to ${input.targetScope}:${
        input.targetScopeId ?? 'GLOBAL'
      }`
    );
    return this.toOverrideResponse(saved);
  }

  /**
   * Deactivate an override.
   * @param overrideId The override ID to deactivate
   */
  async deactivateOverride(overrideId: string): Promise<void> {
    const override = await this.overrideRepo.findOne({ where: { id: overrideId } });
    if (!override) {
      throw new NotFoundException(`Override not found: ${overrideId}`);
    }

    override.isActive = false;
    await this.overrideRepo.save(override);
    this.logger.log(`Deactivated override: ${overrideId}`);
  }

  /**
   * Build the inheritance chain for a target.
   * More specific targets come first (level 0), broader scopes follow.
   */
  private buildInheritanceChain(
    targetType: BindingTargetType,
    targetId: string,
    context: InheritanceContext
  ): Array<{ type: BindingTargetType; id: string }> {
    const chain: Array<{ type: BindingTargetType; id: string }> = [];

    chain.push({ type: targetType, id: targetId });

    switch (targetType) {
      case BindingTargetType.RIDER:
        if (context.saccoId) {
          chain.push({ type: BindingTargetType.SACCO, id: context.saccoId });
        }
        if (context.businessId) {
          chain.push({ type: BindingTargetType.BUSINESS, id: context.businessId });
        }
        if (context.workspaceId) {
          chain.push({ type: BindingTargetType.WORKSPACE, id: context.workspaceId });
        }
        break;

      case BindingTargetType.BUSINESS:
        if (context.saccoId) {
          chain.push({ type: BindingTargetType.SACCO, id: context.saccoId });
        }
        if (context.workspaceId) {
          chain.push({ type: BindingTargetType.WORKSPACE, id: context.workspaceId });
        }
        break;

      case BindingTargetType.SACCO:
        if (context.workspaceId) {
          chain.push({ type: BindingTargetType.WORKSPACE, id: context.workspaceId });
        }
        break;

      case BindingTargetType.WORKSPACE:
        break;
    }

    return chain;
  }

  /**
   * Calculate effective priority considering inheritance level.
   * Higher inheritance levels (more specific) get priority boost.
   */
  private calculateEffectivePriority(basePriority: number, inheritanceLevel: number): number {
    const levelBoost = (10 - inheritanceLevel) * 1000;
    return levelBoost + basePriority;
  }

  /**
   * Get scope priority for sorting (higher = more specific).
   * Mirrors PolicyEvaluationEngineService.scopePriority().
   */
  private scopePriority(scope: CalendarScope): number {
    switch (scope) {
      case CalendarScope.GLOBAL:
        return 0;
      case CalendarScope.NATIONAL:
        return 1;
      case CalendarScope.SACCO:
        return 2;
      case CalendarScope.BUSINESS:
        return 3;
      case CalendarScope.RIDER:
        return 4;
      default:
        return 0;
    }
  }

  private toBindingResponse(entity: CalendarBindingEntity): CalendarBindingResponse {
    const domain = entity.toDomain();
    return {
      bindingId: domain.bindingId,
      calendarId: domain.calendarId,
      targetType: domain.targetType,
      targetId: domain.targetId,
      priority: domain.priority,
      inheritParent: domain.inheritParent,
    };
  }

  private toOverrideResponse(entity: CalendarOverrideEntity): CalendarOverrideResponse {
    const domain = entity.toDomain();
    return {
      overrideId: domain.overrideId,
      targetScope: domain.targetScope,
      targetScopeId: domain.targetScopeId,
      exceptionType: domain.exceptionType,
      reason: domain.reason,
      validFrom: domain.validFrom,
      validUntil: domain.validUntil,
      priority: domain.priority,
      isActive: domain.isActive,
    };
  }
}
