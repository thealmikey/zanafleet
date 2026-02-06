import { FormationState, RequirementType } from '../../dto/formation.enums';
import { FormationStatusEntity } from '../../entities/formation-status.entity';
import { RequirementEntity } from '../../entities/requirement.entity';

describe('FormationStatusEntity', () => {
  it('should map entity to domain representation', () => {
    const lastEvaluatedAt = new Date();
    const entity = new FormationStatusEntity();
    entity.id = 'f7c9a6a4-2d81-4f17-8f6f-0be59b2bc1a5';
    entity.entityType = 'Workspace';
    entity.entityId = 'dcf3c850-033c-4ce8-8a77-7e4b23621457';
    entity.state = FormationState.ACTIVE;
    entity.lastEvaluatedAt = lastEvaluatedAt;

    expect(entity.toDomain()).toEqual({
      formationStatusId: 'f7c9a6a4-2d81-4f17-8f6f-0be59b2bc1a5',
      entityType: 'Workspace',
      entityId: 'dcf3c850-033c-4ce8-8a77-7e4b23621457',
      state: FormationState.ACTIVE,
      lastEvaluatedAt,
    });
  });

  it('should map domain data to entity with defaults', () => {
    const entity = FormationStatusEntity.fromDomain({
      formationStatusId: '9db421de-63d0-4f6c-a70f-6a700235e3f3',
      entityType: 'Actor',
      entityId: '0ce7b8b4-2b73-4bdd-bf23-01de9cc6a7c8',
    });

    expect(entity.id).toBe('9db421de-63d0-4f6c-a70f-6a700235e3f3');
    expect(entity.entityType).toBe('Actor');
    expect(entity.entityId).toBe('0ce7b8b4-2b73-4bdd-bf23-01de9cc6a7c8');
    expect(entity.state).toBe(FormationState.DRAFT);
  });
});

describe('RequirementEntity', () => {
  it('should map entity to domain representation', () => {
    const createdAt = new Date();
    const entity = new RequirementEntity();
    entity.requirementId = 'b12d0b5c-1d9b-4b67-8f6e-ea74bb3dbf4b';
    entity.entityType = 'Workspace';
    entity.entityId = 'b4e8b65e-3a8a-4a0a-a0c9-93d94b6a3af2';
    entity.type = RequirementType.FIELD;
    entity.key = 'tax_id';
    entity.description = 'Provide the workspace tax registration number';
    entity.blocking = true;
    entity.satisfied = false;
    entity.targetEntityId = null;
    entity.createdAt = createdAt;

    expect(entity.toDomain()).toEqual({
      requirementId: 'b12d0b5c-1d9b-4b67-8f6e-ea74bb3dbf4b',
      entityType: 'Workspace',
      entityId: 'b4e8b65e-3a8a-4a0a-a0c9-93d94b6a3af2',
      type: RequirementType.FIELD,
      key: 'tax_id',
      description: 'Provide the workspace tax registration number',
      blocking: true,
      satisfied: false,
      targetEntityId: null,
      createdAt,
    });
  });

  it('should map domain data to entity with defaults', () => {
    const domainCreatedAt = new Date();
    const entity = RequirementEntity.fromDomain({
      requirementId: 'c23b4b72-7a0a-4b7c-845f-2f1a138d1e25',
      entityType: 'Actor',
      entityId: '0c82ab65-9477-4f1c-a8e5-7542e0b1efdb',
      type: RequirementType.RELATIONSHIP,
      key: 'mentor_actor',
      description: 'Actor must be linked to a mentor',
      targetEntityId: 'fd3a0e0b-13f4-4fd9-8b6b-41d4b82f0aef',
      createdAt: domainCreatedAt,
    });

    expect(entity.requirementId).toBe('c23b4b72-7a0a-4b7c-845f-2f1a138d1e25');
    expect(entity.blocking).toBe(true);
    expect(entity.satisfied).toBe(false);
    expect(entity.targetEntityId).toBe('fd3a0e0b-13f4-4fd9-8b6b-41d4b82f0aef');
    expect(entity.createdAt).toBe(domainCreatedAt);
  });

  it('should default nullable targetEntityId to null when not provided', () => {
    const entity = RequirementEntity.fromDomain({
      requirementId: '7c7a2547-28d1-4e2f-b3ff-9f4d1a2c1c39',
      entityType: 'Workspace',
      entityId: '34e4ef5d-6f5f-4d15-9a33-5947716f0ea2',
      type: RequirementType.EXTERNAL,
      key: 'compliance_certificate',
      description: 'Upload the external compliance certificate',
    });

    expect(entity.targetEntityId).toBeNull();
    expect(entity.blocking).toBe(true);
    expect(entity.satisfied).toBe(false);
  });
});
