import { OrganizationType, OrganizationStatus } from './organization.enums';

/**
 * DTO for creating an organization
 * Input payload for CreateOrganizationCommand
 */
export class CreateOrganizationDto {
  name!: string;
  type!: OrganizationType;
  status!: OrganizationStatus;
  linkedWallets?: string[]; // Array of wallet UUIDs

  /**
   * Optional actor ID of the user creating the organization.
   * When provided, triggers admin-by-default behavior:
   * - For SACCO/BUSINESS types, automatically creates a default workspace
   * - Assigns the creating actor as ADMIN of the new workspace
   */
  createdByActorId?: string;
}

/**
 * DTO representing a complete Organization entity
 * Output DTO for queries and responses
 */
export class OrganizationDto {
  organizationId!: string; // UUID
  name!: string;
  type!: OrganizationType;
  status!: OrganizationStatus;
  linkedWallets!: string[]; // Array of wallet UUIDs
  createdAt!: Date;
  updatedAt!: Date;
}
