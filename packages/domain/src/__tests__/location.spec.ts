import { Location, LocationId } from '../index';

describe('Location', () => {
  const validLocationData = {
    latitude: -1.2921,
    longitude: 36.8219,
    humanReadableName: 'Westlands',
    administrativeArea: 'Nairobi',
    country: 'Kenya',
  };

  describe('create', () => {
    it('should create a valid location with all fields', () => {
      const location = Location.create(validLocationData);

      expect(location.latitude).toBe(-1.2921);
      expect(location.longitude).toBe(36.8219);
      expect(location.humanReadableName).toBe('Westlands');
      expect(location.administrativeArea).toBe('Nairobi');
      expect(location.country).toBe('Kenya');
    });

    it('should default country to Kenya when not provided', () => {
      const location = Location.create({
        latitude: -1.2921,
        longitude: 36.8219,
        humanReadableName: 'Westlands',
        administrativeArea: 'Nairobi',
      });

      expect(location.country).toBe('Kenya');
    });

    it('should trim whitespace from string fields', () => {
      const location = Location.create({
        latitude: -1.2921,
        longitude: 36.8219,
        humanReadableName: '  Westlands  ',
        administrativeArea: '  Nairobi  ',
        country: '  Kenya  ',
      });

      expect(location.humanReadableName).toBe('Westlands');
      expect(location.administrativeArea).toBe('Nairobi');
      expect(location.country).toBe('Kenya');
    });

    describe('latitude validation', () => {
      it('should throw error when latitude is above 90', () => {
        expect(() =>
          Location.create({ ...validLocationData, latitude: 91 }),
        ).toThrow('Latitude must be between -90 and 90');
      });

      it('should throw error when latitude is below -90', () => {
        expect(() =>
          Location.create({ ...validLocationData, latitude: -91 }),
        ).toThrow('Latitude must be between -90 and 90');
      });

      it('should accept latitude at boundary values', () => {
        expect(() =>
          Location.create({ ...validLocationData, latitude: 90 }),
        ).not.toThrow();
        expect(() =>
          Location.create({ ...validLocationData, latitude: -90 }),
        ).not.toThrow();
      });

      it('should throw error when latitude is not a number', () => {
        expect(() =>
          Location.create({ ...validLocationData, latitude: NaN }),
        ).toThrow('Latitude must be a valid number');
      });
    });

    describe('longitude validation', () => {
      it('should throw error when longitude is above 180', () => {
        expect(() =>
          Location.create({ ...validLocationData, longitude: 181 }),
        ).toThrow('Longitude must be between -180 and 180');
      });

      it('should throw error when longitude is below -180', () => {
        expect(() =>
          Location.create({ ...validLocationData, longitude: -181 }),
        ).toThrow('Longitude must be between -180 and 180');
      });

      it('should accept longitude at boundary values', () => {
        expect(() =>
          Location.create({ ...validLocationData, longitude: 180 }),
        ).not.toThrow();
        expect(() =>
          Location.create({ ...validLocationData, longitude: -180 }),
        ).not.toThrow();
      });

      it('should throw error when longitude is not a number', () => {
        expect(() =>
          Location.create({ ...validLocationData, longitude: NaN }),
        ).toThrow('Longitude must be a valid number');
      });
    });

    describe('humanReadableName validation', () => {
      it('should throw error when humanReadableName is empty', () => {
        expect(() =>
          Location.create({ ...validLocationData, humanReadableName: '' }),
        ).toThrow('Human readable name is required and cannot be empty');
      });

      it('should throw error when humanReadableName is only whitespace', () => {
        expect(() =>
          Location.create({ ...validLocationData, humanReadableName: '   ' }),
        ).toThrow('Human readable name is required and cannot be empty');
      });
    });

    describe('administrativeArea validation', () => {
      it('should throw error when administrativeArea is empty', () => {
        expect(() =>
          Location.create({ ...validLocationData, administrativeArea: '' }),
        ).toThrow('Administrative area is required and cannot be empty');
      });

      it('should throw error when administrativeArea is only whitespace', () => {
        expect(() =>
          Location.create({ ...validLocationData, administrativeArea: '   ' }),
        ).toThrow('Administrative area is required and cannot be empty');
      });
    });
  });

  describe('equals', () => {
    it('should return true for locations with identical values', () => {
      const location1 = Location.create(validLocationData);
      const location2 = Location.create(validLocationData);

      expect(location1.equals(location2)).toBe(true);
    });

    it('should return false for locations with different latitude', () => {
      const location1 = Location.create(validLocationData);
      const location2 = Location.create({ ...validLocationData, latitude: -1.3 });

      expect(location1.equals(location2)).toBe(false);
    });

    it('should return false for locations with different longitude', () => {
      const location1 = Location.create(validLocationData);
      const location2 = Location.create({ ...validLocationData, longitude: 36.9 });

      expect(location1.equals(location2)).toBe(false);
    });

    it('should return false for locations with different humanReadableName', () => {
      const location1 = Location.create(validLocationData);
      const location2 = Location.create({
        ...validLocationData,
        humanReadableName: 'Kilimani',
      });

      expect(location1.equals(location2)).toBe(false);
    });

    it('should return false for locations with different administrativeArea', () => {
      const location1 = Location.create(validLocationData);
      const location2 = Location.create({
        ...validLocationData,
        administrativeArea: 'Mombasa County',
      });

      expect(location1.equals(location2)).toBe(false);
    });

    it('should return false for locations with different country', () => {
      const location1 = Location.create(validLocationData);
      const location2 = Location.create({ ...validLocationData, country: 'Uganda' });

      expect(location1.equals(location2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return a plain object with all properties', () => {
      const location = Location.create(validLocationData);
      const json = location.toJSON();

      expect(json).toEqual({
        latitude: -1.2921,
        longitude: 36.8219,
        humanReadableName: 'Westlands',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      });
    });
  });

  describe('fromJSON', () => {
    it('should reconstruct a Location from JSON', () => {
      const location = Location.create(validLocationData);
      const json = location.toJSON();
      const reconstructed = Location.fromJSON(json);

      expect(reconstructed.equals(location)).toBe(true);
    });

    it('should default country to Kenya when reconstructing', () => {
      const json = {
        latitude: -1.2921,
        longitude: 36.8219,
        humanReadableName: 'Westlands',
        administrativeArea: 'Nairobi',
      };
      const location = Location.fromJSON(json);

      expect(location.country).toBe('Kenya');
    });

    it('should throw on invalid JSON data', () => {
      expect(() =>
        Location.fromJSON({
          latitude: 91,
          longitude: 36.8219,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        }),
      ).toThrow('Latitude must be between -90 and 90');
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve all data through JSON serialization', () => {
      const original = Location.create(validLocationData);
      const json = original.toJSON();
      const restored = Location.fromJSON(json);

      expect(restored.latitude).toBe(original.latitude);
      expect(restored.longitude).toBe(original.longitude);
      expect(restored.humanReadableName).toBe(original.humanReadableName);
      expect(restored.administrativeArea).toBe(original.administrativeArea);
      expect(restored.country).toBe(original.country);
    });
  });
});

describe('LocationId', () => {
  describe('create', () => {
    it('should create a new LocationId with a UUID', () => {
      const id = LocationId.create();
      expect(id.toString()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should create unique IDs', () => {
      const id1 = LocationId.create();
      const id2 = LocationId.create();
      expect(id1.toString()).not.toBe(id2.toString());
    });
  });

  describe('from', () => {
    it('should create a LocationId from a valid string', () => {
      const value = '123e4567-e89b-12d3-a456-426614174000';
      const id = LocationId.from(value);
      expect(id.toString()).toBe(value);
    });

    it('should throw error for empty string', () => {
      expect(() => LocationId.from('')).toThrow(
        'LocationId must be a non-empty string',
      );
    });

    it('should throw error for non-string value', () => {
      expect(() => LocationId.from(null as unknown as string)).toThrow(
        'LocationId must be a non-empty string',
      );
    });
  });

  describe('equals', () => {
    it('should return true for LocationIds with the same value', () => {
      const value = '123e4567-e89b-12d3-a456-426614174000';
      const id1 = LocationId.from(value);
      const id2 = LocationId.from(value);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for LocationIds with different values', () => {
      const id1 = LocationId.create();
      const id2 = LocationId.create();
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the underlying value', () => {
      const value = 'test-location-id-123';
      const id = LocationId.from(value);
      expect(id.toString()).toBe(value);
    });
  });
});
