# Location Value Object Architecture

## Overview

The Location Value Object is a core domain model in ZanaFleet that represents geographic information for riders, businesses, and saccos. This document outlines the design patterns, embedding strategies, and storage considerations for Location data across the platform.

## Location Value Object

### Definition

The `LocationData` interface defines the structure of location information:

```typescript
export interface LocationData {
  latitude: number;           // Geographic latitude (-90 to 90)
  longitude: number;          // Geographic longitude (-180 to 180)
  humanReadableName: string;  // User-friendly location name (e.g., "Westlands")
  administrativeArea: string; // City, county, or region (e.g., "Nairobi")
  country: string;            // Country name (defaults to "Kenya")
}
```

### Validation Rules

The Location Value Object enforces strict validation:

- **Latitude**: Must be a valid number between -90 and 90 degrees
- **Longitude**: Must be a valid number between -180 and 180 degrees
- **humanReadableName**: Non-empty string, max 255 characters (trimmed)
- **administrativeArea**: Non-empty string, max 255 characters (trimmed)
- **Country**: Non-empty string, max 100 characters (defaults to "Kenya")

### Serialization

The `Location` domain class in `@zanafleet/domain` provides serialization methods:

```typescript
// To JSON
location.toJSON(): LocationData

// From JSON
Location.fromJSON(data: { latitude, longitude, humanReadableName, administrativeArea, country? }): Location
```

Serialized form is used in:
- Event payloads (events are stored and transmitted as JSON)
- API responses (DTOs return serialized location objects)
- Database storage (PostgreSQL JSONB columns store the serialized form)

---

## Embed vs Reference Decision Matrix

The following table outlines when to embed location data directly vs. reference it by ID:

| Aggregate | Strategy | Rationale |
|-----------|----------|-----------|
| **Rider** | **Embed** | Location is a snapshot at registration time. Rider's operating location is rider-specific and changes independently. Allows atomic rider creation with location. |
| **Business** | **Embed** | Business address is tied to the business record. Address changes are tied to business updates. Simplifies business queries without location joins. |
| **Sacco** | **Embed** | Office location is owned by and managed as part of the Sacco aggregate. Location is core to Sacco identity. |
| **Delivery** | **Embed** | Pickup and dropoff locations are point-in-time snapshots at order creation. Historical accuracy is important; embedding preserves the location as it was when the order was placed. |

### Embed Strategy Details

**Embedding location directly means:**
- Location is part of the aggregate's JSON/JSONB column
- Location is created/updated atomically with the parent aggregate
- No separate location lifecycle or ownership
- Simpler queries and projections (all location data in one row)
- Immutable snapshots (location doesn't change after aggregate creation unless the whole aggregate is updated)

---

## When to Reference by LocationId

Reference a Location by ID in the following scenarios:

### Use Cases for Location References

1. **Shared Mutable Locations**
   - Warehouse, office, distribution center used by multiple entities
   - Location properties (coordinates, name) change over time and must be reflected everywhere
   - Example: A warehouse location shared by multiple delivery routes

2. **Independent Location Lifecycle**
   - Location has its own versioning and update history
   - Location entity is created/updated/deleted independently of parent aggregate
   - Location is reused across multiple aggregates

3. **Complex Location Queries**
   - Need to query across multiple aggregates by location properties
   - Performance benefits from denormalized location lookup tables
   - Advanced geographic queries (radius search, region membership)

### Reference Strategy Rules

When using LocationId references:

1. **Owner Module Creates**: Only the Location module/service can create location records
2. **Versioned Snapshots**: Location updates create new records with version numbers
3. **Soft Delete with Orphan Protection**:
   - Mark locations as deleted/archived rather than hard-deleting
   - Prevent orphaned references from parent aggregates
   - Maintain audit trail of location changes

4. **Event-Based Updates**: Location changes are published as events
   - `Location.Updated.V1` events notify subscribers
   - Subscribers update their local projections/caches
   - Maintains eventual consistency across modules

---

## API/DTO Patterns

### Create DTOs: Accept Nested Location Object

**Example: CreateSaccoDto**
```typescript
export class CreateSaccoDto {
  @ApiProperty({ description: 'Name of the Sacco' })
  name!: string;

  @ApiProperty({ type: CreateLocationDto, description: 'Sacco office location' })
  location!: CreateLocationDto;  // Nested location object

  @ApiProperty({ description: 'Contact phone' })
  contactPhone!: string;
}
```

**Example: CreateBusinessDto**
```typescript
export class CreateBusinessDto {
  @ApiProperty({ description: 'Business name' })
  businessName!: string;

  @ApiProperty({ type: CreateLocationDto, description: 'Business location' })
  location!: CreateLocationDto;  // Nested location object

  @ApiProperty({ enum: BusinessType })
  businessType!: BusinessType;
}
```

### Response DTOs: Return Nested Location Object

**Example: SaccoResponseDto**
```typescript
export class SaccoResponseDto {
  @ApiProperty({ description: 'Sacco ID' })
  id!: string;

  @ApiProperty({ type: LocationResponseDto })
  location!: LocationResponseDto;  // Nested location in response
}
```

### Migration Strategy: Old String-Based Location

For existing systems migrating from string-based location fields:

1. **Populate humanReadableName**: Use the old string value
2. **Set Coordinates to Null Initially**: `{ latitude: null, longitude: null }`
3. **Backfill Later**: Geocode the location string to obtain real coordinates
4. **Versioned Migration**: Create a versioned migration event

Example migration pattern:
```typescript
// Old format
{ location: "Nairobi, Kenya" }

// During migration
{
  location: {
    latitude: null,           // To be backfilled
    longitude: null,          // To be backfilled
    humanReadableName: "Nairobi, Kenya",
    administrativeArea: "Nairobi",
    country: "Kenya"
  }
}

// After geocoding
{
  location: {
    latitude: -1.29,
    longitude: 36.82,
    humanReadableName: "Nairobi, Kenya",
    administrativeArea: "Nairobi",
    country: "Kenya"
  }
}
```

---

## Storage Patterns

### PostgreSQL: JSONB Column

Locations are stored as JSONB columns for flexibility and query performance.

**Advantages:**
- Atomic updates with parent aggregate
- Efficient range and contains queries with JSONB operators
- Can index JSONB properties separately
- Supports denormalization for performance

**Example Entity:**
```typescript
@Entity('riders')
export class RiderEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  fullName!: string;

  @Column('jsonb')  // Location stored as JSONB
  location!: LocationData;

  @CreateDateColumn()
  createdAt!: Date;
}
```

**Query Examples:**
```sql
-- Find all riders in Nairobi
SELECT * FROM riders 
WHERE location->>'administrativeArea' = 'Nairobi';

-- Find riders within geographic bounds
SELECT * FROM riders 
WHERE (location->>'latitude')::float BETWEEN -1.5 AND -1.0
  AND (location->>'longitude')::float BETWEEN 36.5 AND 37.0;
```

### Neo4j: Separate Properties for Query Flexibility

In Neo4j projections, location data is stored as separate node properties rather than a single JSON object. This enables:
- Direct Cypher property access without JSON parsing
- Indexed geographic queries
- Relationship traversal based on location

**Example Neo4j Node:**
```cypher
CREATE (:Rider {
  id: 'rider-123',
  fullName: 'John Kamau',
  phone: '+254712345678',
  latitude: -1.29,
  longitude: 36.82,
  humanReadableName: 'Westlands',
  administrativeArea: 'Nairobi',
  country: 'Kenya',
  vehicleType: 'Bike',
  createdAt: datetime('2024-01-15T10:30:00Z')
})
```

**Query Examples:**
```cypher
-- Find all riders in Nairobi
MATCH (r:Rider) 
WHERE r.administrativeArea = 'Nairobi' 
RETURN r;

-- Find riders by geographic proximity
MATCH (r:Rider) 
WHERE point.distance(
  point({latitude: r.latitude, longitude: r.longitude}),
  point({latitude: -1.29, longitude: 36.82})
) < 5000  -- within 5km
RETURN r;

-- Find riders with business in same area
MATCH (r:Rider)-[:OPERATES_IN]->(area:Area {name: 'Nairobi'})
MATCH (b:Business)-[:LOCATED_IN]->(area)
RETURN r, b;
```

**Property Indexing:**
```cypher
-- Create indexes for efficient location queries
CREATE INDEX rider_administrative_area_index FOR (r:Rider) ON (r.administrativeArea);
CREATE INDEX rider_lat_long_index FOR (r:Rider) ON (r.latitude, r.longitude);
CREATE INDEX business_administrative_area_index FOR (b:Business) ON (b.administrativeArea);
```

---

## Implementation Checklist

- [x] Location Value Object defined in `@zanafleet/domain`
- [x] LocationData interface in `@zanafleet/contracts`
- [x] Zod schema for Location validation
- [x] Location DTOs (CreateLocationDto, LocationResponseDto)
- [x] Rider, Business, and Sacco entities use JSONB location columns
- [x] Sacco, Business, and Rider aggregates embed location data
- [x] Neo4j projections store location as separate properties
- [x] Command handlers accept LocationData objects
- [x] Events carry LocationData in payloads
- [ ] (Future) LocationId reference pattern for shared locations
- [ ] (Future) Location service for managing independent locations
- [ ] (Future) Location versioning and audit trail

---

## Related Files

- **Domain**: `packages/domain/src/index.ts` - Location value object
- **Contracts**: `packages/contracts/src/index.ts` - LocationData interface
- **Core**: `apps/api/src/core/location/` - Location DTOs and schemas
- **Rider Module**: `apps/api/src/modules/rider/` - Rider aggregate with embedded location
- **Business Module**: `apps/api/src/modules/business/` - Business aggregate with embedded location
- **Sacco Module**: `apps/api/src/modules/sacco/` - Sacco aggregate with embedded location
