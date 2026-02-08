import { PolicyCondition, EvaluationContext, PolicyTrigger } from '../../dto';
import { JsonLogicEvaluatorService } from '../../services/json-logic-evaluator.service';

describe('JsonLogicEvaluatorService', () => {
  let service: JsonLogicEvaluatorService;

  beforeEach(() => {
    service = new JsonLogicEvaluatorService();
  });

  const createContext = (overrides: Partial<EvaluationContext> = {}): EvaluationContext => ({
    trigger: PolicyTrigger.DELIVERY_CREATION,
    workspaceId: 'workspace-123',
    timestamp: new Date('2024-01-15T14:30:00Z'),
    ...overrides,
  });

  describe('comparison operators', () => {
    describe('== (equals)', () => {
      it('should match when string values are equal', () => {
        const condition: PolicyCondition = {
          field: 'trigger',
          operator: '==',
          value: 'DELIVERY_CREATION',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
        expect(result.reason).toContain('trigger');
        expect(result.reason).toContain('equals');
      });

      it('should not match when string values differ', () => {
        const condition: PolicyCondition = {
          field: 'trigger',
          operator: '==',
          value: 'RIDER_ASSIGNMENT',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should match when numeric values are equal', () => {
        const condition: PolicyCondition = {
          field: 'metadata.priority',
          operator: '==',
          value: 10,
        };
        const context = createContext({ metadata: { priority: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should support eq alias', () => {
        const condition: PolicyCondition = {
          field: 'workspaceId',
          operator: 'eq',
          value: 'workspace-123',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });

    describe('!= (not equals)', () => {
      it('should match when values differ', () => {
        const condition: PolicyCondition = {
          field: 'trigger',
          operator: '!=',
          value: 'RIDER_ASSIGNMENT',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when values are equal', () => {
        const condition: PolicyCondition = {
          field: 'trigger',
          operator: '!=',
          value: 'DELIVERY_CREATION',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should support ne alias', () => {
        const condition: PolicyCondition = {
          field: 'workspaceId',
          operator: 'ne',
          value: 'other-workspace',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });

    describe('> (greater than)', () => {
      it('should match when value is greater', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '>',
          value: 5,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when value is equal', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '>',
          value: 10,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should not match when value is less', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '>',
          value: 15,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should support gt alias', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: 'gt',
          value: 5,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });

    describe('< (less than)', () => {
      it('should match when value is less', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '<',
          value: 15,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when value is equal', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '<',
          value: 10,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should support lt alias', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: 'lt',
          value: 15,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });

    describe('>= (greater than or equal)', () => {
      it('should match when value is greater', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '>=',
          value: 5,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should match when value is equal', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '>=',
          value: 10,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when value is less', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '>=',
          value: 15,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should support gte alias', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: 'gte',
          value: 10,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });

    describe('<= (less than or equal)', () => {
      it('should match when value is less', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '<=',
          value: 15,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should match when value is equal', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '<=',
          value: 10,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when value is greater', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: '<=',
          value: 5,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should support lte alias', () => {
        const condition: PolicyCondition = {
          field: 'metadata.count',
          operator: 'lte',
          value: 10,
        };
        const context = createContext({ metadata: { count: 10 } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });
  });

  describe('set and string operators', () => {
    describe('in operator', () => {
      it('should match when value is in array', () => {
        const condition: PolicyCondition = {
          field: 'trigger',
          operator: 'in',
          value: ['DELIVERY_CREATION', 'RIDER_ASSIGNMENT'],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when value is not in array', () => {
        const condition: PolicyCondition = {
          field: 'trigger',
          operator: 'in',
          value: ['STATUS_TRANSITION', 'SLA_CHECK'],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });
    });

    describe('contains operator', () => {
      it('should match when string contains substring', () => {
        const condition: PolicyCondition = {
          field: 'metadata.description',
          operator: 'contains',
          value: 'urgent',
        };
        const context = createContext({ metadata: { description: 'This is an urgent delivery' } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when string does not contain substring', () => {
        const condition: PolicyCondition = {
          field: 'metadata.description',
          operator: 'contains',
          value: 'priority',
        };
        const context = createContext({ metadata: { description: 'This is an urgent delivery' } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should match when array contains element', () => {
        const condition: PolicyCondition = {
          field: 'metadata.tags',
          operator: 'contains',
          value: 'vip',
        };
        const context = createContext({ metadata: { tags: ['urgent', 'vip', 'scheduled'] } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when array does not contain element', () => {
        const condition: PolicyCondition = {
          field: 'metadata.tags',
          operator: 'contains',
          value: 'premium',
        };
        const context = createContext({ metadata: { tags: ['urgent', 'vip'] } });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });
    });

    describe('startsWith operator', () => {
      it('should match when string starts with prefix', () => {
        const condition: PolicyCondition = {
          field: 'workspaceId',
          operator: 'startsWith',
          value: 'workspace',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when string does not start with prefix', () => {
        const condition: PolicyCondition = {
          field: 'workspaceId',
          operator: 'startsWith',
          value: 'org',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });
    });

    describe('endsWith operator', () => {
      it('should match when string ends with suffix', () => {
        const condition: PolicyCondition = {
          field: 'workspaceId',
          operator: 'endsWith',
          value: '-123',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when string does not end with suffix', () => {
        const condition: PolicyCondition = {
          field: 'workspaceId',
          operator: 'endsWith',
          value: '-456',
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });
    });
  });

  describe('logical operators', () => {
    describe('AND operator', () => {
      it('should match when all children match', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'AND',
          value: null,
          children: [
            { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
            { field: 'workspaceId', operator: '==', value: 'workspace-123' },
          ],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when any child fails', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'AND',
          value: null,
          children: [
            { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
            { field: 'workspaceId', operator: '==', value: 'other-workspace' },
          ],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should match when children array is empty', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'AND',
          value: null,
          children: [],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });

    describe('OR operator', () => {
      it('should match when any child matches', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'OR',
          value: null,
          children: [
            { field: 'trigger', operator: '==', value: 'RIDER_ASSIGNMENT' },
            { field: 'workspaceId', operator: '==', value: 'workspace-123' },
          ],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should not match when all children fail', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'OR',
          value: null,
          children: [
            { field: 'trigger', operator: '==', value: 'STATUS_TRANSITION' },
            { field: 'workspaceId', operator: '==', value: 'other-workspace' },
          ],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });

      it('should not match when children array is empty', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'OR',
          value: null,
          children: [],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });
    });

    describe('NOT operator', () => {
      it('should invert a matching condition', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'NOT',
          value: null,
          children: [{ field: 'trigger', operator: '==', value: 'RIDER_ASSIGNMENT' }],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should invert a non-matching condition', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'NOT',
          value: null,
          children: [{ field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' }],
        };
        const context = createContext();

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(false);
      });
    });
  });

  describe('complex nested conditions', () => {
    it('should evaluate deeply nested AND/OR conditions', () => {
      const condition: PolicyCondition = {
        field: '',
        operator: 'AND',
        value: null,
        children: [
          { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
          {
            field: '',
            operator: 'OR',
            value: null,
            children: [
              { field: 'metadata.priority', operator: '==', value: 'high' },
              { field: 'metadata.priority', operator: '==', value: 'urgent' },
            ],
          },
        ],
      };
      const context = createContext({ metadata: { priority: 'high' } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should fail nested conditions when inner OR fails', () => {
      const condition: PolicyCondition = {
        field: '',
        operator: 'AND',
        value: null,
        children: [
          { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
          {
            field: '',
            operator: 'OR',
            value: null,
            children: [
              { field: 'metadata.priority', operator: '==', value: 'high' },
              { field: 'metadata.priority', operator: '==', value: 'urgent' },
            ],
          },
        ],
      };
      const context = createContext({ metadata: { priority: 'low' } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(false);
    });

    it('should handle condition with logic property for combining with siblings', () => {
      const condition: PolicyCondition = {
        field: 'trigger',
        operator: '==',
        value: 'DELIVERY_CREATION',
        logic: 'AND',
        children: [{ field: 'workspaceId', operator: '==', value: 'workspace-123' }],
      };
      const context = createContext();

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should handle complex real-world policy condition', () => {
      const condition: PolicyCondition = {
        field: '',
        operator: 'AND',
        value: null,
        children: [
          { field: 'trigger', operator: 'in', value: ['DELIVERY_CREATION', 'RIDER_ASSIGNMENT'] },
          {
            field: '',
            operator: 'OR',
            value: null,
            children: [
              {
                field: '',
                operator: 'AND',
                value: null,
                children: [
                  { field: 'metadata.vehicleType', operator: '==', value: 'Bike' },
                  { field: 'metadata.distance', operator: '<', value: 5000 },
                ],
              },
              {
                field: '',
                operator: 'AND',
                value: null,
                children: [
                  { field: 'metadata.vehicleType', operator: 'in', value: ['Car', 'Van'] },
                  { field: 'metadata.distance', operator: '<', value: 20000 },
                ],
              },
            ],
          },
        ],
      };
      const context = createContext({
        metadata: { vehicleType: 'Bike', distance: 3000 },
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });
  });

  describe('time-based conditions', () => {
    it('should extract hour from timestamp for time-of-day checks', () => {
      const condition: PolicyCondition = {
        field: 'hour',
        operator: '>=',
        value: 8,
      };
      const context = createContext({
        timestamp: new Date('2024-01-15T14:30:00Z'),
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should allow between 8am-6pm (business hours)', () => {
      const condition: PolicyCondition = {
        field: '',
        operator: 'AND',
        value: null,
        children: [
          { field: 'hour', operator: '>=', value: 8 },
          { field: 'hour', operator: '<', value: 18 },
        ],
      };

      const morningContext = createContext({
        timestamp: new Date('2024-01-15T10:00:00Z'),
      });
      expect(service.evaluate(condition, morningContext).matched).toBe(true);

      const eveningContext = createContext({
        timestamp: new Date('2024-01-15T20:00:00Z'),
      });
      expect(service.evaluate(condition, eveningContext).matched).toBe(false);

      const earlyContext = createContext({
        timestamp: new Date('2024-01-15T06:00:00Z'),
      });
      expect(service.evaluate(condition, earlyContext).matched).toBe(false);
    });

    it('should extract dayOfWeek from timestamp', () => {
      const condition: PolicyCondition = {
        field: 'dayOfWeek',
        operator: '==',
        value: 1,
      };
      const context = createContext({
        timestamp: new Date('2024-01-15T14:30:00Z'),
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should block weekends (Saturday=6, Sunday=0)', () => {
      const condition: PolicyCondition = {
        field: '',
        operator: 'AND',
        value: null,
        children: [
          { field: 'dayOfWeek', operator: '!=', value: 0 },
          { field: 'dayOfWeek', operator: '!=', value: 6 },
        ],
      };

      const mondayContext = createContext({
        timestamp: new Date('2024-01-15T14:30:00Z'),
      });
      expect(service.evaluate(condition, mondayContext).matched).toBe(true);

      const saturdayContext = createContext({
        timestamp: new Date('2024-01-13T14:30:00Z'),
      });
      expect(service.evaluate(condition, saturdayContext).matched).toBe(false);

      const sundayContext = createContext({
        timestamp: new Date('2024-01-14T14:30:00Z'),
      });
      expect(service.evaluate(condition, sundayContext).matched).toBe(false);
    });

    it('should combine time and day restrictions', () => {
      const condition: PolicyCondition = {
        field: '',
        operator: 'AND',
        value: null,
        children: [
          { field: 'dayOfWeek', operator: '!=', value: 0 },
          { field: 'dayOfWeek', operator: '!=', value: 6 },
          { field: 'hour', operator: '>=', value: 8 },
          { field: 'hour', operator: '<', value: 18 },
        ],
      };

      const mondayMorningContext = createContext({
        timestamp: new Date('2024-01-15T10:00:00Z'),
      });
      expect(service.evaluate(condition, mondayMorningContext).matched).toBe(true);

      const saturdayMorningContext = createContext({
        timestamp: new Date('2024-01-13T10:00:00Z'),
      });
      expect(service.evaluate(condition, saturdayMorningContext).matched).toBe(false);

      const mondayNightContext = createContext({
        timestamp: new Date('2024-01-15T22:00:00Z'),
      });
      expect(service.evaluate(condition, mondayNightContext).matched).toBe(false);
    });

    describe('timezone support', () => {
      it('should use UTC by default when no timezone is specified', () => {
        const condition: PolicyCondition = {
          field: 'hour',
          operator: '==',
          value: 14,
        };
        const context = createContext({
          timestamp: new Date('2024-01-15T14:30:00Z'),
        });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should convert timestamp to specified timezone for hour extraction', () => {
        const condition: PolicyCondition = {
          field: 'hour',
          operator: '==',
          value: 17,
        };
        // 14:30 UTC = 17:30 in Africa/Nairobi (UTC+3)
        const context = createContext({
          timestamp: new Date('2024-01-15T14:30:00Z'),
          timezone: 'Africa/Nairobi',
        });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should correctly evaluate business hours in local timezone', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'AND',
          value: null,
          children: [
            { field: 'hour', operator: '>=', value: 8 },
            { field: 'hour', operator: '<', value: 18 },
          ],
        };

        // 06:00 UTC = 09:00 in Africa/Nairobi (within business hours)
        const withinHoursContext = createContext({
          timestamp: new Date('2024-01-15T06:00:00Z'),
          timezone: 'Africa/Nairobi',
        });
        expect(service.evaluate(condition, withinHoursContext).matched).toBe(true);

        // 06:00 UTC without timezone = 06:00 (outside business hours)
        const outsideHoursContext = createContext({
          timestamp: new Date('2024-01-15T06:00:00Z'),
        });
        expect(service.evaluate(condition, outsideHoursContext).matched).toBe(false);
      });

      it('should handle dayOfWeek correctly across timezone boundaries', () => {
        const condition: PolicyCondition = {
          field: 'dayOfWeek',
          operator: '==',
          value: 2,
        };

        // 2024-01-15 23:00 UTC is Monday in UTC
        // But 2024-01-16 02:00 in Africa/Nairobi is Tuesday
        const context = createContext({
          timestamp: new Date('2024-01-15T23:00:00Z'),
          timezone: 'Africa/Nairobi',
        });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should handle negative UTC offsets correctly', () => {
        const condition: PolicyCondition = {
          field: 'hour',
          operator: '==',
          value: 9,
        };
        // 14:00 UTC = 09:00 in America/New_York (UTC-5 in January)
        const context = createContext({
          timestamp: new Date('2024-01-15T14:00:00Z'),
          timezone: 'America/New_York',
        });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });

      it('should handle weekend check with timezone that crosses day boundary', () => {
        const condition: PolicyCondition = {
          field: '',
          operator: 'AND',
          value: null,
          children: [
            { field: 'dayOfWeek', operator: '!=', value: 0 },
            { field: 'dayOfWeek', operator: '!=', value: 6 },
          ],
        };

        // 2024-01-13 is Saturday in UTC
        // 2024-01-13 22:00 UTC = 2024-01-14 01:00 in Africa/Nairobi (Sunday)
        const sundayInNairobiContext = createContext({
          timestamp: new Date('2024-01-13T22:00:00Z'),
          timezone: 'Africa/Nairobi',
        });
        expect(service.evaluate(condition, sundayInNairobiContext).matched).toBe(false);

        // Same UTC time but evaluated in UTC is still Saturday
        const saturdayInUtcContext = createContext({
          timestamp: new Date('2024-01-13T22:00:00Z'),
        });
        expect(service.evaluate(condition, saturdayInUtcContext).matched).toBe(false);
      });

      it('should extract minute correctly in specified timezone', () => {
        const condition: PolicyCondition = {
          field: 'minute',
          operator: '==',
          value: 30,
        };
        const context = createContext({
          timestamp: new Date('2024-01-15T14:30:00Z'),
          timezone: 'Africa/Nairobi',
        });

        const result = service.evaluate(condition, context);

        expect(result.matched).toBe(true);
      });
    });
  });

  describe('location-based conditions', () => {
    it('should extract latitude from location', () => {
      const condition: PolicyCondition = {
        field: 'latitude',
        operator: '>',
        value: -2,
      };
      const context = createContext({
        location: { latitude: -1.2921, longitude: 36.8219 },
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should extract longitude from location', () => {
      const condition: PolicyCondition = {
        field: 'longitude',
        operator: '>',
        value: 36,
      };
      const context = createContext({
        location: { latitude: -1.2921, longitude: 36.8219 },
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should block if latitude exceeds threshold', () => {
      const condition: PolicyCondition = {
        field: 'latitude',
        operator: '>',
        value: 0,
      };
      const context = createContext({
        location: { latitude: -1.2921, longitude: 36.8219 },
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(false);
    });

    it('should support basic geofence bounds check', () => {
      const condition: PolicyCondition = {
        field: '',
        operator: 'AND',
        value: null,
        children: [
          { field: 'latitude', operator: '>=', value: -2 },
          { field: 'latitude', operator: '<=', value: 0 },
          { field: 'longitude', operator: '>=', value: 36 },
          { field: 'longitude', operator: '<=', value: 38 },
        ],
      };

      const insideContext = createContext({
        location: { latitude: -1.2921, longitude: 36.8219 },
      });
      expect(service.evaluate(condition, insideContext).matched).toBe(true);

      const outsideLatContext = createContext({
        location: { latitude: -3.0, longitude: 36.8219 },
      });
      expect(service.evaluate(condition, outsideLatContext).matched).toBe(false);

      const outsideLngContext = createContext({
        location: { latitude: -1.2921, longitude: 40.0 },
      });
      expect(service.evaluate(condition, outsideLngContext).matched).toBe(false);
    });

    it('should access location via dot notation', () => {
      const condition: PolicyCondition = {
        field: 'location.latitude',
        operator: '>',
        value: -2,
      };
      const context = createContext({
        location: { latitude: -1.2921, longitude: 36.8219 },
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });
  });

  describe('metadata field access', () => {
    it('should access simple metadata fields', () => {
      const condition: PolicyCondition = {
        field: 'metadata.priority',
        operator: '==',
        value: 'high',
      };
      const context = createContext({ metadata: { priority: 'high' } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should access nested metadata fields', () => {
      const condition: PolicyCondition = {
        field: 'metadata.customer.type',
        operator: '==',
        value: 'vip',
      };
      const context = createContext({
        metadata: { customer: { type: 'vip', tier: 'gold' } },
      });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should handle missing metadata gracefully', () => {
      const condition: PolicyCondition = {
        field: 'metadata.nonexistent',
        operator: '==',
        value: 'value',
      };
      const context = createContext({ metadata: {} });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(false);
    });

    it('should handle undefined metadata', () => {
      const condition: PolicyCondition = {
        field: 'metadata.field',
        operator: '==',
        value: 'value',
      };
      const context = createContext();

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(false);
    });
  });

  describe('reason string generation', () => {
    it('should include field name in reason', () => {
      const condition: PolicyCondition = {
        field: 'trigger',
        operator: '==',
        value: 'DELIVERY_CREATION',
      };
      const context = createContext();

      const result = service.evaluate(condition, context);

      expect(result.reason).toContain('trigger');
    });

    it('should include actual value in reason', () => {
      const condition: PolicyCondition = {
        field: 'trigger',
        operator: '==',
        value: 'RIDER_ASSIGNMENT',
      };
      const context = createContext();

      const result = service.evaluate(condition, context);

      expect(result.reason).toContain('DELIVERY_CREATION');
    });

    it('should include expected value in reason', () => {
      const condition: PolicyCondition = {
        field: 'trigger',
        operator: '==',
        value: 'RIDER_ASSIGNMENT',
      };
      const context = createContext();

      const result = service.evaluate(condition, context);

      expect(result.reason).toContain('RIDER_ASSIGNMENT');
    });

    it('should indicate matched or did not match', () => {
      const matchingCondition: PolicyCondition = {
        field: 'trigger',
        operator: '==',
        value: 'DELIVERY_CREATION',
      };
      const matchResult = service.evaluate(matchingCondition, createContext());
      expect(matchResult.reason).toContain('matched');

      const nonMatchingCondition: PolicyCondition = {
        field: 'trigger',
        operator: '==',
        value: 'OTHER',
      };
      const noMatchResult = service.evaluate(nonMatchingCondition, createContext());
      expect(noMatchResult.reason).toContain('did not match');
    });

    it('should format array values in reason', () => {
      const condition: PolicyCondition = {
        field: 'trigger',
        operator: 'in',
        value: ['DELIVERY_CREATION', 'RIDER_ASSIGNMENT'],
      };
      const context = createContext();

      const result = service.evaluate(condition, context);

      expect(result.reason).toContain('DELIVERY_CREATION');
      expect(result.reason).toContain('RIDER_ASSIGNMENT');
    });
  });

  describe('edge cases', () => {
    it('should handle boolean values', () => {
      const condition: PolicyCondition = {
        field: 'metadata.isUrgent',
        operator: '==',
        value: true,
      };
      const context = createContext({ metadata: { isUrgent: true } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should treat undefined as null (json-logic-js behavior)', () => {
      // json-logic-js treats undefined as null because JSON has no undefined concept
      const condition: PolicyCondition = {
        field: 'actorId',
        operator: '==',
        value: null,
      };
      const context = createContext({ actorId: undefined });

      const result = service.evaluate(condition, context);

      // In json-logic-js, undefined values are returned as null (the default)
      // so null == null is true
      expect(result.matched).toBe(true);
    });

    it('should match when comparing null to null', () => {
      const condition: PolicyCondition = {
        field: 'metadata.nullField',
        operator: '==',
        value: null,
      };
      const context = createContext({ metadata: { nullField: null } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should handle numeric string comparisons', () => {
      const condition: PolicyCondition = {
        field: 'metadata.code',
        operator: '==',
        value: '123',
      };
      const context = createContext({ metadata: { code: '123' } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should handle empty string', () => {
      const condition: PolicyCondition = {
        field: 'metadata.note',
        operator: '==',
        value: '',
      };
      const context = createContext({ metadata: { note: '' } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should handle zero value', () => {
      const condition: PolicyCondition = {
        field: 'metadata.count',
        operator: '==',
        value: 0,
      };
      const context = createContext({ metadata: { count: 0 } });

      const result = service.evaluate(condition, context);

      expect(result.matched).toBe(true);
    });

    it('should be pure (same input produces same output)', () => {
      const condition: PolicyCondition = {
        field: 'trigger',
        operator: '==',
        value: 'DELIVERY_CREATION',
      };
      const context = createContext();

      const result1 = service.evaluate(condition, context);
      const result2 = service.evaluate(condition, context);
      const result3 = service.evaluate(condition, context);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('all context fields', () => {
    it('should provide access to all standard context fields', () => {
      const context = createContext({
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
        deliveryId: 'delivery-789',
        riderId: 'rider-abc',
        businessId: 'business-def',
        saccoId: 'sacco-ghi',
        timestamp: new Date('2024-01-15T14:30:00Z'),
        location: { latitude: -1.2921, longitude: 36.8219 },
        metadata: { custom: 'value' },
      });

      expect(service.evaluate({ field: 'actorId', operator: '==', value: 'actor-123' }, context).matched).toBe(true);
      expect(service.evaluate({ field: 'deliveryId', operator: '==', value: 'delivery-789' }, context).matched).toBe(true);
      expect(service.evaluate({ field: 'riderId', operator: '==', value: 'rider-abc' }, context).matched).toBe(true);
      expect(service.evaluate({ field: 'businessId', operator: '==', value: 'business-def' }, context).matched).toBe(true);
      expect(service.evaluate({ field: 'saccoId', operator: '==', value: 'sacco-ghi' }, context).matched).toBe(true);
    });
  });
});
