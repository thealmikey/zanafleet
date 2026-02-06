import { FormationState, RequirementType } from '../../dto/formation.enums';
import { FormationStatusChangedEventV1 } from '../../events/formation-status-changed.event';
import { RequirementCreatedEventV1 } from '../../events/requirement-created.event';
import { RequirementSatisfiedEventV1 } from '../../events/requirement-satisfied.event';

describe('Formation Events', () => {
  describe('FormationStatusChangedEventV1', () => {
    it('serializes and deserializes symmetrically', () => {
      const occurredAt = new Date('2024-01-01T00:00:00.000Z');
      const eventId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const entityId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const correlationId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      const causationId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

      const event = new FormationStatusChangedEventV1({
        eventId,
        entityType: 'Workspace',
        entityId,
        previousState: FormationState.DRAFT,
        newState: FormationState.PENDING,
        occurredAt,
        correlationId,
        causationId,
      });

      const json = event.toJSON();

      expect(json).toEqual({
        eventId,
        eventType: 'FormationStatusChangedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: occurredAt.toISOString(),
        aggregateId: entityId,
        aggregateType: 'FormationStatus',
        entityType: 'Workspace',
        entityId,
        previousState: FormationState.DRAFT,
        newState: FormationState.PENDING,
        correlationId,
        causationId,
      });

      const restored = FormationStatusChangedEventV1.fromJSON(json);

      expect(restored).toEqual(event);
      expect(restored.toJSON()).toEqual(json);
    });
  });

  describe('RequirementCreatedEventV1', () => {
    it('serializes and deserializes symmetrically', () => {
      const eventId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
      const requirementId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const entityId = '11111111-2222-3333-4444-555555555555';
      const createdAt = new Date('2024-02-02T12:30:00.000Z');
      const occurredAt = new Date('2024-02-02T12:35:00.000Z');
      const correlationId = '99999999-aaaa-bbbb-cccc-dddddddddddd';
      const causationId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

      const event = new RequirementCreatedEventV1({
        eventId,
        requirementId,
        entityType: 'Workspace',
        entityId,
        type: RequirementType.FIELD,
        key: 'business_license',
        description: 'Provide a valid business license number',
        blocking: true,
        satisfied: false,
        targetEntityId: null,
        createdAt,
        occurredAt,
        correlationId,
        causationId,
      });

      const json = event.toJSON();

      expect(json).toEqual({
        eventId,
        eventType: 'RequirementCreatedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: occurredAt.toISOString(),
        aggregateId: requirementId,
        aggregateType: 'Requirement',
        requirementId,
        entityType: 'Workspace',
        entityId,
        type: RequirementType.FIELD,
        key: 'business_license',
        description: 'Provide a valid business license number',
        blocking: true,
        satisfied: false,
        targetEntityId: null,
        createdAt: createdAt.toISOString(),
        correlationId,
        causationId,
      });

      const restored = RequirementCreatedEventV1.fromJSON(json);

      expect(restored).toEqual(event);
      expect(restored.toJSON()).toEqual(json);
    });
  });

  describe('RequirementSatisfiedEventV1', () => {
    it('serializes and deserializes symmetrically', () => {
      const eventId = '12121212-3434-5656-7878-909090909090';
      const requirementId = 'abababab-cdcd-efef-0101-234567890123';
      const entityId = 'fedcba98-7654-3210-ffff-eeeeeeeeeeee';
      const satisfiedAt = new Date('2024-03-03T08:15:00.000Z');
      const occurredAt = new Date('2024-03-03T08:16:00.000Z');
      const correlationId = '12345678-90ab-cdef-1234-567890abcdef';
      const causationId = 'abcdef12-3456-7890-abcd-ef1234567890';

      const event = new RequirementSatisfiedEventV1({
        eventId,
        requirementId,
        entityType: 'Workspace',
        entityId,
        key: 'business_license',
        satisfiedAt,
        occurredAt,
        correlationId,
        causationId,
      });

      const json = event.toJSON();

      expect(json).toEqual({
        eventId,
        eventType: 'RequirementSatisfiedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: occurredAt.toISOString(),
        aggregateId: requirementId,
        aggregateType: 'Requirement',
        requirementId,
        entityType: 'Workspace',
        entityId,
        key: 'business_license',
        satisfiedAt: satisfiedAt.toISOString(),
        correlationId,
        causationId,
      });

      const restored = RequirementSatisfiedEventV1.fromJSON(json);

      expect(restored).toEqual(event);
      expect(restored.toJSON()).toEqual(json);
    });
  });
});
