import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { BusinessType } from '@zanafleet/contracts';

import { WooCommerceOnboardingController } from '../woocommerce-onboarding.controller';
import {
  RegisterWooCommerceStoreDto,
  LinkStoreDto,
  GenerateApiCredentialsDto,
} from '../woocommerce-onboarding.controller';

describe('WooCommerceOnboardingController', () => {
  let controller: WooCommerceOnboardingController;
  let commandBus: CommandBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WooCommerceOnboardingController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              sessionId: 'test-session-id',
              expiresAt: new Date(),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<WooCommerceOnboardingController>(WooCommerceOnboardingController);
    commandBus = module.get<CommandBus>(CommandBus);
  });

  describe('registerStore', () => {
    it('should register a new WooCommerce store and return credentials', async () => {
      // Mock command bus responses
      (commandBus.execute as jest.Mock)
        .mockResolvedValueOnce({ sessionId: 'test-session-id', expiresAt: new Date() }) // InitiateSignUp
        .mockResolvedValueOnce({}) // UpdateSignUpStep
        .mockResolvedValueOnce({ actorId: 'test-actor-id', workspaceId: 'test-workspace-id' }) // FinalizeSignUp
        .mockResolvedValueOnce('test-business-id'); // CreateBusiness

      const dto: RegisterWooCommerceStoreDto = {
        storeName: 'Test Store',
        storeUrl: 'https://teststore.com',
        adminEmail: 'admin@teststore.com',
        adminFirstName: 'John',
        adminLastName: 'Doe',
        phoneNumber: '+254700000000',
        businessType: BusinessType.Retail,
        address: {
          street: '123 Test Street',
          city: 'Nairobi',
          county: 'Nairobi',
          country: 'KE',
          postalCode: '00100',
        },
      };

      const result = await controller.registerStore(dto);

      expect(result).toHaveProperty('businessId');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('workspaceId');
      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('apiSecret');
      expect(result).toHaveProperty('storeId');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('active');

      // Verify API key format
      expect(result.apiKey).toMatch(/^wf_live_/);
    });

    it('should generate unique IDs for each registration', async () => {
      // Mock command bus responses
      (commandBus.execute as jest.Mock)
        .mockResolvedValueOnce({ sessionId: 'test-session-id-1', expiresAt: new Date() })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ actorId: 'test-actor-id-1', workspaceId: 'test-workspace-id-1' })
        .mockResolvedValueOnce('test-business-id-1');

      const dto: RegisterWooCommerceStoreDto = {
        storeName: 'Test Store',
        storeUrl: 'https://teststore.com',
        adminEmail: 'admin@teststore.com',
        adminFirstName: 'John',
        adminLastName: 'Doe',
        phoneNumber: '+254700000000',
        businessType: BusinessType.Retail,
        address: {
          street: '123 Test Street',
          city: 'Nairobi',
          county: 'Nairobi',
          country: 'KE',
          postalCode: '00100',
        },
      };

      const result1 = await controller.registerStore(dto);
      const result2 = await controller.registerStore(dto);

      expect(result1.storeId).not.toBe(result2.storeId);
      expect(result1.businessId).not.toBe(result2.businessId);
    });
  });

  describe('linkStore', () => {
    it('should link an existing store with valid credentials', async () => {
      const dto: LinkStoreDto = {
        storeUrl: 'https://existingstore.com',
        apiKey: 'wf_live_valid_key',
        apiSecret: 'valid_secret',
      };

      const result = await controller.linkStore(dto);

      expect(result.success).toBe(true);
      expect(result.storeId).toBeDefined();
      // businessId is undefined when linking new store (not associated with existing business)
      expect(result.message).toBe('Store linked successfully');
    });
  });

  describe('getStoreStatus', () => {
    it('should return store status for valid store ID', async () => {
      const storeId = 'woo_12345';

      const result = await controller.getStoreStatus(storeId);

      expect(result.storeId).toBe(storeId);
      expect(result.status).toBe('active');
      expect(result.businessId).toBeDefined();
      expect(result.apiKeyGenerated).toBe(true);
      expect(result.webhookConfigured).toBe(true);
    });
  });

  describe('generateCredentials', () => {
    it('should generate new API credentials', async () => {
      const dto: GenerateApiCredentialsDto = {
        storeId: 'woo_12345',
        name: 'Production API Key',
      };

      const result = await controller.generateCredentials(dto);

      expect(result.apiKey).toMatch(/^wf_live_/);
      expect(result.apiSecret).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();

      // Verify expiration is approximately 1 year from now
      const createdAt = new Date(result.createdAt);
      const expiresAt = new Date(result.expiresAt);
      const diffMs = expiresAt.getTime() - createdAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(364);
      expect(diffDays).toBeLessThan(366);
    });
  });
});
