/**
 * SDUI Service Tests
 *
 * Unit tests for the main SDUI service.
 */

import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SDUIService, ScreenRenderer } from '../../services/sdui.service';
import { 
  SDUIRequest, 
  SDUIActionRequest, 
  UISchema,
  ActionDefinition 
} from '../../interfaces';

// Mock renderer for testing
const createMockRenderer = (screenId: string, actions: ActionDefinition[] = []): ScreenRenderer => ({
  render: jest.fn().mockResolvedValue({
    screenId,
    version: '1.0.0',
    metadata: { title: 'Test', type: 'form', auth: 'required' },
    layout: { type: 'stack', children: [] },
    actions,
    data: [],
  } as UISchema),
  executeAction: jest.fn().mockResolvedValue({ success: true }),
});

describe('SDUIService', () => {
  let service: SDUIService;
  let mockCapabilityAccessController: { getCapabilitiesForActor: jest.Mock };

  beforeEach(() => {
    mockCapabilityAccessController = {
      getCapabilitiesForActor: jest.fn().mockResolvedValue(['cap:view', 'cap:edit']),
    };
    
    service = new SDUIService(mockCapabilityAccessController as any);
  });

  describe('registerRenderer', () => {
    it('should register a screen renderer', () => {
      const renderer = createMockRenderer('test-screen');
      
      service.registerRenderer('test-screen', renderer);
      
      expect(service.hasScreen('test-screen')).toBe(true);
    });

    it('should allow overwriting existing renderer', () => {
      const renderer1 = createMockRenderer('test-screen');
      const renderer2 = createMockRenderer('test-screen');
      
      service.registerRenderer('test-screen', renderer1);
      service.registerRenderer('test-screen', renderer2);
      
      expect(service.hasScreen('test-screen')).toBe(true);
    });
  });

  describe('getScreen', () => {
    it('should return screen schema for registered screen', async () => {
      const renderer = createMockRenderer('test-screen');
      service.registerRenderer('test-screen', renderer);
      
      const request: SDUIRequest = { screenId: 'test-screen' };
      const result = await service.getScreen(request);
      
      expect(result.screenId).toBe('test-screen');
    });

    it('should throw unknown screen', async () => {
      const request: SDUIRequest = { screenId: 'unknown-screen' };
      
      await expect(service.getScreen(request)).rejects.toThrow(NotFoundException);
    });

    it('should pass actorId to renderer', async () => {
      const renderer = createMockRenderer('test-screen');
      service.registerRenderer('test-screen', renderer);
      
      const request: SDUIRequest = { 
        screenId: 'test-screen', 
        actorId: 'actor-123' 
      };
      await service.getScreen(request);
      
      expect(renderer.render).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'actor-123' })
      );
    });

    it('should pass params to renderer', async () => {
      const renderer = createMockRenderer('test-screen');
      service.registerRenderer('test-screen', renderer);
      
      const request: SDUIRequest = { 
        screenId: 'test-screen', 
        params: { tab: 'overview' } 
      };
      await service.getScreen(request);
      
      expect(renderer.render).toHaveBeenCalledWith(
        expect.objectContaining({ params: { tab: 'overview' } })
      );
    });
  });

  describe('executeAction', () => {
    it('should execute action on registered screen', async () => {
      const mockExecuteAction = jest.fn().mockResolvedValue({ success: true });
      const renderer = createMockRenderer('test-screen');
      (renderer as any).executeAction = mockExecuteAction;
      service.registerRenderer('test-screen', renderer);
      
      const request: SDUIActionRequest = {
        screenId: 'test-screen',
        actionId: 'submit',
        actorId: 'actor-123',
        payload: { field: 'value' },
      };
      
      const result = await service.executeAction(request);
      
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for unknown screen', async () => {
      const request: SDUIActionRequest = {
        screenId: 'unknown-screen',
        actionId: 'submit',
        actorId: 'actor-123',
        payload: {},
      };
      
      await expect(service.executeAction(request)).rejects.toThrow(NotFoundException);
    });

    it('should check capability before executing action', async () => {
      const renderer = createMockRenderer('test-screen', [
        { id: 'restricted-action', label: 'Restricted', capability: 'cap:restricted', type: 'submit' } as ActionDefinition,
      ]);
      service.registerRenderer('test-screen', renderer);
      
      const request: SDUIActionRequest = {
        screenId: 'test-screen',
        actionId: 'restricted-action',
        actorId: 'actor-123',
        payload: {},
      };
      
      const result = await service.executeAction(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("don't have the required capability");
    });

    it('should allow action when actor has capability', async () => {
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue(['cap:restricted']);
      
      const mockExecuteAction = jest.fn().mockResolvedValue({ success: true });
      const renderer = createMockRenderer('test-screen');
      (renderer as any).executeAction = mockExecuteAction;
      service.registerRenderer('test-screen', renderer);
      
      const request: SDUIActionRequest = {
        screenId: 'test-screen',
        actionId: 'submit',
        actorId: 'actor-123',
        payload: {},
      };
      
      const result = await service.executeAction(request);
      
      expect(result.success).toBe(true);
    });
  });

  describe('getNavigation', () => {
    it('should return navigation for actor', async () => {
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue(['move:booking:view']);
      
      const navigation = await service.getNavigation('actor-123');
      
      expect(navigation.items).toBeDefined();
      expect(navigation.items.length).toBeGreaterThan(0);
    });

    it('should include dashboard in navigation', async () => {
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);
      
      const navigation = await service.getNavigation('actor-123');
      
      const dashboardItem = navigation.items.find(i => i.id === 'dashboard');
      expect(dashboardItem).toBeDefined();
    });

    it('should include bookings for booking:view capability', async () => {
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue(['move:booking:view']);
      
      const navigation = await service.getNavigation('actor-123');
      
      const bookingsItem = navigation.items.find(i => i.id === 'bookings');
      expect(bookingsItem).toBeDefined();
    });

    it('should include drivers for driver capabilities', async () => {
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue(['move:driver:view']);
      
      const navigation = await service.getNavigation('actor-123');
      
      const driversItem = navigation.items.find(i => i.id === 'drivers');
      expect(driversItem).toBeDefined();
    });

    it('should include analytics for admin capability', async () => {
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue(['admin:*']);
      
      const navigation = await service.getNavigation('actor-123');
      
      const analyticsItem = navigation.items.find(i => i.id === 'analytics');
      expect(analyticsItem).toBeDefined();
    });

    it('should include user menu items', async () => {
      mockCapabilityAccessController.getCapabilitiesForActor.mockResolvedValue([]);
      
      const navigation = await service.getNavigation('actor-123');
      
      expect(navigation.userMenu).toBeDefined();
      expect(navigation.userMenu?.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableScreens', () => {
    it('should return empty list when no screens registered', () => {
      const screens = service.getAvailableScreens();
      expect(screens).toEqual([]);
    });

    it('should return registered screen IDs', () => {
      service.registerRenderer('screen1', createMockRenderer('screen1'));
      service.registerRenderer('screen2', createMockRenderer('screen2'));
      
      const screens = service.getAvailableScreens();
      
      expect(screens).toContain('screen1');
      expect(screens).toContain('screen2');
    });
  });

  describe('hasScreen', () => {
    it('should return true for registered screen', () => {
      service.registerRenderer('test-screen', createMockRenderer('test-screen'));
      
      expect(service.hasScreen('test-screen')).toBe(true);
    });

    it('should return false for unknown screen', () => {
      expect(service.hasScreen('unknown')).toBe(false);
    });
  });
});
