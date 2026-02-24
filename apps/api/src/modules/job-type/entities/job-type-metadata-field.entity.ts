/**
 * JobType Metadata Field Entity
 *
 * Defines configurable metadata fields for a job type
 */

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { MetadataFieldType } from '../dto/job-type.enums';

/**
 * Forward declaration to avoid circular dependency
 */
export class JobTypeEntity {
  [key: string]: unknown;
}

/**
 * JobTypeMetadataFieldEntity
 *
 * Defines a metadata field for a job type including:
 * - Field key and display name
 * - Field type and validation rules
 * - Whether it's required or customer-editable
 * - Display order and UI configuration
 */
@Entity('job_type_metadata_fields')
export class JobTypeMetadataFieldEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  jobTypeId!: string;

  @ManyToOne('JobTypeEntity', 'metadataFields', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobTypeId' })
  jobType!: JobTypeEntity;

  @Column('varchar', { length: 100 })
  fieldKey!: string;

  @Column('varchar', { length: 255 })
  displayName!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('enum', { enum: MetadataFieldType, default: MetadataFieldType.TEXT })
  fieldType!: MetadataFieldType;

  @Column('boolean', { default: false })
  required!: boolean;

  @Column('boolean', { default: false })
  isCustomerEditable!: boolean;

  @Column('jsonb', { nullable: true })
  validationRules!: Record<string, unknown> | null;

  @Column('int', { nullable: true })
  displayOrder!: number | null;

  @Column('jsonb', { nullable: true })
  uiConfig!: Record<string, unknown> | null;

  /**
   * Convert entity to domain object
   */
  toDomain(): Record<string, unknown> {
    return {
      id: this.id,
      jobTypeId: this.jobTypeId,
      fieldKey: this.fieldKey,
      displayName: this.displayName,
      description: this.description,
      fieldType: this.fieldType,
      required: this.required,
      isCustomerEditable: this.isCustomerEditable,
      validationRules: this.validationRules,
      displayOrder: this.displayOrder,
      uiConfig: this.uiConfig,
    };
  }
}
