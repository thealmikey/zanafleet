import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TestAccountSeederService } from './test-account-seeder.service';
import { ActorEntity } from '../entities/actor.entity';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@zanafleet/contracts';

describe('TestAccountSeederService', () => {
  let service: TestAccountSeederService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestAccountSeederService,
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TestAccountSeederService>(TestAccountSeederService);
  });

  describe('seedTestAccounts', () => {
    it('should skip existing accounts and not create duplicates', async () => {
      // Arrange: First account exists, second doesn't
      const existingAccount = TEST_ACCOUNTS[0];
      
      mockRepository.findOne.mockImplementation(async ({ where }) => {
        if (where.email === existingAccount.email) {
          return { id: existingAccount.id, email: existingAccount.email } as ActorEntity;
        }
        return null;
      });
      mockRepository.save.mockResolvedValue({} as ActorEntity);

      // Act
      await service.seedTestAccounts();

      // Assert: findOne called for all accounts
      expect(mockRepository.findOne).toHaveBeenCalledTimes(TEST_ACCOUNTS.length);
      
      // Assert: save NOT called for existing account
      const saveCallEmails = mockRepository.save.mock.calls.map(
        (call) => (call[0] as ActorEntity).email
      );
      expect(saveCallEmails).not.toContain(existingAccount.email);
      
      // Assert: save called for new accounts (all except first)
      expect(mockRepository.save).toHaveBeenCalledTimes(TEST_ACCOUNTS.length - 1);
    });

    it('should create all accounts when none exist', async () => {
      // Arrange: No accounts exist
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({} as ActorEntity);

      // Act
      await service.seedTestAccounts();

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledTimes(TEST_ACCOUNTS.length);
      expect(mockRepository.save).toHaveBeenCalledTimes(TEST_ACCOUNTS.length);
    });

    it('should skip all accounts when all exist', async () => {
      // Arrange: All accounts exist
      mockRepository.findOne.mockResolvedValue({ id: 'existing' } as ActorEntity);
      mockRepository.save.mockResolvedValue({} as ActorEntity);

      // Act
      await service.seedTestAccounts();

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledTimes(TEST_ACCOUNTS.length);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should hash the password for created accounts', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({} as ActorEntity);

      // Act
      await service.seedTestAccounts();

      // Assert: All saved entities should have a password hash (not plain text)
      const savedEntities = mockRepository.save.mock.calls.map(call => call[0] as ActorEntity);
      for (const entity of savedEntities) {
        expect(entity.passwordHash).toBeDefined();
        expect(entity.passwordHash).not.toBe(TEST_PASSWORD);
        // bcrypt hashes start with $2b$
        expect(entity.passwordHash).toMatch(/^\$2[aby]\$/);
      }
    });
  });

  describe('onModuleInit', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip seeding in production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockRepository.findOne).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should seed accounts in development', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({} as ActorEntity);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
    });

    it('should seed accounts in test', async () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({} as ActorEntity);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
    });
  });
});
