import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NotificationChannel, RecipientType } from '../../dto/notification.enums';
import { NotificationPreferenceEntity } from '../../entities/preference.entity';
import { PreferenceService } from '../../services/preference.service';

describe('PreferenceService', () => {
  let service: PreferenceService;

  const mockPreferenceRepository = {
    createQueryBuilder: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferenceService,
        {
          provide: getRepositoryToken(NotificationPreferenceEntity),
          useValue: mockPreferenceRepository,
        },
      ],
    }).compile();

    service = module.get<PreferenceService>(PreferenceService);
  });

  describe('isEnabled', () => {
    it('should return true (default) when no preference exists', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockPreferenceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.isEnabled(
        'recipient-1',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL
      );

      expect(result).toBe(true);
    });

    it('should return workspace-specific preference when it exists', async () => {
      const workspacePref = { enabled: false };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(workspacePref),
      };
      mockPreferenceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.isEnabled(
        'recipient-1',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'workspace-1'
      );

      expect(result).toBe(false);
    });

    it('should fall back to global preference when workspace preference not found', async () => {
      const globalPref = { enabled: false };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(globalPref),
      };
      mockPreferenceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.isEnabled(
        'recipient-1',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'workspace-1'
      );

      expect(result).toBe(false);
    });

    it('should return true when preference is explicitly enabled', async () => {
      const preference = { enabled: true };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(preference),
      };
      mockPreferenceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.isEnabled(
        'recipient-1',
        RecipientType.RIDER,
        NotificationChannel.SMS
      );

      expect(result).toBe(true);
    });
  });

  describe('setPreference', () => {
    it('should upsert preference with correct conflict paths', async () => {
      mockPreferenceRepository.upsert.mockResolvedValue(undefined);

      await service.setPreference(
        'recipient-1',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        false,
        { workspaceId: 'workspace-1', updatedBy: 'actor-123' }
      );

      expect(mockPreferenceRepository.upsert).toHaveBeenCalledWith(
        {
          recipientId: 'recipient-1',
          recipientType: RecipientType.ACTOR,
          channel: NotificationChannel.EMAIL,
          workspaceId: 'workspace-1',
          enabled: false,
          updatedBy: 'actor-123',
        },
        {
          conflictPaths: ['recipientId', 'recipientType', 'channel', 'workspaceId'],
          skipUpdateIfNoValuesChanged: false,
        }
      );
    });

    it('should set workspaceId and updatedBy to null when not provided', async () => {
      mockPreferenceRepository.upsert.mockResolvedValue(undefined);

      await service.setPreference(
        'recipient-1',
        RecipientType.BUSINESS,
        NotificationChannel.PUSH,
        true
      );

      expect(mockPreferenceRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: null,
          updatedBy: null,
        }),
        expect.any(Object)
      );
    });
  });

  describe('getPreferences', () => {
    it('should return all preferences for a recipient', async () => {
      const preferences = [
        { id: '1', recipientId: 'r1', channel: NotificationChannel.EMAIL, enabled: true },
        { id: '2', recipientId: 'r1', channel: NotificationChannel.SMS, enabled: false },
      ];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(preferences),
      };
      mockPreferenceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPreferences('r1', RecipientType.ACTOR);

      expect(result).toEqual(preferences);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no preferences exist', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockPreferenceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPreferences('r1', RecipientType.ACTOR);

      expect(result).toEqual([]);
    });
  });
});
