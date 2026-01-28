import { OrganizationStatus, OrganizationType } from './organization.enums';

/**
 * DTO for updating an organization
 * Mirrors UpdateOrganizationCommand input structure
 */
export class UpdateOrganizationDto {
  name?: string;
  type?: OrganizationType;
  status?: OrganizationStatus;
  linkedWallets?: string[];
}
