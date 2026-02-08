import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  BindingTargetType,
  CalendarScope,
  CreateCalendarBindingInput,
  CreateCalendarOverrideInput,
} from '@zanafleet/contracts';
import { CalendarBindingService } from '../../services/calendar-binding.service';
import { CalendarRepository } from '../../repositories/calendar.repository';
import { CalendarBindingEntity } from '../../entities/calendar-binding.entity';
import { CalendarOverrideEntity } from '../../entities/calendar-override.entity';
import { CalendarEntity } from '../../entities/calendar.entity';

describe('CalendarBindingService', () => {
  let service: CalendarBindingService;
  let calendarRepository: jest.Mocked<CalendarRepository>;
  let bindingRepo: jest.Mocked<Repository<CalendarBindingEntity>>;
  let overrideRepo: jest.Mocked<Repository<CalendarOverrideEntity>>;

  const now = new Date('2024-06-15T12:00:00Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    calendarRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findByOwnerScope: jest.fn(),
      findActiveCalendars: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CalendarRepository>;

    bindingRepo = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<CalendarBindingEntity>>;

    overrideRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<CalendarOverrideEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarBindingService,
        {
          provide: CalendarRepository,
          useValue: calendarRepository,
        },
        {
          provide: getRepositoryToken(CalendarBindingEntity),
          useValue: bindingRepo,
        },
        {
          provide: getRepositoryToken(CalendarOverrideEntity),
          useValue: overrideRepo,
        },
      ],
    }).compile();

    service = module.get<CalendarBindingService>(CalendarBindingService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('bindCalendar', () => {
    it('should create a binding between calendar and target', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Business Hours',
        timezone: 'Africa/Nairobi',
        ownerScope: CalendarScope.BUSINESS,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      bindingRepo.save.mockImplementation(async (entity) => entity as CalendarBindingEntity);

      const input: CreateCalendarBindingInput = {
        calendarId: 'calendar-uuid',
        targetType: BindingTargetType.BUSINESS,
        targetId: 'business-uuid',
        priority: 10,
      };

      const result = await service.bindCalendar(input);

      expect(result.calendarId).toBe('calendar-uuid');
      expect(result.targetType).toBe(BindingTargetType.BUSINESS);
      expect(result.targetId).toBe('business-uuid');
      expect(result.priority).toBe(10);
      expect(result.inheritParent).toBe(true);
      expect(result.bindingId).toBeDefined();
      expect(calendarRepository.findById).toHaveBeenCalledWith('calendar-uuid');
      expect(bindingRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      const input: CreateCalendarBindingInput = {
        calendarId: 'non-existent',
        targetType: BindingTargetType.BUSINESS,
        targetId: 'business-uuid',
      };

      await expect(service.bindCalendar(input)).rejects.toThrow(NotFoundException);
      await expect(service.bindCalendar(input)).rejects.toThrow(
        'Calendar not found: non-existent',
      );
    });

    it('should use default values for optional fields', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Test Calendar',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      bindingRepo.save.mockImplementation(async (entity) => entity as CalendarBindingEntity);

      const input: CreateCalendarBindingInput = {
        calendarId: 'calendar-uuid',
        targetType: BindingTargetType.WORKSPACE,
        targetId: 'workspace-uuid',
      };

      const result = await service.bindCalendar(input);

      expect(result.priority).toBe(0);
      expect(result.inheritParent).toBe(true);
    });
  });

  describe('unbindCalendar', () => {
    it('should remove a binding', async () => {
      const binding = CalendarBindingEntity.fromDomain({
        bindingId: 'binding-uuid',
        calendarId: 'calendar-uuid',
        targetType: BindingTargetType.BUSINESS,
        targetId: 'business-uuid',
        createdAt: now,
      });

      bindingRepo.findOne.mockResolvedValue(binding);

      await service.unbindCalendar('binding-uuid');

      expect(bindingRepo.findOne).toHaveBeenCalledWith({ where: { id: 'binding-uuid' } });
      expect(bindingRepo.delete).toHaveBeenCalledWith('binding-uuid');
    });

    it('should throw NotFoundException when binding not found', async () => {
      bindingRepo.findOne.mockResolvedValue(null);

      await expect(service.unbindCalendar('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBindingsForTarget', () => {
    it('should return bindings for a specific target', async () => {
      const bindings = [
        CalendarBindingEntity.fromDomain({
          bindingId: 'binding-1',
          calendarId: 'calendar-1',
          targetType: BindingTargetType.BUSINESS,
          targetId: 'business-uuid',
          priority: 10,
          createdAt: now,
        }),
        CalendarBindingEntity.fromDomain({
          bindingId: 'binding-2',
          calendarId: 'calendar-2',
          targetType: BindingTargetType.BUSINESS,
          targetId: 'business-uuid',
          priority: 5,
          createdAt: now,
        }),
      ];

      bindingRepo.find.mockResolvedValue(bindings);

      const result = await service.getBindingsForTarget(
        BindingTargetType.BUSINESS,
        'business-uuid',
      );

      expect(result).toHaveLength(2);
      expect(result[0].bindingId).toBe('binding-1');
      expect(result[1].bindingId).toBe('binding-2');
      expect(bindingRepo.find).toHaveBeenCalledWith({
        where: { targetType: BindingTargetType.BUSINESS, targetId: 'business-uuid', isActive: true },
        order: { priority: 'DESC' },
      });
    });

    it('should return empty array when no bindings exist', async () => {
      bindingRepo.find.mockResolvedValue([]);

      const result = await service.getBindingsForTarget(
        BindingTargetType.RIDER,
        'rider-uuid',
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('resolveEffectiveCalendars', () => {
    it('should resolve calendars for a rider with inheritance', async () => {
      const riderBinding = CalendarBindingEntity.fromDomain({
        bindingId: 'rider-binding',
        calendarId: 'rider-calendar',
        targetType: BindingTargetType.RIDER,
        targetId: 'rider-uuid',
        priority: 10,
        inheritParent: true,
        createdAt: now,
      });

      const saccoBinding = CalendarBindingEntity.fromDomain({
        bindingId: 'sacco-binding',
        calendarId: 'sacco-calendar',
        targetType: BindingTargetType.SACCO,
        targetId: 'sacco-uuid',
        priority: 5,
        inheritParent: true,
        createdAt: now,
      });

      bindingRepo.find
        .mockResolvedValueOnce([riderBinding])
        .mockResolvedValueOnce([saccoBinding])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.resolveEffectiveCalendars(
        BindingTargetType.RIDER,
        'rider-uuid',
        { saccoId: 'sacco-uuid', businessId: 'business-uuid', workspaceId: 'workspace-uuid' },
      );

      expect(result).toHaveLength(2);
      expect(result[0].binding.calendarId).toBe('rider-calendar');
      expect(result[0].inheritanceLevel).toBe(0);
      expect(result[1].binding.calendarId).toBe('sacco-calendar');
      expect(result[1].inheritanceLevel).toBe(1);
    });

    it('should stop inheritance when inheritParent is false', async () => {
      const riderBinding = CalendarBindingEntity.fromDomain({
        bindingId: 'rider-binding',
        calendarId: 'rider-calendar',
        targetType: BindingTargetType.RIDER,
        targetId: 'rider-uuid',
        priority: 10,
        inheritParent: false,
        createdAt: now,
      });

      const saccoBinding = CalendarBindingEntity.fromDomain({
        bindingId: 'sacco-binding',
        calendarId: 'sacco-calendar',
        targetType: BindingTargetType.SACCO,
        targetId: 'sacco-uuid',
        priority: 5,
        inheritParent: true,
        createdAt: now,
      });

      bindingRepo.find
        .mockResolvedValueOnce([riderBinding])
        .mockResolvedValueOnce([saccoBinding]);

      const result = await service.resolveEffectiveCalendars(
        BindingTargetType.RIDER,
        'rider-uuid',
        { saccoId: 'sacco-uuid' },
      );

      expect(result).toHaveLength(1);
      expect(result[0].binding.calendarId).toBe('rider-calendar');
    });

    it('should sort by effective priority (level + base priority)', async () => {
      const workspaceBinding = CalendarBindingEntity.fromDomain({
        bindingId: 'workspace-binding',
        calendarId: 'workspace-calendar',
        targetType: BindingTargetType.WORKSPACE,
        targetId: 'workspace-uuid',
        priority: 100,
        inheritParent: true,
        createdAt: now,
      });

      const businessBinding = CalendarBindingEntity.fromDomain({
        bindingId: 'business-binding',
        calendarId: 'business-calendar',
        targetType: BindingTargetType.BUSINESS,
        targetId: 'business-uuid',
        priority: 5,
        inheritParent: true,
        createdAt: now,
      });

      bindingRepo.find
        .mockResolvedValueOnce([businessBinding])
        .mockResolvedValueOnce([workspaceBinding]);

      const result = await service.resolveEffectiveCalendars(
        BindingTargetType.BUSINESS,
        'business-uuid',
        { workspaceId: 'workspace-uuid' },
      );

      expect(result).toHaveLength(2);
      expect(result[0].binding.calendarId).toBe('business-calendar');
      expect(result[0].effectivePriority).toBeGreaterThan(result[1].effectivePriority);
    });
  });

  describe('getActiveOverrides', () => {
    it('should return active overrides for a scope at a specific time', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          CalendarOverrideEntity.fromDomain({
            overrideId: 'override-uuid',
            targetScope: CalendarScope.BUSINESS,
            targetScopeId: 'business-uuid',
            exceptionType: 'ALLOW_ON_HOLIDAY',
            validFrom: new Date('2024-06-01'),
            validUntil: new Date('2024-06-30'),
            priority: 100,
            createdAt: now,
          }),
        ]),
      };

      overrideRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getActiveOverrides(
        CalendarScope.BUSINESS,
        'business-uuid',
        now,
      );

      expect(result).toHaveLength(1);
      expect(result[0].exceptionType).toBe('ALLOW_ON_HOLIDAY');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('override.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should handle GLOBAL scope with null targetScopeId', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      overrideRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getActiveOverrides(CalendarScope.GLOBAL, null, now);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'override.targetScopeId IS NULL',
      );
    });
  });

  describe('applyOverride', () => {
    it('should create a new override', async () => {
      overrideRepo.save.mockImplementation(async (entity) => entity as CalendarOverrideEntity);

      const input: CreateCalendarOverrideInput = {
        targetScope: CalendarScope.BUSINESS,
        targetScopeId: 'business-uuid',
        exceptionType: 'ALLOW_ON_HOLIDAY',
        reason: 'Premium merchant',
        validFrom: new Date('2024-12-24'),
        validUntil: new Date('2024-12-26'),
        priority: 100,
      };

      const result = await service.applyOverride(input);

      expect(result.targetScope).toBe(CalendarScope.BUSINESS);
      expect(result.targetScopeId).toBe('business-uuid');
      expect(result.exceptionType).toBe('ALLOW_ON_HOLIDAY');
      expect(result.reason).toBe('Premium merchant');
      expect(result.overrideId).toBeDefined();
      expect(overrideRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should use default values for optional fields', async () => {
      overrideRepo.save.mockImplementation(async (entity) => entity as CalendarOverrideEntity);

      const input: CreateCalendarOverrideInput = {
        targetScope: CalendarScope.GLOBAL,
        exceptionType: 'EMERGENCY_OPEN',
        validFrom: new Date('2024-12-25'),
        validUntil: new Date('2024-12-25'),
      };

      const result = await service.applyOverride(input);

      expect(result.targetScopeId).toBeNull();
      expect(result.reason).toBeNull();
      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivateOverride', () => {
    it('should deactivate an override', async () => {
      const override = CalendarOverrideEntity.fromDomain({
        overrideId: 'override-uuid',
        targetScope: CalendarScope.BUSINESS,
        targetScopeId: 'business-uuid',
        exceptionType: 'ALLOW_ON_HOLIDAY',
        validFrom: new Date('2024-12-24'),
        validUntil: new Date('2024-12-26'),
        isActive: true,
        createdAt: now,
      });

      overrideRepo.findOne.mockResolvedValue(override);
      overrideRepo.save.mockImplementation(async (entity) => entity as CalendarOverrideEntity);

      await service.deactivateOverride('override-uuid');

      expect(overrideRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw NotFoundException when override not found', async () => {
      overrideRepo.findOne.mockResolvedValue(null);

      await expect(service.deactivateOverride('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Priority Resolution Model', () => {
    it('should verify scope priority hierarchy: GLOBAL < NATIONAL < SACCO < BUSINESS < RIDER', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      overrideRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const overrides = await service.getActiveOverridesWithInheritance(
        {
          workspaceId: 'workspace-uuid',
          saccoId: 'sacco-uuid',
          businessId: 'business-uuid',
          riderId: 'rider-uuid',
        },
        now,
      );

      expect(overrides).toHaveLength(0);
      expect(overrideRepo.createQueryBuilder).toHaveBeenCalledTimes(5);
    });
  });
});
