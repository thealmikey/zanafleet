import { OrganizationStatus, OrganizationType } from './organization.enums';

/**
 * DTO for updating an organization
 * Mirrors UpdateOrganizationCommand input structure
 */
export class UpdateOrganizationDto {
  organizationId: string;
  name?: string;
  type?: OrganizationType;
  status?: OrganizationStatus;
  linkedWallets?: string[];
}
