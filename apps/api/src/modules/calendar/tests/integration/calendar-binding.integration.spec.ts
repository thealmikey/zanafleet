import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  BindingTargetType,
  CalendarScope,
} from '@zanafleet/contracts';
import { CalendarModule } from '../../calendar.module';
import { CalendarBindingService } from '../../services/calendar-binding.service';
import { CalendarRepository } from '../../repositories/calendar.repository';
import { CalendarEntity } from '../../entities/calendar.entity';

const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

(shouldRunIntegration ? describe : describe.skip)(
  'CalendarBindingService Integration',
  () => {
    let module: TestingModule;
    let calendarBindingService: CalendarBindingService;
    let calendarRepository: CalendarRepository;

    // Test IDs
    const workspaceId = uuidv4();
    const saccoId = uuidv4();
    const businessId = uuidv4();
    const riderId = uuidv4();

    // Calendar IDs
    let workspaceCalendarId: string;
    let saccoCalendarId: string;
    let businessCalendarId: string;
    let riderCalendarId: string;

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'zanafleet_test',
            autoLoadEntities: true,
            synchronize: true,
          }),
          CalendarModule,
        ],
      }).compile();

      calendarBindingService = module.get<CalendarBindingService>(CalendarBindingService);
      calendarRepository = module.get<CalendarRepository>(CalendarRepository);

      // Create test calendars at different scope levels
      const now = new Date();

      const workspaceCalendar = CalendarEntity.fromDomain({
        calendarId: uuidv4(),
        name: `Workspace Calendar ${uuidv4().slice(0, 8)}`,
        timezone: 'UTC',
        ownerScope: CalendarScope.NATIONAL,
        ownerScopeId: workspaceId,
        createdAt: now,
      });
      const savedWorkspaceCalendar = await calendarRepository.save(workspaceCalendar);
      workspaceCalendarId = savedWorkspaceCalendar.id;

      const saccoCalendar = CalendarEntity.fromDomain({
        calendarId: uuidv4(),
        name: `Sacco Calendar ${uuidv4().slice(0, 8)}`,
        timezone: 'Africa/Nairobi',
        ownerScope: CalendarScope.SACCO,
        ownerScopeId: saccoId,
        createdAt: now,
      });
      const savedSaccoCalendar = await calendarRepository.save(saccoCalendar);
      saccoCalendarId = savedSaccoCalendar.id;

      const businessCalendar = CalendarEntity.fromDomain({
        calendarId: uuidv4(),
        name: `Business Calendar ${uuidv4().slice(0, 8)}`,
        timezone: 'Africa/Nairobi',
        ownerScope: CalendarScope.BUSINESS,
        ownerScopeId: businessId,
        createdAt: now,
      });
      const savedBusinessCalendar = await calendarRepository.save(businessCalendar);
      businessCalendarId = savedBusinessCalendar.id;

      const riderCalendar = CalendarEntity.fromDomain({
        calendarId: uuidv4(),
        name: `Rider Calendar ${uuidv4().slice(0, 8)}`,
        timezone: 'Africa/Nairobi',
        ownerScope: CalendarScope.RIDER,
        ownerScopeId: riderId,
        createdAt: now,
      });
      const savedRiderCalendar = await calendarRepository.save(riderCalendar);
      riderCalendarId = savedRiderCalendar.id;
    });

    afterAll(async () => {
      if (module) {
        await module.close();
      }
    });

    describe('resolveEffectiveCalendars with inheritance', () => {
      beforeAll(async () => {
        // Bind calendars at each level with inheritParent=true
        await calendarBindingService.bindCalendar({
          calendarId: workspaceCalendarId,
          targetType: BindingTargetType.WORKSPACE,
          targetId: workspaceId,
          priority: 10,
          inheritParent: true,
        });

        await calendarBindingService.bindCalendar({
          calendarId: saccoCalendarId,
          targetType: BindingTargetType.SACCO,
          targetId: saccoId,
          priority: 20,
          inheritParent: true,
        });

        await calendarBindingService.bindCalendar({
          calendarId: businessCalendarId,
          targetType: BindingTargetType.BUSINESS,
          targetId: businessId,
          priority: 30,
          inheritParent: true,
        });

        await calendarBindingService.bindCalendar({
          calendarId: riderCalendarId,
          targetType: BindingTargetType.RIDER,
          targetId: riderId,
          priority: 40,
          inheritParent: true,
        });
      });

      it('should resolve rider calendars with full inheritance chain', async () => {
        const result = await calendarBindingService.resolveEffectiveCalendars(
          BindingTargetType.RIDER,
          riderId,
          {
            workspaceId,
            saccoId,
            businessId,
            riderId,
          },
        );

        // Should include all 4 calendars from the inheritance chain
        expect(result.length).toBe(4);

        // Verify order: rider (level 0) > sacco (level 1) > business (level 2) > workspace (level 3)
        // Sorted by effectivePriority descending
        expect(result[0].binding.calendarId).toBe(riderCalendarId);
        expect(result[0].inheritanceLevel).toBe(0);

        expect(result[1].binding.calendarId).toBe(saccoCalendarId);
        expect(result[1].inheritanceLevel).toBe(1);

        expect(result[2].binding.calendarId).toBe(businessCalendarId);
        expect(result[2].inheritanceLevel).toBe(2);

        expect(result[3].binding.calendarId).toBe(workspaceCalendarId);
        expect(result[3].inheritanceLevel).toBe(3);
      });

      it('should resolve business calendars with partial inheritance', async () => {
        const result = await calendarBindingService.resolveEffectiveCalendars(
          BindingTargetType.BUSINESS,
          businessId,
          {
            workspaceId,
            saccoId,
            businessId,
          },
        );

        // Should include business, sacco, and workspace calendars
        expect(result.length).toBe(3);

        expect(result[0].binding.calendarId).toBe(businessCalendarId);
        expect(result[0].inheritanceLevel).toBe(0);

        expect(result[1].binding.calendarId).toBe(saccoCalendarId);
        expect(result[1].inheritanceLevel).toBe(1);

        expect(result[2].binding.calendarId).toBe(workspaceCalendarId);
        expect(result[2].inheritanceLevel).toBe(2);
      });

      it('should calculate effective priority correctly', async () => {
        const result = await calendarBindingService.resolveEffectiveCalendars(
          BindingTargetType.RIDER,
          riderId,
          {
            workspaceId,
            saccoId,
            businessId,
            riderId,
          },
        );

        // Effective priority = (10 - inheritanceLevel) * 1000 + basePriority
        // Level 0: (10-0)*1000 + 40 = 10040
        // Level 1: (10-1)*1000 + 20 = 9020
        // Level 2: (10-2)*1000 + 30 = 8030
        // Level 3: (10-3)*1000 + 10 = 7010
        expect(result[0].effectivePriority).toBe(10040);
        expect(result[1].effectivePriority).toBe(9020);
        expect(result[2].effectivePriority).toBe(8030);
        expect(result[3].effectivePriority).toBe(7010);
      });
    });

    describe('resolveEffectiveCalendars with inheritParent=false cutoff', () => {
      let cutoffBusinessId: string;
      let cutoffBusinessCalendarId: string;
      let cutoffRiderId: string;
      let cutoffRiderCalendarId: string;

      beforeAll(async () => {
        const now = new Date();

        // Create new business and rider for this test scenario
        cutoffBusinessId = uuidv4();
        cutoffRiderId = uuidv4();

        // Create calendars for cutoff test
        const cutoffBusinessCalendar = CalendarEntity.fromDomain({
          calendarId: uuidv4(),
          name: `Cutoff Business Calendar ${uuidv4().slice(0, 8)}`,
          timezone: 'Africa/Nairobi',
          ownerScope: CalendarScope.BUSINESS,
          ownerScopeId: cutoffBusinessId,
          createdAt: now,
        });
        const savedCutoffBusinessCalendar = await calendarRepository.save(cutoffBusinessCalendar);
        cutoffBusinessCalendarId = savedCutoffBusinessCalendar.id;

        const cutoffRiderCalendar = CalendarEntity.fromDomain({
          calendarId: uuidv4(),
          name: `Cutoff Rider Calendar ${uuidv4().slice(0, 8)}`,
          timezone: 'Africa/Nairobi',
          ownerScope: CalendarScope.RIDER,
          ownerScopeId: cutoffRiderId,
          createdAt: now,
        });
        const savedCutoffRiderCalendar = await calendarRepository.save(cutoffRiderCalendar);
        cutoffRiderCalendarId = savedCutoffRiderCalendar.id;

        // Bind business calendar with inheritParent=false to stop inheritance
        await calendarBindingService.bindCalendar({
          calendarId: cutoffBusinessCalendarId,
          targetType: BindingTargetType.BUSINESS,
          targetId: cutoffBusinessId,
          priority: 50,
          inheritParent: false, // This should stop inheritance at business level
        });

        // Bind rider calendar with inheritParent=true
        await calendarBindingService.bindCalendar({
          calendarId: cutoffRiderCalendarId,
          targetType: BindingTargetType.RIDER,
          targetId: cutoffRiderId,
          priority: 60,
          inheritParent: true,
        });

        // Also bind workspace calendar to cutoff workspace
        await calendarBindingService.bindCalendar({
          calendarId: workspaceCalendarId,
          targetType: BindingTargetType.WORKSPACE,
          targetId: workspaceId,
          priority: 5,
          inheritParent: true,
        }).catch(() => {
          // Ignore if already bound from previous test
        });
      });

      it('should stop inheritance when inheritParent=false at rider level', async () => {
        // Create a rider binding with inheritParent=false
        const isolatedRiderId = uuidv4();
        const isolatedRiderCalendar = CalendarEntity.fromDomain({
          calendarId: uuidv4(),
          name: `Isolated Rider Calendar ${uuidv4().slice(0, 8)}`,
          timezone: 'Africa/Nairobi',
          ownerScope: CalendarScope.RIDER,
          ownerScopeId: isolatedRiderId,
          createdAt: new Date(),
        });
        const savedIsolatedCalendar = await calendarRepository.save(isolatedRiderCalendar);

        await calendarBindingService.bindCalendar({
          calendarId: savedIsolatedCalendar.id,
          targetType: BindingTargetType.RIDER,
          targetId: isolatedRiderId,
          priority: 100,
          inheritParent: false, // No inheritance from parent scopes
        });

        const result = await calendarBindingService.resolveEffectiveCalendars(
          BindingTargetType.RIDER,
          isolatedRiderId,
          {
            workspaceId,
            saccoId,
            businessId,
            riderId: isolatedRiderId,
          },
        );

        // Should only include the rider calendar, not any parent calendars
        expect(result.length).toBe(1);
        expect(result[0].binding.calendarId).toBe(savedIsolatedCalendar.id);
        expect(result[0].inheritanceLevel).toBe(0);
      });

      it('should stop inheritance at business level when business binding has inheritParent=false', async () => {
        const result = await calendarBindingService.resolveEffectiveCalendars(
          BindingTargetType.RIDER,
          cutoffRiderId,
          {
            workspaceId,
            saccoId,
            businessId: cutoffBusinessId,
            riderId: cutoffRiderId,
          },
        );

        // Should include rider and business calendars only
        // Workspace calendar should NOT be included because business has inheritParent=false
        expect(result.length).toBe(2);

        expect(result[0].binding.calendarId).toBe(cutoffRiderCalendarId);
        expect(result[0].inheritanceLevel).toBe(0);

        expect(result[1].binding.calendarId).toBe(cutoffBusinessCalendarId);
        expect(result[1].inheritanceLevel).toBe(1);

        // Verify workspace calendar is NOT in results
        const workspaceCalendarInResults = result.some(
          (r) => r.binding.calendarId === workspaceCalendarId,
        );
        expect(workspaceCalendarInResults).toBe(false);
      });
    });

    describe('resolveEffectiveCalendars with no bindings', () => {
      it('should return empty array when no bindings exist for target', async () => {
        const nonExistentRiderId = uuidv4();

        const result = await calendarBindingService.resolveEffectiveCalendars(
          BindingTargetType.RIDER,
          nonExistentRiderId,
          {
            workspaceId: uuidv4(),
            saccoId: uuidv4(),
            businessId: uuidv4(),
            riderId: nonExistentRiderId,
          },
        );

        expect(result).toEqual([]);
      });
    });

    describe('priority ordering within same inheritance level', () => {
      it('should order by priority when multiple calendars bound at same level', async () => {
        const multiBindBusinessId = uuidv4();
        const now = new Date();

        // Create two calendars for the same business
        const lowPriorityCalendar = CalendarEntity.fromDomain({
          calendarId: uuidv4(),
          name: `Low Priority Calendar ${uuidv4().slice(0, 8)}`,
          timezone: 'Africa/Nairobi',
          ownerScope: CalendarScope.BUSINESS,
          ownerScopeId: multiBindBusinessId,
          createdAt: now,
        });
        const savedLowPriority = await calendarRepository.save(lowPriorityCalendar);

        const highPriorityCalendar = CalendarEntity.fromDomain({
          calendarId: uuidv4(),
          name: `High Priority Calendar ${uuidv4().slice(0, 8)}`,
          timezone: 'Africa/Nairobi',
          ownerScope: CalendarScope.BUSINESS,
          ownerScopeId: multiBindBusinessId,
          createdAt: now,
        });
        const savedHighPriority = await calendarRepository.save(highPriorityCalendar);

        // Bind both calendars to same business with different priorities
        await calendarBindingService.bindCalendar({
          calendarId: savedLowPriority.id,
          targetType: BindingTargetType.BUSINESS,
          targetId: multiBindBusinessId,
          priority: 10,
          inheritParent: true,
        });

        await calendarBindingService.bindCalendar({
          calendarId: savedHighPriority.id,
          targetType: BindingTargetType.BUSINESS,
          targetId: multiBindBusinessId,
          priority: 100,
          inheritParent: true,
        });

        const result = await calendarBindingService.resolveEffectiveCalendars(
          BindingTargetType.BUSINESS,
          multiBindBusinessId,
          {
            businessId: multiBindBusinessId,
          },
        );

        // Higher priority calendar should come first
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result[0].binding.calendarId).toBe(savedHighPriority.id);
        expect(result[0].binding.priority).toBe(100);
        expect(result[1].binding.calendarId).toBe(savedLowPriority.id);
        expect(result[1].binding.priority).toBe(10);
      });
    });
  },
);
