import { OrganizationType, OrganizationStatus } from './organization.enums';

/**
 * DTO for creating an organization
 * Input payload for CreateOrganizationCommand
 */
export class CreateOrganizationDto {
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  linkedWallets?: string[]; // Array of wallet UUIDs
}

/**
 * DTO representing a complete Organization entity
 * Output DTO for queries and responses
 */
export class OrganizationDto {
  organizationId: string; // UUID
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  linkedWallets: string[]; // Array of wallet UUIDs
  createdAt: Date;
  updatedAt: Date;
}
