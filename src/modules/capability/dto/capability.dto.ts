/**
 * DTO for creating a capability
 * Input payload for capability creation commands
 */
export class CreateCapabilityDto {
  name: string;
}

/**
 * DTO representing a capability
 * Output DTO for queries and responses
 */
export class CapabilityDto {
  capabilityId: string; // UUID
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
