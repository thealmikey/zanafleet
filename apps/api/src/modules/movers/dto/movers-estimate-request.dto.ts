import { HouseSize } from './house-size.enum';

/**
 * Location input for moving estimate requests
 */
export interface LocationInput {
  /** Google Places ID or similar identifier */
  placeId: string;
  /** Formatted address string */
  formattedAddress: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Locality/suburb name */
  locality?: string;
  /** Region/state name */
  region?: string;
  /** Country name */
  country?: string;
  /** Postal code if available */
  postalCode?: string;
}

/**
 * House size enum for movers estimate
 */
export enum HouseSizeEnum {
  STUDIO = 'studio',
  ONE_BEDROOM = '1br',
  TWO_BEDROOM = '2br',
  THREE_BEDROOM = '3br',
  FOUR_PLUS = '4br+',
}

/**
 * Moving estimate request DTO
 * Represents a user's request for a moving quote estimate
 */
export class MoversEstimateRequestDto {
  /** Origin location */
  fromLocation!: LocationInput;
  /** Destination location */
  toLocation!: LocationInput;
  /** Size of the current/residence */
  fromHouseSize!: HouseSizeEnum;
  /** Size of the destination residence */
  toHouseSize!: HouseSizeEnum;
  /** Requested move date in ISO format (optional) */
  requestedDate?: string;
  /** Whether to include insurance in the quote */
  includeInsurance?: boolean;
  /** Whether to include packing service */
  includePacking?: boolean;
  /** Number of floors at origin (affects labor) */
  fromFloorCount?: number;
  /** Number of floors at destination (affects labor) */
  toFloorCount?: number;
  /** Whether elevator is available at origin */
  hasElevatorFrom?: boolean;
  /** Whether elevator is available at destination */
  hasElevatorTo?: boolean;
  /** Fragility level of items */
  fragilityLevel?: 'low' | 'medium' | 'high';
  /** Special items that require extra handling */
  specialItems?: string[];
  /** Access restrictions (narrow stairs, parking limitations, etc.) */
  accessRestrictions?: string[];
  /** Customer's first name */
  firstName?: string;
  /** Customer's last name */
  lastName?: string;
  /** Customer's email */
  email?: string;
  /** Customer's phone number */
  phone?: string;
}

/**
 * Validate the estimate request
 */
export function validateMoversEstimateRequest(dto: MoversEstimateRequestDto): string[] {
  const errors: string[] = [];

  if (!dto.fromLocation) {
    errors.push('Origin location is required');
  } else {
    if (!dto.fromLocation.latitude || !dto.fromLocation.longitude) {
      errors.push('Origin coordinates are required');
    }
    if (!dto.fromLocation.formattedAddress) {
      errors.push('Origin formatted address is required');
    }
  }

  if (!dto.toLocation) {
    errors.push('Destination location is required');
  } else {
    if (!dto.toLocation.latitude || !dto.toLocation.longitude) {
      errors.push('Destination coordinates are required');
    }
    if (!dto.toLocation.formattedAddress) {
      errors.push('Destination formatted address is required');
    }
  }

  if (!dto.fromHouseSize) {
    errors.push('Origin house size is required');
  }

  if (!dto.toHouseSize) {
    errors.push('Destination house size is required');
  }

  if (dto.requestedDate) {
    const requestedDate = new Date(dto.requestedDate);
    if (isNaN(requestedDate.getTime())) {
      errors.push('Requested date must be a valid ISO date string');
    } else if (requestedDate < new Date()) {
      errors.push('Requested date cannot be in the past');
    }
  }

  return errors;
}

/**
 * Convert HouseSizeEnum to HouseSize for internal use
 */
export function mapHouseSizeEnumToHouseSize(houseSizeEnum: HouseSizeEnum): HouseSize {
  const mapping: Record<HouseSizeEnum, HouseSize> = {
    [HouseSizeEnum.STUDIO]: HouseSize.STUDIO,
    [HouseSizeEnum.ONE_BEDROOM]: HouseSize.ONE_BEDROOM,
    [HouseSizeEnum.TWO_BEDROOM]: HouseSize.TWO_BEDROOM,
    [HouseSizeEnum.THREE_BEDROOM]: HouseSize.THREE_BEDROOM,
    [HouseSizeEnum.FOUR_PLUS]: HouseSize.FOUR_PLUS,
  };
  return mapping[houseSizeEnum];
}

/**
 * Convert HouseSize to HouseSizeEnum for API responses
 */
export function mapHouseSizeToHouseSizeEnum(houseSize: HouseSize): HouseSizeEnum {
  const mapping: Record<HouseSize, HouseSizeEnum> = {
    [HouseSize.STUDIO]: HouseSizeEnum.STUDIO,
    [HouseSize.ONE_BEDROOM]: HouseSizeEnum.ONE_BEDROOM,
    [HouseSize.TWO_BEDROOM]: HouseSizeEnum.TWO_BEDROOM,
    [HouseSize.THREE_BEDROOM]: HouseSizeEnum.THREE_BEDROOM,
    [HouseSize.FOUR_PLUS]: HouseSizeEnum.FOUR_PLUS,
  };
  return mapping[houseSize];
}
