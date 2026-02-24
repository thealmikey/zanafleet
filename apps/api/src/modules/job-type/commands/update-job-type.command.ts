/**
 * UpdateJobTypeCommand
 *
 * Command object representing the intent to update an existing job type
 */

import { z } from 'zod';

import { JobTypeMode, JobTypeStatus, Vertical } from '../dto/job-type.enums';

/**
 * Partial Worker Config Input
 */
const WorkerConfigInputSchema = z.object({
  workerType: z.string().min(1).max(100),
  minWorkers: z.number().int().min(1).default(1),
  maxWorkers: z.number().int().min(1).optional(),
  required: z.boolean().default(false),
  qualifications: z.record(z.unknown()).optional(),
});

/**
 * Partial Metadata Field Input
 */
const MetadataFieldInputSchema = z.object({
  fieldKey: z.string().min(1).max(100),
  displayName: z.string().min(1).max(255),
  description: z.string().optional(),
  fieldType: z.enum([
    'text',
    'number',
    'boolean',
    'date',
    'datetime',
    'select',
    'multiselect',
    'file',
    'location',
    'address',
    'phone',
    'email',
  ]).default('text'),
  required: z.boolean().default(false),
  isCustomerEditable: z.boolean().default(false),
  validationRules: z.record(z.unknown()).optional(),
  displayOrder: z.number().int().optional(),
  uiConfig: z.record(z.unknown()).optional(),
});

/**
 * Zod validation schema for UpdateJobTypeCommand
 */
export const UpdateJobTypeCommandSchema = z.object({
  jobTypeId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(1000).optional().or(z.null()),
  vertical: z.nativeEnum(Vertical).optional(),
  mode: z.nativeEnum(JobTypeMode).optional(),
  status: z.nativeEnum(JobTypeStatus).optional(),
  workflowDefinitionId: z.string().uuid().optional().or(z.null()),
  assignmentStrategy: z.object({
    type: z.enum(['manual', 'auto', 'bidding', 'hybrid']),
    autoAssignmentRules: z.object({
      maxDistanceKm: z.number().optional(),
      maxLoadFactor: z.number().optional(),
      preferredWorkerTypes: z.array(z.string()).optional(),
      fallbackToBidding: z.boolean().optional(),
    }).optional(),
    biddingConfig: z.object({
      biddingWindowMinutes: z.number().int().positive(),
      minBidders: z.number().int().positive(),
      visibility: z.enum(['all', 'nearby', 'preferred']),
    }).optional(),
    hybridConfig: z.object({
      autoThresholdMinutes: z.number().int().positive(),
      escalateOnThresholdBreach: z.boolean(),
    }).optional(),
  }).optional(),
  pricingStrategy: z.object({
    type: z.enum(['fixed', 'dynamic', 'hourly', 'distance', 'hybrid']),
    basePrice: z.number().optional(),
    currency: z.string().optional(),
    distanceRate: z.number().optional(),
    hourlyRate: z.number().optional(),
    surgeMultiplierRules: z.object({
      timeBased: z.array(z.object({
        peakHours: z.array(z.string()),
        multiplier: z.number().positive(),
      })).optional(),
      demandBased: z.array(z.object({
        threshold: z.number().positive(),
        multiplier: z.number().positive(),
      })).optional(),
    }).optional(),
    calculationFormula: z.string().optional(),
  }).optional(),
  uiLayoutConfig: z.object({
    formSections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      order: z.number().int(),
      fields: z.array(z.object({
        key: z.string(),
        type: z.string(),
        label: z.string(),
        required: z.boolean(),
        placeholder: z.string().optional(),
        options: z.array(z.object({
          value: z.string(),
          label: z.string(),
        })).optional(),
        validation: z.record(z.unknown()).optional(),
      })),
    })).optional(),
    detailView: z.object({
      showMap: z.boolean().optional(),
      showTimeline: z.boolean().optional(),
      showWorkerList: z.boolean().optional(),
      showPricingBreakdown: z.boolean().optional(),
    }).optional(),
    consumerBooking: z.object({
      enabled: z.boolean(),
      publicUrl: z.string().optional(),
      requireAuthentication: z.boolean().optional(),
      allowScheduleFuture: z.boolean().optional(),
      maxAdvanceBookingDays: z.number().int().positive().optional(),
    }).optional(),
  }).optional(),
  slaRules: z.object({
    acceptanceDeadlineMinutes: z.number().int().positive().optional(),
    completionDeadlineMinutes: z.number().int().positive().optional(),
    arrivalDeadlineMinutes: z.number().int().positive().optional(),
    escalationRules: z.array(z.object({
      afterMinutes: z.number().int().positive(),
      notifyRoles: z.array(z.string()),
      action: z.enum(['reassign', 'notify', 'escalate']),
    })).optional(),
    penaltyConfig: z.object({
      latePenaltyAmount: z.number().positive().optional(),
      latePenaltyType: z.enum(['flat', 'percentage']).optional(),
      gracePeriodMinutes: z.number().int().positive().optional(),
    }).optional(),
  }).optional(),
  supportsMultipleWorkers: z.boolean().optional(),
  supportsMultipleDestinations: z.boolean().optional(),
  verticalSpecificSettings: z.record(z.unknown()).optional(),
  workerConfigs: z.array(WorkerConfigInputSchema).optional(),
  metadataFields: z.array(MetadataFieldInputSchema).optional(),
});

export type UpdateJobTypeCommandInput = z.infer<typeof UpdateJobTypeCommandSchema>;

/**
 * UpdateJobTypeCommand
 */
export class UpdateJobTypeCommand {
  readonly jobTypeId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly vertical?: Vertical;
  readonly mode?: JobTypeMode;
  readonly status?: JobTypeStatus;
  readonly workflowDefinitionId?: string | null;
  readonly assignmentStrategy?: UpdateJobTypeCommandInput['assignmentStrategy'];
  readonly pricingStrategy?: UpdateJobTypeCommandInput['pricingStrategy'];
  readonly uiLayoutConfig?: UpdateJobTypeCommandInput['uiLayoutConfig'];
  readonly slaRules?: UpdateJobTypeCommandInput['slaRules'];
  readonly supportsMultipleWorkers?: boolean;
  readonly supportsMultipleDestinations?: boolean;
  readonly verticalSpecificSettings?: Record<string, unknown> | null;
  readonly workerConfigs?: UpdateJobTypeCommandInput['workerConfigs'];
  readonly metadataFields?: UpdateJobTypeCommandInput['metadataFields'];

  constructor(input: UpdateJobTypeCommandInput) {
    this.jobTypeId = input.jobTypeId;
    this.workspaceId = input.workspaceId;
    this.name = input.name;
    this.description = input.description;
    this.vertical = input.vertical;
    this.mode = input.mode;
    this.status = input.status;
    this.workflowDefinitionId = input.workflowDefinitionId;
    this.assignmentStrategy = input.assignmentStrategy;
    this.pricingStrategy = input.pricingStrategy;
    this.uiLayoutConfig = input.uiLayoutConfig;
    this.slaRules = input.slaRules;
    this.supportsMultipleWorkers = input.supportsMultipleWorkers;
    this.supportsMultipleDestinations = input.supportsMultipleDestinations;
    this.verticalSpecificSettings = input.verticalSpecificSettings;
    this.workerConfigs = input.workerConfigs;
    this.metadataFields = input.metadataFields;
  }

  /**
   * Validates command input using Zod schema
   */
  static validate(input: unknown): UpdateJobTypeCommandInput {
    return UpdateJobTypeCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, UpdateJobTypeCommandInput> {
    return UpdateJobTypeCommandSchema.safeParse(input);
  }
}
