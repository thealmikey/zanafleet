import { ProcessDefinitionEntity, ProcessState } from '../../entities/process-definition.entity';

describe('ProcessDefinitionEntity', () => {
  describe('ProcessState Enum', () => {
    it('should have DRAFT state', () => {
      expect(ProcessState.DRAFT).toBe('draft');
    });

    it('should have ESTIMATE_REQUESTED state', () => {
      expect(ProcessState.ESTIMATE_REQUESTED).toBe('estimate_requested');
    });

    it('should have OPTIONS_PRESENTED state', () => {
      expect(ProcessState.OPTIONS_PRESENTED).toBe('options_presented');
    });

    it('should have BOOKING_CONFIRMED state', () => {
      expect(ProcessState.BOOKING_CONFIRMED).toBe('booking_confirmed');
    });

    it('should have PAYMENT_AUTHORIZED state', () => {
      expect(ProcessState.PAYMENT_AUTHORIZED).toBe('payment_authorized');
    });

    it('should have DRIVER_ASSIGNED state', () => {
      expect(ProcessState.DRIVER_ASSIGNED).toBe('driver_assigned');
    });

    it('should have VEHICLE_ASSIGNED state', () => {
      expect(ProcessState.VEHICLE_ASSIGNED).toBe('vehicle_assigned');
    });

    it('should have IN_PROGRESS state', () => {
      expect(ProcessState.IN_PROGRESS).toBe('in_progress');
    });

    it('should have ARRIVED state', () => {
      expect(ProcessState.ARRIVED).toBe('arrived');
    });

    it('should have LOADING state', () => {
      expect(ProcessState.LOADING).toBe('loading');
    });

    it('should have UNLOADING state', () => {
      expect(ProcessState.UNLOADING).toBe('unloading');
    });

    it('should have COMPLETED state', () => {
      expect(ProcessState.COMPLETED).toBe('completed');
    });

    it('should have CANCELLED state', () => {
      expect(ProcessState.CANCELLED).toBe('cancelled');
    });

    it('should have FAILED state', () => {
      expect(ProcessState.FAILED).toBe('failed');
    });

    describe('state categorization', () => {
      const initialStates = [
        ProcessState.DRAFT,
        ProcessState.ESTIMATE_REQUESTED,
        ProcessState.OPTIONS_PRESENTED,
      ];

      const confirmationStates = [
        ProcessState.BOOKING_CONFIRMED,
        ProcessState.PAYMENT_AUTHORIZED,
      ];

      const assignmentStates = [
        ProcessState.DRIVER_ASSIGNED,
        ProcessState.VEHICLE_ASSIGNED,
      ];

      const activeStates = [
        ProcessState.IN_PROGRESS,
        ProcessState.ARRIVED,
        ProcessState.LOADING,
        ProcessState.UNLOADING,
      ];

      const terminalStates = [
        ProcessState.COMPLETED,
        ProcessState.CANCELLED,
        ProcessState.FAILED,
      ];

      it('should have 3 initial states', () => {
        expect(initialStates.length).toBe(3);
      });

      it('should have 2 confirmation states', () => {
        expect(confirmationStates.length).toBe(2);
      });

      it('should have 2 assignment states', () => {
        expect(assignmentStates.length).toBe(2);
      });

      it('should have 4 active states', () => {
        expect(activeStates.length).toBe(4);
      });

      it('should have 3 terminal states', () => {
        expect(terminalStates.length).toBe(3);
      });

      it('should have total of 14 states', () => {
        const allStates = Object.values(ProcessState);
        expect(allStates.length).toBe(14);
      });
    });
  });

  describe('ProcessDefinitionEntity', () => {
    type EntityOverrides = {
      definitionId?: string;
      name?: string;
      description?: string;
      version?: string;
      isActive?: boolean;
      allowedStates?: string[];
      metadata?: Record<string, unknown> | null;
      initialState?: string;
      transitions?: any[];
    };

    const createEntity = (overrides: EntityOverrides = {}): ProcessDefinitionEntity => {
      const entity = new ProcessDefinitionEntity();
      entity.definitionId = overrides.definitionId || '550e8400-e29b-41d4-a716-446655440000';
      entity.name = overrides.name || 'MoveBookingProcess';
      entity.description = overrides.description || 'Process for handling move bookings';
      entity.version = overrides.version || '1.0.0';
      entity.isActive = overrides.isActive ?? true;
      entity.allowedStates = overrides.allowedStates || [
        ProcessState.DRAFT,
        ProcessState.ESTIMATE_REQUESTED,
        ProcessState.BOOKING_CONFIRMED,
        ProcessState.IN_PROGRESS,
        ProcessState.COMPLETED,
      ];
      entity.metadata = overrides.metadata || { category: 'booking' };
      entity.initialState = overrides.initialState || ProcessState.DRAFT;
      entity.transitions = overrides.transitions || [];
      return entity;
    };

    describe('creation', () => {
      it('should create entity with required fields', () => {
        const entity = createEntity();

        expect(entity.definitionId).toBeDefined();
        expect(entity.name).toBe('MoveBookingProcess');
        expect(entity.description).toBe('Process for handling move bookings');
        expect(entity.version).toBe('1.0.0');
        expect(entity.isActive).toBe(true);
      });

      it('should create with default version', () => {
        const entity = createEntity({ version: undefined });
        expect(entity.version).toBe('1.0.0');
      });

      it('should create with default isActive', () => {
        const entity = createEntity({ isActive: undefined });
        expect(entity.isActive).toBe(true);
      });

      it('should create with custom metadata', () => {
        const entity = createEntity({
          metadata: { category: 'delivery', priority: 'high' },
        });
        expect(entity.metadata).toEqual({ category: 'delivery', priority: 'high' });
      });

      it('should create with null metadata', () => {
        const entity = createEntity({ metadata: null });
        expect(entity.metadata).toBeNull();
      });

      it('should create with empty allowed states', () => {
        const entity = createEntity({ allowedStates: [] });
        expect(entity.allowedStates).toEqual([]);
      });

      it('should create with complex allowed states', () => {
        const entity = createEntity({
          allowedStates: Object.values(ProcessState),
        });
        expect(entity.allowedStates.length).toBe(14);
      });
    });

    describe('validation', () => {
      it('should validate valid state in allowed states', () => {
        const entity = createEntity();
        const isValid = entity.allowedStates.includes(ProcessState.DRAFT);
        expect(isValid).toBe(true);
      });

      it('should detect invalid state not in allowed states', () => {
        const entity = createEntity();
        const isValid = entity.allowedStates.includes(ProcessState.FAILED);
        expect(isValid).toBe(false);
      });

      it('should validate initial state is in allowed states', () => {
        const entity = createEntity();
        const isValid = entity.allowedStates.includes(entity.initialState as ProcessState);
        expect(isValid).toBe(true);
      });

      it('should handle single allowed state', () => {
        const entity = createEntity({ allowedStates: [ProcessState.COMPLETED] });
        expect(entity.allowedStates.length).toBe(1);
      });

      it('should handle all allowed states', () => {
        const entity = createEntity({
          allowedStates: Object.values(ProcessState),
        });
        expect(entity.allowedStates.length).toBe(14);
      });
    });

    describe('transitions', () => {
      it('should have empty transitions by default', () => {
        const entity = createEntity();
        expect(entity.transitions).toEqual([]);
      });

      it('should handle transition array', () => {
        const entity = createEntity({
          transitions: ['draft_to_estimate', 'estimate_to_confirmed'],
        });
        expect(entity.transitions.length).toBe(2);
      });

      it('should handle complex transitions', () => {
        const entity = createEntity({
          transitions: ['draft→estimate', 'estimate→confirmed', 'confirmed→in_progress→completed'],
        });
        expect(entity.transitions.length).toBe(3);
      });
    });

    describe('metadata', () => {
      it('should store complex metadata', () => {
        const entity = createEntity({
          metadata: {
            settings: { timeout: 300, retry: 3 },
            notifications: { email: true, sms: false },
          },
        });
        expect(entity.metadata).toHaveProperty('settings');
        expect(entity.metadata).toHaveProperty('notifications');
      });

      it('should handle nested metadata', () => {
        const entity = createEntity({
          metadata: {
            level1: {
              level2: {
                level3: 'deep value',
              },
            },
          },
        });
        expect((entity.metadata as any).level1.level2.level3).toBe('deep value');
      });

      it('should handle array metadata', () => {
        const entity = createEntity({
          metadata: { items: [1, 2, 3], tags: ['a', 'b'] },
        });
        expect((entity.metadata as any).items).toEqual([1, 2, 3]);
      });
    });

    describe('versioning', () => {
      it('should handle semantic versioning', () => {
        const entity = createEntity({ version: '2.1.0' });
        expect(entity.version).toBe('2.1.0');
      });

      it('should handle beta version', () => {
        const entity = createEntity({ version: '1.0.0-beta.1' });
        expect(entity.version).toBe('1.0.0-beta.1');
      });

      it('should handle major version zero', () => {
        const entity = createEntity({ version: '0.1.0' });
        expect(entity.version).toBe('0.1.0');
      });
    });

    describe('edge cases', () => {
      it('should handle very long name', () => {
        const longName = 'a'.repeat(1000);
        const entity = createEntity({ name: longName });
        expect(entity.name.length).toBe(1000);
      });

      it('should handle unicode in description', () => {
        const entity = createEntity({ description: 'Description with émoji 🎉' });
        expect(entity.description).toContain('🎉');
      });

      it('should handle empty description', () => {
        const entity = createEntity({ description: '' });
        expect(entity.description).toBe('');
      });

      it('should handle special characters in name', () => {
        const entity = createEntity({ name: 'Process_v1.0-Test' });
        expect(entity.name).toBe('Process_v1.0-Test');
      });

      it('should handle numeric name', () => {
        const entity = createEntity({ name: '12345' });
        expect(entity.name).toBe('12345');
      });
    });
  });
});