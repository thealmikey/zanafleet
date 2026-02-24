import { JobTypeMode, JobTypeStatus, MetadataFieldType, Vertical } from '../../dto/job-type.enums';
import { JobTypeMetadataFieldEntity } from '../../entities/job-type-metadata-field.entity';
import { JobTypeWorkerConfigEntity } from '../../entities/job-type-worker-config.entity';
import { JobTypeEntity } from '../../entities/job-type.entity';

describe('JobTypeEntity', () => {
  let entity: JobTypeEntity;

  beforeEach(() => {
    entity = new JobTypeEntity();
  });

  describe('toDomain', () => {
    it('should convert entity to domain object', () => {
      // Arrange
      const now = new Date();
      entity.id = '123e4567-e89b-12d3-a456-426614174000';
      entity.workspaceId = '223e4567-e89b-12d3-a456-426614174001';
      entity.name = 'Standard Delivery';
      entity.description = 'Standard delivery job type';
      entity.vertical = Vertical.DELIVERY;
      entity.mode = JobTypeMode.INTERNAL;
      entity.status = JobTypeStatus.ACTIVE;
      entity.supportsMultipleWorkers = false;
      entity.supportsMultipleDestinations = true;
      entity.workflowDefinitionId = null;
      entity.assignmentStrategy = { type: 'auto' } as any;
      entity.pricingStrategy = { type: 'distance', basePrice: 10 } as any;
      entity.uiLayoutConfig = { formSections: [] } as any;
      entity.slaRules = { acceptanceDeadlineMinutes: 30 } as any;
      entity.verticalSpecificSettings = null;
      entity.workerConfigs = [];
      entity.metadataFields = [];
      entity.createdAt = now;
      entity.updatedAt = now;

      // Act
      const domain = entity.toDomain();

      // Assert
      expect(domain.id).toBe(entity.id);
      expect(domain.workspaceId).toBe(entity.workspaceId);
      expect(domain.name).toBe('Standard Delivery');
      expect(domain.description).toBe('Standard delivery job type');
      expect(domain.vertical).toBe(Vertical.DELIVERY);
      expect(domain.mode).toBe(JobTypeMode.INTERNAL);
      expect(domain.status).toBe(JobTypeStatus.ACTIVE);
      expect(domain.supportsMultipleWorkers).toBe(false);
      expect(domain.supportsMultipleDestinations).toBe(true);
    });

    it('should handle null optional fields', () => {
      // Arrange
      entity.id = '123e4567-e89b-12d3-a456-426614174000';
      entity.workspaceId = '223e4567-e89b-12d3-a456-426614174001';
      entity.name = 'Test';
      entity.description = null;
      entity.vertical = Vertical.MOVING;
      entity.mode = JobTypeMode.MARKETPLACE;
      entity.status = JobTypeStatus.ACTIVE;
      entity.workflowDefinitionId = null;
      entity.assignmentStrategy = {} as any;
      entity.pricingStrategy = {} as any;
      entity.uiLayoutConfig = {} as any;
      entity.slaRules = {} as any;
      entity.supportsMultipleWorkers = false;
      entity.supportsMultipleDestinations = false;
      entity.verticalSpecificSettings = null;
      entity.workerConfigs = [];
      entity.metadataFields = [];

      // Act
      const domain = entity.toDomain();

      // Assert
      expect(domain.description).toBeNull();
      expect(domain.workflowDefinitionId).toBeNull();
    });

    it('should include worker configs in domain', () => {
      // Arrange
      const workerConfig = new JobTypeWorkerConfigEntity();
      workerConfig.id = '123e4567-e89b-12d3-a456-426614174000';
      workerConfig.jobTypeId = '223e4567-e89b-12d3-a456-426614174001';
      workerConfig.workerType = 'driver';
      workerConfig.minWorkers = 1;
      workerConfig.maxWorkers = 2;
      workerConfig.required = true;
      workerConfig.qualifications = { license: 'B' };

      entity.id = '323e4567-e89b-12d3-a456-426614174003';
      entity.workspaceId = '423e4567-e89b-12d3-a456-426614174004';
      entity.name = 'Test';
      entity.vertical = Vertical.DELIVERY;
      entity.mode = JobTypeMode.INTERNAL;
      entity.status = JobTypeStatus.ACTIVE;
      entity.assignmentStrategy = {} as any;
      entity.pricingStrategy = {} as any;
      entity.uiLayoutConfig = {} as any;
      entity.slaRules = {} as any;
      entity.supportsMultipleWorkers = true;
      entity.supportsMultipleDestinations = false;
      entity.verticalSpecificSettings = null;
      entity.workerConfigs = [workerConfig];
      entity.metadataFields = [];

      // Act
      const domain = entity.toDomain();

      // Assert
      expect(domain.workerConfigs).toHaveLength(1);
      expect((domain.workerConfigs as any[])[0].workerType).toBe('driver');
    });
  });
});

describe('JobTypeWorkerConfigEntity', () => {
  let entity: JobTypeWorkerConfigEntity;

  beforeEach(() => {
    entity = new JobTypeWorkerConfigEntity();
  });

  describe('toDomain', () => {
    it('should convert worker config to domain', () => {
      // Arrange
      entity.id = '123e4567-e89b-12d3-a456-426614174000';
      entity.jobTypeId = '223e4567-e89b-12d3-a456-426614174001';
      entity.workerType = 'driver';
      entity.minWorkers = 1;
      entity.maxWorkers = 2;
      entity.required = true;
      entity.qualifications = { license: 'B' };

      // Act
      const domain = entity.toDomain();

      // Assert
      expect(domain.id).toBe(entity.id);
      expect(domain.workerType).toBe('driver');
      expect(domain.minWorkers).toBe(1);
      expect(domain.maxWorkers).toBe(2);
      expect(domain.required).toBe(true);
    });
  });
});

describe('JobTypeMetadataFieldEntity', () => {
  let entity: JobTypeMetadataFieldEntity;

  beforeEach(() => {
    entity = new JobTypeMetadataFieldEntity();
  });

  describe('toDomain', () => {
    it('should convert metadata field to domain', () => {
      // Arrange
      entity.id = '123e4567-e89b-12d3-a456-426614174000';
      entity.jobTypeId = '223e4567-e89b-12d3-a456-426614174001';
      entity.fieldKey = 'package_weight';
      entity.displayName = 'Package Weight';
      entity.description = 'Weight in kg';
      entity.fieldType = MetadataFieldType.NUMBER;
      entity.required = true;
      entity.isCustomerEditable = true;
      entity.validationRules = { min: 0, max: 100 } as any;
      entity.displayOrder = 1;
      entity.uiConfig = { placeholder: 'Enter weight' } as any;

      // Act
      const domain = entity.toDomain();

      // Assert
      expect(domain.id).toBe(entity.id);
      expect(domain.fieldKey).toBe('package_weight');
      expect(domain.displayName).toBe('Package Weight');
      expect(domain.fieldType).toBe(MetadataFieldType.NUMBER);
      expect(domain.required).toBe(true);
    });

    it('should handle optional fields', () => {
      // Arrange
      entity.id = '123e4567-e89b-12d3-a456-426614174000';
      entity.jobTypeId = '223e4567-e89b-12d3-a456-426614174001';
      entity.fieldKey = 'notes';
      entity.displayName = 'Notes';
      entity.fieldType = MetadataFieldType.TEXT;
      entity.required = false;

      // Act
      const domain = entity.toDomain();

      // Assert - optional fields are undefined when not set
      expect(domain.description).toBeUndefined();
      expect(domain.validationRules).toBeUndefined();
      expect(domain.displayOrder).toBeUndefined();
    });
  });
});
