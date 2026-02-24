import { AssetType, AssetStatus, OwnerType } from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';

import { BundleStatus } from '../modules/asset/dto/asset-platform.dto';
/**
 * Nairobi Music Festival 2026 - Seed Data
 * Demonstrates complex event logistics with 12 asset movements
 */

// Mock Event Organizer (Owner)
export const EventCoId = 'org-eventco-2026';

// Concert Bundle
export const NairobiMusicFestivalBundle = {
  id: 'bundle-nairobi-music-fest-2026',
  name: 'Nairobi Music Festival 2026',
  description: '2-day outdoor concert at Uhuru Park - 10,000 attendees',
  ownerId: EventCoId,
  status: BundleStatus.CONFIRMED,
  startDate: new Date('2026-03-15T00:00:00Z'),
  endDate: new Date('2026-03-19T23:59:59Z'),
  budgetAmount: 800000, // KES
  metadata: {
    eventType: 'Music Festival',
    venue: 'Uhuru Park, Nairobi',
    expectedAttendees: 10000,
    setupDay: '2026-03-15',
    eventDays: ['2026-03-16', '2026-03-17'],
    teardownDay: '2026-03-18',
  },
};

// Assets: Trucks, Vans, Storage
export const ConcertAssets = [
  {
    id: uuidv4(),
    name: 'Isuzu FXZ 28-330 - KDB 829C',
    type: AssetType.VEHICLE,
    status: AssetStatus.ACTIVE,
    ownerId: 'owner-westside-logistics',
    ownerType: OwnerType.Organization,
    capacity: { volumeCBM: 45, weightKG: 8000 },
    metadata: { purpose: 'Stage Equipment Transport', dailyRate: 35000 },
    homeBase: { latitude: -1.2674, longitude: 36.8078, label: 'Westlands, Nairobi' },
  },
  {
    id: uuidv4(),
    name: 'Mitsubishi Canter - KCQ 121A',
    type: AssetType.VEHICLE,
    status: AssetStatus.ACTIVE,
    ownerId: 'owner-industrial-movers',
    ownerType: OwnerType.Organization,
    capacity: { volumeCBM: 30, weightKG: 5000 },
    metadata: { purpose: 'Scaffolding Transport', dailyRate: 25000 },
    homeBase: { latitude: -1.3167, longitude: 36.8833, label: 'Industrial Area, Nairobi' },
  },
  {
    id: uuidv4(),
    name: 'Toyota Hiace Refrigerated - KCL 455X',
    type: AssetType.VEHICLE,
    status: AssetStatus.ACTIVE,
    ownerId: 'owner-fresh-express',
    ownerType: OwnerType.Organization,
    capacity: { volumeCBM: 12, temperatureC: 4 },
    metadata: { purpose: 'Catering Supplies', dailyRate: 18000, coldChain: true },
    homeBase: { latitude: -1.3029, longitude: 36.7072, label: 'Karen, Nairobi' },
  },
  {
    id: uuidv4(),
    name: 'Nissan UD Tipper - KCS 888T',
    type: AssetType.VEHICLE,
    status: AssetStatus.ACTIVE,
    ownerId: 'owner-embakasi-rentals',
    ownerType: OwnerType.Individual,
    capacity: { volumeCBM: 20, weightKG: 3000 },
    metadata: { purpose: 'Portable Toilets', dailyRate: 22000 },
    homeBase: { latitude: -1.3188, longitude: 36.9278, label: 'Embakasi, Nairobi' },
  },
  {
    id: uuidv4(),
    name: 'Secure Storage Unit #7 (500 sqft)',
    type: AssetType.WAREHOUSE,
    status: AssetStatus.ACTIVE,
    ownerId: 'owner-uhuru-storage',
    ownerType: OwnerType.Organization,
    capacity: { areaSquareFeet: 500 },
    metadata: { purpose: 'Equipment Holding', dailyRate: 8000, security24h: true },
    homeBase: { latitude: -1.2833, longitude: 36.8167, label: 'Near Uhuru Park, Nairobi' },
  },
];

// Operators with Event Skills
export const ConcertOperators = [
  {
    id: uuidv4(),
    actorId: uuidv4(),
    skills: ['Heavy Lifting', 'Event Setup', 'Stage Rigging'],
    certifications: [{ name: 'NTSA Class C/E', issued: '2024', verified: true }],
    reputationScore: 4.8,
    careerHistory: { lastRole: 'Senior Rigger at Sarit Center Events' },
  },
  {
    id: uuidv4(),
    actorId: uuidv4(),
    skills: ['Cold Chain', 'Food Safety', 'Long-Distance Driving'],
    certifications: [{ name: 'Food Handler Certificate', issued: '2025', verified: true }],
    reputationScore: 4.6,
    careerHistory: { lastRole: 'Refrigerated Transport Driver' },
  },
  {
    id: uuidv4(),
    actorId: uuidv4(),
    skills: ['Heavy Lifting', 'Scaffolding Assembly'],
    certifications: [{ name: 'Height Safety Training', issued: '2023', verified: true }],
    reputationScore: 4.7,
    careerHistory: { lastRole: 'Construction Site Supervisor' },
  },
  {
    id: uuidv4(),
    actorId: uuidv4(),
    skills: ['Event Setup', 'AV Equipment Handling'],
    certifications: [{ name: 'Audio Technician Level 2', issued: '2024', verified: true }],
    reputationScore: 4.9,
    careerHistory: { lastRole: 'Sound Engineer at KICC' },
  },
  {
    id: uuidv4(),
    actorId: uuidv4(),
    skills: ['Lighting Installation', 'Electrical Safety'],
    certifications: [{ name: 'Electrician License', issued: '2022', verified: true }],
    reputationScore: 4.5,
    careerHistory: { lastRole: 'Lighting Technician for Safaricom Festival' },
  },
  {
    id: uuidv4(),
    actorId: uuidv4(),
    skills: ['General Labor', 'Equipment Transport'],
    certifications: [],
    reputationScore: 4.2,
    careerHistory: { lastRole: 'Warehouse Assistant' },
  },
];

// Pre-scheduled Trips for the Concert
export const ConcertTrips = [
  // Setup Day Pickups (Day -1: Mar 15, 2026)
  {
    id: uuidv4(),
    bundleId: NairobiMusicFestivalBundle.id,
    assetId: ConcertAssets[0].id, // Isuzu FXZ
    operatorId: ConcertOperators[0].id,
    startTime: new Date('2026-03-15T03:00:00Z'),
    endTime: null,
    metadata: {
      pickupLocation: 'Westlands',
      dropoffLocation: 'Uhuru Park',
      purpose: 'Stage Equipment',
    },
  },
  {
    id: uuidv4(),
    bundleId: NairobiMusicFestivalBundle.id,
    assetId: ConcertAssets[1].id, // Mitsubishi Canter
    operatorId: ConcertOperators[2].id,
    startTime: new Date('2026-03-15T04:00:00Z'),
    endTime: null,
    metadata: {
      pickupLocation: 'Industrial Area',
      dropoffLocation: 'Uhuru Park',
      purpose: 'Scaffolding',
    },
  },
  {
    id: uuidv4(),
    bundleId: NairobiMusicFestivalBundle.id,
    assetId: ConcertAssets[2].id, // Refrigerated Van
    operatorId: ConcertOperators[1].id,
    startTime: new Date('2026-03-15T06:00:00Z'),
    endTime: null,
    metadata: {
      pickupLocation: 'Karen',
      dropoffLocation: 'Uhuru Park',
      purpose: 'Catering Supplies',
    },
  },
  {
    id: uuidv4(),
    bundleId: NairobiMusicFestivalBundle.id,
    assetId: ConcertAssets[3].id, // Nissan UD Tipper
    operatorId: ConcertOperators[5].id,
    startTime: new Date('2026-03-15T07:00:00Z'),
    endTime: null,
    metadata: {
      pickupLocation: 'Embakasi',
      dropoffLocation: 'Uhuru Park',
      purpose: 'Portable Toilets',
    },
  },
];

export const concertSeedDataSummary = {
  bundleCount: 1,
  assetCount: ConcertAssets.length,
  operatorCount: ConcertOperators.length,
  preScheduledTrips: ConcertTrips.length,
  budgetAllocated: NairobiMusicFestivalBundle.budgetAmount,
};
