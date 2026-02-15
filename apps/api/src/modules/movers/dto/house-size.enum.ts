/**
 * House Size Enum
 * Represents the size of a residence for moving estimates
 */
export enum HouseSize {
  STUDIO = 'studio',
  ONE_BEDROOM = '1br',
  TWO_BEDROOM = '2br',
  THREE_BEDROOM = '3br',
  FOUR_PLUS = '4br+',
}

/**
 * House size metadata for calculations
 */
export const HOUSE_SIZE_CONFIG: Record<HouseSize, { 
  label: string; 
  capacityCubicMeters: number; 
  rooms: number;
}> = {
  [HouseSize.STUDIO]: { 
    label: 'Studio', 
    capacityCubicMeters: 8,
    rooms: 0,
  },
  [HouseSize.ONE_BEDROOM]: { 
    label: '1 Bedroom', 
    capacityCubicMeters: 15,
    rooms: 1,
  },
  [HouseSize.TWO_BEDROOM]: { 
    label: '2 Bedrooms', 
    capacityCubicMeters: 25,
    rooms: 2,
  },
  [HouseSize.THREE_BEDROOM]: { 
    label: '3 Bedrooms', 
    capacityCubicMeters: 40,
    rooms: 3,
  },
  [HouseSize.FOUR_PLUS]: { 
    label: '4+ Bedrooms', 
    capacityCubicMeters: 60,
    rooms: 4,
  },
};
