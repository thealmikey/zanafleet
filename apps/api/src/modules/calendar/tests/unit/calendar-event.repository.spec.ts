import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalendarEventType, RecurrencePattern } from '@zanafleet/contracts';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { CalendarEventEntity } from '../../entities/calendar-event.entity';
import {
  CalendarEventRepository,
  RegionFilter,
} from '../../repositories/calendar-event.repository';

describe('CalendarEventRepository', () => {
  let repository: CalendarEventRepository;
  let mockRepo: jest.Mocked<Repository<CalendarEventEntity>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<CalendarEventEntity>>;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<CalendarEventEntity>>;

    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<CalendarEventEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventRepository,
        {
          provide: getRepositoryToken(CalendarEventEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<CalendarEventRepository>(CalendarEventRepository);
  });

  describe('findActiveEventsForDateRange', () => {
    it('should query events within date range', async () => {
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-31');
      const mockEvents: CalendarEventEntity[] = [];

      mockQueryBuilder.getMany.mockResolvedValue(mockEvents);

      const result = await repository.findActiveEventsForDateRange(startDate, endDate);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('event.isActive = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.startTime <= :endDate', {
        endDate,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.endTime >= :startDate', {
        startDate,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('event.priority', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('event.startTime', 'ASC');
      expect(result).toBe(mockEvents);
    });

    it('should apply region filter when provided', async () => {
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-31');
      const regionFilter: RegionFilter = { country: 'Kenya', administrativeArea: 'Nairobi' };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findActiveEventsForDateRange(startDate, endDate, regionFilter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findHolidaysForDate', () => {
    it('should query holidays for a specific date', async () => {
      const date = new Date('2024-12-25');
      const mockHolidays: CalendarEventEntity[] = [];

      mockQueryBuilder.getMany.mockResolvedValue(mockHolidays);

      const result = await repository.findHolidaysForDate(date);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('event.isActive = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.eventType = :eventType', {
        eventType: CalendarEventType.PUBLIC_HOLIDAY,
      });
      expect(result).toBe(mockHolidays);
    });

    it('should apply region filter for holidays', async () => {
      const date = new Date('2024-12-25');
      const regionFilter: RegionFilter = { country: 'Kenya' };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findHolidaysForDate(date, regionFilter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findByRegion', () => {
    it('should query events by region', async () => {
      const region: RegionFilter = { country: 'Kenya', administrativeArea: 'Nairobi' };
      const mockEvents: CalendarEventEntity[] = [];

      mockQueryBuilder.getMany.mockResolvedValue(mockEvents);

      const result = await repository.findByRegion(region);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('event.isActive = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('event.startTime', 'ASC');
      expect(result).toBe(mockEvents);
    });
  });

  describe('isHolidayInRegion', () => {
    it('should return true when holidays exist for date and region', async () => {
      const date = new Date('2024-12-25');
      const region: RegionFilter = { country: 'Kenya', administrativeArea: 'Nairobi' };

      const christmasEvent = new CalendarEventEntity();
      christmasEvent.id = 'test-uuid';
      christmasEvent.eventType = CalendarEventType.PUBLIC_HOLIDAY;
      christmasEvent.title = 'Christmas Day';
      christmasEvent.regionScope = { country: 'Kenya' };

      mockQueryBuilder.getMany.mockResolvedValue([christmasEvent]);

      const result = await repository.isHolidayInRegion(date, region);

      expect(result).toBe(true);
    });

    it('should return false when no holidays exist for date and region', async () => {
      const date = new Date('2024-12-24');
      const region: RegionFilter = { country: 'Kenya', administrativeArea: 'Nairobi' };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.isHolidayInRegion(date, region);

      expect(result).toBe(false);
    });

    it('should answer "Is 2024-12-25 a holiday in Nairobi?" correctly', async () => {
      const christmasDate = new Date('2024-12-25');
      const nairobiRegion: RegionFilter = { country: 'Kenya', administrativeArea: 'Nairobi' };

      const christmasEvent = new CalendarEventEntity();
      christmasEvent.id = 'christmas-uuid';
      christmasEvent.eventType = CalendarEventType.PUBLIC_HOLIDAY;
      christmasEvent.title = 'Christmas Day';
      christmasEvent.startTime = new Date('2024-12-25T00:00:00Z');
      christmasEvent.endTime = new Date('2024-12-25T23:59:59Z');
      christmasEvent.allDay = true;
      christmasEvent.regionScope = { country: 'Kenya' };
      christmasEvent.recurrencePattern = RecurrencePattern.YEARLY;
      christmasEvent.priority = 100;
      christmasEvent.isActive = true;

      mockQueryBuilder.getMany.mockResolvedValue([christmasEvent]);

      const isHoliday = await repository.isHolidayInRegion(christmasDate, nairobiRegion);

      expect(isHoliday).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find event by id', async () => {
      const mockEvent = new CalendarEventEntity();
      mockEvent.id = 'test-uuid';

      mockRepo.findOne.mockResolvedValue(mockEvent);

      const result = await repository.findById('test-uuid');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'test-uuid' } });
      expect(result).toBe(mockEvent);
    });

    it('should return null when event not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save entity', async () => {
      const entity = new CalendarEventEntity();
      entity.id = 'test-uuid';

      mockRepo.save.mockResolvedValue(entity);

      const result = await repository.save(entity);

      expect(mockRepo.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('delete', () => {
    it('should delete entity by id', async () => {
      await repository.delete('test-uuid');

      expect(mockRepo.delete).toHaveBeenCalledWith('test-uuid');
    });
  });
});
