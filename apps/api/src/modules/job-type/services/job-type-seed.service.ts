/**
 * JobType Seed Service
 *
 * Seeds initial job types for different verticals
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeWorkerConfigEntity } from '../entities/job-type-worker-config.entity';
import { JobTypeMetadataFieldEntity } from '../entities/job-type-metadata-field.entity';
import { Vertical, JobTypeMode, JobTypeStatus } from '../dto/job-type.enums';
import { CreateJobTypeCommandInput } from '../commands/create-job-type.command';

/**
 * Job Type Templates
 * Pre-built templates for different verticals
 */
export const JOB_TYPE_TEMPLATES: Record<Vertical, CreateJobTypeCommandInput[]> = {
  [Vertical.DELIVERY]: [
    {
      workspaceId: '', // Will be replaced per workspace
      name: 'Standard Delivery',
      description: 'Standard delivery service with scheduled pickup and drop-off',
      vertical: Vertical.DELIVERY,
      mode: JobTypeMode.INTERNAL,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: false,
      supportsMultipleDestinations: false,
      workerConfigs: [{ workerType: 'driver', minWorkers: 1, required: true }],
      metadataFields: [
        {
          fieldKey: 'pickup_address',
          displayName: 'Pickup Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'delivery_address',
          displayName: 'Delivery Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'package_description',
          displayName: 'Package Description',
          fieldType: 'text',
          required: true,
        },
        {
          fieldKey: 'package_weight',
          displayName: 'Package Weight (kg)',
          fieldType: 'number',
          required: false,
        },
        {
          fieldKey: 'delivery_instructions',
          displayName: 'Delivery Instructions',
          fieldType: 'text',
          required: false,
        },
      ],
      assignmentStrategy: { type: 'auto' },
      pricingStrategy: { type: 'distance', basePrice: 500, currency: 'KES', distanceRate: 50 },
    },
    {
      workspaceId: '',
      name: 'Express Delivery',
      description: 'Fast delivery service with priority handling',
      vertical: Vertical.DELIVERY,
      mode: JobTypeMode.INTERNAL,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: false,
      supportsMultipleDestinations: false,
      workerConfigs: [{ workerType: 'driver', minWorkers: 1, required: true }],
      metadataFields: [
        {
          fieldKey: 'pickup_address',
          displayName: 'Pickup Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'delivery_address',
          displayName: 'Delivery Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'package_description',
          displayName: 'Package Description',
          fieldType: 'text',
          required: true,
        },
        {
          fieldKey: 'delivery_time',
          displayName: 'Required Delivery Time',
          fieldType: 'datetime',
          required: true,
        },
      ],
      assignmentStrategy: { type: 'auto' },
      pricingStrategy: { type: 'fixed', basePrice: 1500, currency: 'KES' },
    },
    {
      workspaceId: '',
      name: 'Scheduled Delivery',
      description: 'Delivery scheduled for a specific date and time',
      vertical: Vertical.DELIVERY,
      mode: JobTypeMode.CONSUMER,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: false,
      supportsMultipleDestinations: false,
      workerConfigs: [{ workerType: 'driver', minWorkers: 1, required: true }],
      metadataFields: [
        {
          fieldKey: 'pickup_address',
          displayName: 'Pickup Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'delivery_address',
          displayName: 'Delivery Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'scheduled_date',
          displayName: 'Scheduled Date',
          fieldType: 'date',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'scheduled_time',
          displayName: 'Scheduled Time',
          fieldType: 'datetime',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'package_details',
          displayName: 'Package Details',
          fieldType: 'text',
          required: true,
        },
      ],
      assignmentStrategy: { type: 'manual' },
      pricingStrategy: { type: 'distance', basePrice: 300, currency: 'KES', distanceRate: 30 },
      uiLayoutConfig: {
        consumerBooking: {
          enabled: true,
          requireAuthentication: false,
          allowScheduleFuture: true,
          maxAdvanceBookingDays: 30,
        },
      },
    },
  ],
  [Vertical.MOVING]: [
    {
      workspaceId: '',
      name: 'Home Move',
      description: 'Full home moving service with loading and unloading',
      vertical: Vertical.MOVING,
      mode: JobTypeMode.INTERNAL,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: true,
      supportsMultipleDestinations: true,
      workerConfigs: [
        { workerType: 'driver', minWorkers: 1, required: true },
        { workerType: 'loader', minWorkers: 2, maxWorkers: 4, required: true },
      ],
      metadataFields: [
        {
          fieldKey: 'pickup_address',
          displayName: 'Pickup Address',
          fieldType: 'address',
          required: true,
        },
        {
          fieldKey: 'destination_address',
          displayName: 'Destination Address',
          fieldType: 'address',
          required: true,
        },
        { fieldKey: 'move_date', displayName: 'Move Date', fieldType: 'date', required: true },
        {
          fieldKey: 'floor_number',
          displayName: 'Floor Number',
          fieldType: 'number',
          required: false,
        },
        {
          fieldKey: 'has_elevator',
          displayName: 'Has Elevator',
          fieldType: 'boolean',
          required: false,
        },
        {
          fieldKey: 'inventory_list',
          displayName: 'Inventory List',
          fieldType: 'file',
          required: true,
        },
        {
          fieldKey: 'special_items',
          displayName: 'Special Items',
          fieldType: 'text',
          required: false,
        },
      ],
      assignmentStrategy: { type: 'auto' },
      pricingStrategy: { type: 'hourly', basePrice: 2000, currency: 'KES', hourlyRate: 500 },
    },
    {
      workspaceId: '',
      name: 'Office Move',
      description: 'Office relocation service with IT equipment handling',
      vertical: Vertical.MOVING,
      mode: JobTypeMode.INTERNAL,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: true,
      supportsMultipleDestinations: true,
      workerConfigs: [
        { workerType: 'driver', minWorkers: 1, required: true },
        { workerType: 'technician', minWorkers: 1, required: false },
        { workerType: 'loader', minWorkers: 2, maxWorkers: 6, required: true },
      ],
      metadataFields: [
        {
          fieldKey: 'pickup_address',
          displayName: 'Pickup Address',
          fieldType: 'address',
          required: true,
        },
        {
          fieldKey: 'destination_address',
          displayName: 'Destination Address',
          fieldType: 'address',
          required: true,
        },
        { fieldKey: 'move_date', displayName: 'Move Date', fieldType: 'date', required: true },
        {
          fieldKey: 'company_name',
          displayName: 'Company Name',
          fieldType: 'text',
          required: true,
        },
        {
          fieldKey: 'employee_count',
          displayName: 'Number of Employees',
          fieldType: 'number',
          required: false,
        },
        {
          fieldKey: 'it_equipment_count',
          displayName: 'IT Equipment Count',
          fieldType: 'number',
          required: false,
        },
      ],
      assignmentStrategy: {
        type: 'hybrid',
        hybridConfig: { autoThresholdMinutes: 30, escalateOnThresholdBreach: true },
      },
      pricingStrategy: { type: 'hybrid', basePrice: 5000, currency: 'KES', hourlyRate: 1000 },
    },
  ],
  [Vertical.WHOLESALE]: [
    {
      workspaceId: '',
      name: 'Bulk Wholesale Delivery',
      description: 'Large volume delivery to multiple retail locations',
      vertical: Vertical.WHOLESALE,
      mode: JobTypeMode.INTERNAL,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: true,
      supportsMultipleDestinations: true,
      workerConfigs: [
        { workerType: 'driver', minWorkers: 1, required: true },
        { workerType: 'loader', minWorkers: 1, maxWorkers: 2, required: true },
      ],
      metadataFields: [
        {
          fieldKey: 'warehouse_pickup',
          displayName: 'Warehouse Pickup Location',
          fieldType: 'address',
          required: true,
        },
        {
          fieldKey: 'destinations',
          displayName: 'Delivery Destinations',
          fieldType: 'multiselect',
          required: true,
        },
        {
          fieldKey: 'delivery_window_start',
          displayName: 'Delivery Window Start',
          fieldType: 'datetime',
          required: true,
        },
        {
          fieldKey: 'delivery_window_end',
          displayName: 'Delivery Window End',
          fieldType: 'datetime',
          required: true,
        },
        {
          fieldKey: 'cargo_manifest',
          displayName: 'Cargo Manifest',
          fieldType: 'file',
          required: true,
        },
      ],
      assignmentStrategy: { type: 'auto' },
      pricingStrategy: { type: 'distance', basePrice: 3000, currency: 'KES', distanceRate: 100 },
    },
  ],
  [Vertical.FLEET]: [
    {
      workspaceId: '',
      name: 'Fleet Charter',
      description: 'Charter a fleet of vehicles for large operations',
      vertical: Vertical.FLEET,
      mode: JobTypeMode.INTERNAL,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: true,
      supportsMultipleDestinations: false,
      workerConfigs: [
        { workerType: 'driver', minWorkers: 1, maxWorkers: 10, required: true },
        { workerType: 'vehicle', minWorkers: 1, maxWorkers: 10, required: true },
      ],
      metadataFields: [
        {
          fieldKey: 'pickup_location',
          displayName: 'Pickup Location',
          fieldType: 'address',
          required: true,
        },
        {
          fieldKey: 'charter_duration',
          displayName: 'Charter Duration (hours)',
          fieldType: 'number',
          required: true,
        },
        {
          fieldKey: 'vehicle_count',
          displayName: 'Number of Vehicles',
          fieldType: 'number',
          required: true,
        },
        {
          fieldKey: 'driver_count',
          displayName: 'Number of Drivers',
          fieldType: 'number',
          required: true,
        },
        {
          fieldKey: 'route_description',
          displayName: 'Route Description',
          fieldType: 'text',
          required: false,
        },
      ],
      assignmentStrategy: { type: 'manual' },
      pricingStrategy: { type: 'hourly', basePrice: 10000, currency: 'KES', hourlyRate: 2000 },
    },
  ],
  [Vertical.MARKETPLACE]: [
    {
      workspaceId: '',
      name: 'Marketplace On-Demand',
      description: 'On-demand delivery service for marketplace orders',
      vertical: Vertical.MARKETPLACE,
      mode: JobTypeMode.MARKETPLACE,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: false,
      supportsMultipleDestinations: false,
      workerConfigs: [{ workerType: 'driver', minWorkers: 1, required: true }],
      metadataFields: [
        {
          fieldKey: 'pickup_location',
          displayName: 'Pickup Location',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'delivery_location',
          displayName: 'Delivery Location',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        { fieldKey: 'order_id', displayName: 'Order ID', fieldType: 'text', required: true },
        { fieldKey: 'item_value', displayName: 'Item Value', fieldType: 'number', required: false },
      ],
      assignmentStrategy: {
        type: 'bidding',
        biddingConfig: { biddingWindowMinutes: 5, minBidders: 1, visibility: 'nearby' },
      },
      pricingStrategy: { type: 'dynamic' },
    },
    {
      workspaceId: '',
      name: 'Consumer Booking',
      description: 'Consumer-facing booking service',
      vertical: Vertical.MARKETPLACE,
      mode: JobTypeMode.CONSUMER,
      status: JobTypeStatus.ACTIVE,
      supportsMultipleWorkers: false,
      supportsMultipleDestinations: false,
      workerConfigs: [{ workerType: 'driver', minWorkers: 1, required: true }],
      metadataFields: [
        {
          fieldKey: 'pickup_address',
          displayName: 'Pickup Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'delivery_address',
          displayName: 'Delivery Address',
          fieldType: 'address',
          required: true,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'scheduled_time',
          displayName: 'Preferred Time',
          fieldType: 'datetime',
          required: false,
          isCustomerEditable: true,
        },
        {
          fieldKey: 'service_type',
          displayName: 'Service Type',
          fieldType: 'select',
          required: true,
          isCustomerEditable: true,
          options: [
            { value: 'delivery', label: 'Delivery' },
            { value: 'errand', label: 'Errand' },
          ],
        },
      ],
      assignmentStrategy: { type: 'auto' },
      pricingStrategy: { type: 'distance', basePrice: 200, currency: 'KES', distanceRate: 40 },
      uiLayoutConfig: {
        consumerBooking: {
          enabled: true,
          requireAuthentication: false,
          allowScheduleFuture: true,
          maxAdvanceBookingDays: 7,
        },
      },
    },
  ],
};

/**
 * JobTypeSeedService
 */
@Injectable()
export class JobTypeSeedService {
  private readonly logger = new Logger(JobTypeSeedService.name);

  constructor(
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>,
    @InjectRepository(JobTypeWorkerConfigEntity)
    private readonly workerConfigRepository: Repository<JobTypeWorkerConfigEntity>,
    @InjectRepository(JobTypeMetadataFieldEntity)
    private readonly metadataFieldRepository: Repository<JobTypeMetadataFieldEntity>
  ) {}

  /**
   * Seed job types for a workspace
   */
  async seedForWorkspace(workspaceId: string): Promise<void> {
    this.logger.log(`Seeding job types for workspace: ${workspaceId}`);

    for (const vertical of Object.values(Vertical)) {
      const templates = JOB_TYPE_TEMPLATES[vertical] || [];

      for (const template of templates) {
        // Check if already exists
        const existing = await this.jobTypeRepository.findOne({
          where: { workspaceId, name: template.name },
        });

        if (existing) {
          this.logger.debug(`Job type "${template.name}" already exists, skipping`);
          continue;
        }

        await this.createFromTemplate(workspaceId, template);
      }
    }

    this.logger.log(`Seeding complete for workspace: ${workspaceId}`);
  }

  /**
   * Create job type from template
   */
  private async createFromTemplate(
    workspaceId: string,
    template: CreateJobTypeCommandInput
  ): Promise<void> {
    const jobTypeId = uuidv4();
    const now = new Date();

    // Update template with workspace ID
    const templateWithWorkspace = {
      ...template,
      workspaceId,
    };

    // Create job type entity
    const jobTypeEntity = new JobTypeEntity();
    jobTypeEntity.id = jobTypeId;
    jobTypeEntity.workspaceId = templateWithWorkspace.workspaceId;
    jobTypeEntity.name = templateWithWorkspace.name;
    jobTypeEntity.description = templateWithWorkspace.description ?? null;
    jobTypeEntity.vertical = templateWithWorkspace.vertical;
    jobTypeEntity.mode = templateWithWorkspace.mode;
    jobTypeEntity.status = templateWithWorkspace.status;
    jobTypeEntity.workflowDefinitionId = templateWithWorkspace.workflowDefinitionId ?? null;
    jobTypeEntity.assignmentStrategy = templateWithWorkspace.assignmentStrategy;
    jobTypeEntity.pricingStrategy = templateWithWorkspace.pricingStrategy;
    jobTypeEntity.uiLayoutConfig = templateWithWorkspace.uiLayoutConfig;
    jobTypeEntity.slaRules = templateWithWorkspace.slaRules;
    jobTypeEntity.supportsMultipleWorkers = templateWithWorkspace.supportsMultipleWorkers;
    jobTypeEntity.supportsMultipleDestinations = templateWithWorkspace.supportsMultipleDestinations;
    jobTypeEntity.verticalSpecificSettings = templateWithWorkspace.verticalSpecificSettings ?? null;
    jobTypeEntity.createdAt = now;
    jobTypeEntity.updatedAt = now;

    await this.jobTypeRepository.save(jobTypeEntity);

    // Create worker configs
    const workerConfigs = (templateWithWorkspace.workerConfigs || []).map((wc) => {
      const config = new JobTypeWorkerConfigEntity();
      config.id = uuidv4();
      config.jobTypeId = jobTypeId;
      config.workerType = wc.workerType;
      config.minWorkers = wc.minWorkers;
      config.maxWorkers = wc.maxWorkers ?? null;
      config.required = wc.required;
      config.qualifications = wc.qualifications ?? null;
      return config;
    });

    if (workerConfigs.length > 0) {
      await this.workerConfigRepository.save(workerConfigs);
    }

    // Create metadata fields
    const metadataFields = (templateWithWorkspace.metadataFields || []).map((mf, index) => {
      const field = new JobTypeMetadataFieldEntity();
      field.id = uuidv4();
      field.jobTypeId = jobTypeId;
      field.fieldKey = mf.fieldKey;
      field.displayName = mf.displayName;
      field.description = mf.description ?? null;
      field.fieldType = mf.fieldType;
      field.required = mf.required;
      field.isCustomerEditable = mf.isCustomerEditable;
      field.validationRules = mf.validationRules ?? null;
      field.displayOrder = index;
      field.uiConfig = mf.uiConfig ?? null;
      return field;
    });

    if (metadataFields.length > 0) {
      await this.metadataFieldRepository.save(metadataFields);
    }

    this.logger.debug(`Created job type: ${templateWithWorkspace.name}`);
  }
}
