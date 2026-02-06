import { ZodError } from 'zod';

import {
  CreateRequirementCommand,
  CreateRequirementCommandRawInput,
} from '../../commands/create-requirement.command';
import {
  EvaluateFormationCommand,
  EvaluateFormationCommandRawInput,
} from '../../commands/evaluate-formation.command';
import {
  SatisfyRequirementCommand,
  SatisfyRequirementCommandRawInput,
} from '../../commands/satisfy-requirement.command';
import { RequirementType } from '../../dto/formation.enums';

describe('EvaluateFormationCommand', () => {
  const VALID_ENTITY_ID = '11111111-1111-1111-1111-111111111111';

  it('accepts valid input', () => {
    const input: EvaluateFormationCommandRawInput = {
      entityType: 'Workspace',
      entityId: VALID_ENTITY_ID,
    };

    const result = EvaluateFormationCommand.validate(input);

    expect(result).toEqual({
      entityType: 'Workspace',
      entityId: VALID_ENTITY_ID,
    });

    const command = new EvaluateFormationCommand(input);
    expect(command.entityType).toBe('Workspace');
    expect(command.entityId).toBe(VALID_ENTITY_ID);
  });

  it('rejects invalid UUID', () => {
    const input = {
      entityType: 'Workspace',
      entityId: 'not-a-uuid',
    };

    expect(() => EvaluateFormationCommand.validate(input)).toThrow(ZodError);
  });

  it('safeValidate returns failure for invalid entityType', () => {
    const input = {
      entityType: '',
      entityId: VALID_ENTITY_ID,
    };

    const result = EvaluateFormationCommand.safeValidate(input);

    expect(result.success).toBe(false);
  });
});

describe('CreateRequirementCommand', () => {
  const VALID_ENTITY_ID = '22222222-2222-2222-2222-222222222222';
  const VALID_TARGET_ENTITY_ID = '33333333-3333-3333-3333-333333333333';

  it('accepts valid field requirement and defaults blocking to true', () => {
    const input: CreateRequirementCommandRawInput = {
      entityType: 'Workspace',
      entityId: VALID_ENTITY_ID,
      type: RequirementType.FIELD,
      key: 'business_license',
      description: 'Provide a valid business license number',
    };

    const result = CreateRequirementCommand.validate(input);

    expect(result.blocking).toBe(true);
    expect(result.targetEntityId).toBeUndefined();

    const command = new CreateRequirementCommand(input);
    expect(command.blocking).toBe(true);
    expect(command.targetEntityId).toBeNull();
  });

  it('accepts relationship requirement when targetEntityId is provided', () => {
    const input: CreateRequirementCommandRawInput = {
      entityType: 'Workspace',
      entityId: VALID_ENTITY_ID,
      type: RequirementType.RELATIONSHIP,
      key: 'mentor_actor',
      description: 'Workspace must be linked to a mentor actor',
      targetEntityId: VALID_TARGET_ENTITY_ID,
      blocking: false,
    };

    const result = CreateRequirementCommand.validate(input);

    expect(result.targetEntityId).toBe(VALID_TARGET_ENTITY_ID);

    const command = new CreateRequirementCommand(input);
    expect(command.targetEntityId).toBe(VALID_TARGET_ENTITY_ID);
    expect(command.blocking).toBe(false);
  });

  it('rejects relationship requirement without targetEntityId', () => {
    const input = {
      entityType: 'Workspace',
      entityId: VALID_ENTITY_ID,
      type: RequirementType.RELATIONSHIP,
      key: 'mentor_actor',
      description: 'Workspace must be linked to a mentor actor',
    };

    expect(() => CreateRequirementCommand.validate(input)).toThrow(ZodError);
  });

  it('rejects non-relationship requirement with targetEntityId', () => {
    const input = {
      entityType: 'Workspace',
      entityId: VALID_ENTITY_ID,
      type: RequirementType.FIELD,
      key: 'business_license',
      description: 'Provide a valid business license number',
      targetEntityId: VALID_TARGET_ENTITY_ID,
    };

    expect(() => CreateRequirementCommand.validate(input)).toThrow(ZodError);
  });

  it('safeValidate returns failure for missing key', () => {
    const input = {
      entityType: 'Workspace',
      entityId: VALID_ENTITY_ID,
      type: RequirementType.FIELD,
      key: '',
      description: 'Provide a valid business license number',
    };

    const result = CreateRequirementCommand.safeValidate(input);

    expect(result.success).toBe(false);
  });
});

describe('SatisfyRequirementCommand', () => {
  const VALID_REQUIREMENT_ID = '44444444-4444-4444-4444-444444444444';

  it('accepts valid input', () => {
    const input: SatisfyRequirementCommandRawInput = {
      requirementId: VALID_REQUIREMENT_ID,
    };

    const result = SatisfyRequirementCommand.validate(input);

    expect(result.requirementId).toBe(VALID_REQUIREMENT_ID);

    const command = new SatisfyRequirementCommand(input);
    expect(command.requirementId).toBe(VALID_REQUIREMENT_ID);
  });

  it('rejects invalid requirementId', () => {
    const input = {
      requirementId: 'not-a-uuid',
    };

    expect(() => SatisfyRequirementCommand.validate(input)).toThrow(ZodError);
  });

  it('safeValidate returns failure when requirementId is missing', () => {
    const input = {};

    const result = SatisfyRequirementCommand.safeValidate(input);

    expect(result.success).toBe(false);
  });
});
