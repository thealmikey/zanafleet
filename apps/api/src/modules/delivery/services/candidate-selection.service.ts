import { Injectable } from '@nestjs/common';
import { VehicleType } from '@zanafleet/contracts';
import { haversineDistanceMeters, GeoPoint } from '../../../core/utils/geo.utils';

export type { GeoPoint };

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface RiderCandidate {
  riderId: string;
  lastKnownLocation: GeoPoint;
  lastSeenAt?: Date;
  vehicleType?: VehicleType;
  busyWindows?: TimeWindow[];
}

export interface RankingOptions {
  pickup: GeoPoint;
  scheduledPickupTime?: Date | null;
  scheduledDropoffTime?: Date | null;
  considerWindowMinutes?: number;
  maxDistanceMeters?: number;
  now?: Date;
}

export interface RankedCandidate extends RiderCandidate {
  distanceMeters: number;
  score: number;
}

export interface FindCandidatesParams {
  pickup: GeoPoint;
  scheduledPickupTime?: Date | null;
  scheduledDropoffTime?: Date | null;
  radiusMeters?: number;
  limit?: number;
  considerWindowMinutes?: number;
  now?: Date;
}

export interface RiderCandidateRepository {
  findNearbyRiders(params: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    now?: Date;
    limit?: number;
  }): Promise<RiderCandidate[]>;
}

const DEFAULT_RADIUS_METERS = 3000; // 3 km
const DEFAULT_WINDOW_MINUTES = 30;

function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

function resolveAnchorTime(options: {
  scheduledPickupTime?: Date | null;
  scheduledDropoffTime?: Date | null;
  now?: Date;
}): Date {
  if (options.scheduledPickupTime instanceof Date) return options.scheduledPickupTime;
  if (options.scheduledDropoffTime instanceof Date) return options.scheduledDropoffTime;
  return options.now ?? new Date();
}

function computeAvailabilityWindow(options: {
  scheduledPickupTime?: Date | null;
  scheduledDropoffTime?: Date | null;
  considerWindowMinutes?: number;
  now?: Date;
}): TimeWindow {
  const anchor = resolveAnchorTime(options);
  const minutes = options.considerWindowMinutes ?? DEFAULT_WINDOW_MINUTES;
  const ms = minutes * 60 * 1000;

  return {
    start: new Date(anchor.getTime() - ms),
    end: new Date(anchor.getTime() + ms),
  };
}

export function isAvailableDuringWindow(candidate: RiderCandidate, window: TimeWindow): boolean {
  const busy = candidate.busyWindows ?? [];
  for (const w of busy) {
    if (!(w.start instanceof Date) || !(w.end instanceof Date)) {
      // If invalid window is provided, treat as busy to be safe
      return false;
    }
    if (overlaps(window, w)) return false;
  }
  return true;
}

/**
 * Pure ranking function. Filters by distance and availability, then sorts by distance asc.
 * Ties are broken by recency of lastSeenAt (more recent first).
 */
export function rankCandidates(
  candidates: readonly RiderCandidate[],
  options: RankingOptions,
): RankedCandidate[] {
  const maxDistanceMeters = options.maxDistanceMeters ?? DEFAULT_RADIUS_METERS;
  const availabilityWindow = computeAvailabilityWindow({
    scheduledPickupTime: options.scheduledPickupTime ?? null,
    scheduledDropoffTime: options.scheduledDropoffTime ?? null,
    considerWindowMinutes: options.considerWindowMinutes,
    now: options.now,
  });

  const scored: RankedCandidate[] = [];

  for (const c of candidates) {
    const distance = haversineDistanceMeters(options.pickup, c.lastKnownLocation);
    if (distance > maxDistanceMeters) continue;
    if (!isAvailableDuringWindow(c, availabilityWindow)) continue;

    // Simple score: distance (lower is better)
    scored.push({
      ...c,
      distanceMeters: distance,
      score: distance,
    });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const aSeen = a.lastSeenAt ? a.lastSeenAt.getTime() : 0;
    const bSeen = b.lastSeenAt ? b.lastSeenAt.getTime() : 0;
    // Prefer more recent lastSeenAt
    return bSeen - aSeen;
  });

  return scored;
}

@Injectable()
export class CandidateSelectionService {
  constructor(private readonly repository: RiderCandidateRepository) {}

  async findAndRankCandidates(params: FindCandidatesParams): Promise<RankedCandidate[]> {
    const radius = params.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const limit = params.limit ?? 10;

    const raw = await this.repository.findNearbyRiders({
      latitude: params.pickup.latitude,
      longitude: params.pickup.longitude,
      radiusMeters: radius,
      now: params.now,
      limit: limit * 3, // fetch extra to allow ranking/trimming
    });

    const ranked = rankCandidates(raw, {
      pickup: params.pickup,
      scheduledPickupTime: params.scheduledPickupTime ?? null,
      scheduledDropoffTime: params.scheduledDropoffTime ?? null,
      considerWindowMinutes: params.considerWindowMinutes ?? DEFAULT_WINDOW_MINUTES,
      maxDistanceMeters: radius,
      now: params.now,
    });

    return ranked.slice(0, limit);
  }
}

/**
 * In-memory repository adapter for tests and local simulations.
 */
export class InMemoryRiderCandidateRepository implements RiderCandidateRepository {
  private data: RiderCandidate[];

  constructor(initialData: RiderCandidate[] = []) {
    this.data = [...initialData];
  }

  setData(data: RiderCandidate[]): void {
    this.data = [...data];
  }

  async findNearbyRiders(params: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    now?: Date | undefined;
    limit?: number | undefined;
  }): Promise<RiderCandidate[]> {
    const center: GeoPoint = { latitude: params.latitude, longitude: params.longitude };
    const within = this.data
      .map((c) => ({ c, d: haversineDistanceMeters(center, c.lastKnownLocation) }))
      .filter((x) => x.d <= params.radiusMeters)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.c);

    if (typeof params.limit === 'number' && params.limit > 0) {
      return within.slice(0, params.limit);
    }
    return within;
  }
}
