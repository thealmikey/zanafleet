import {
  CandidateSelectionService,
  GeoPoint,
  InMemoryRiderCandidateRepository,
  RiderCandidate,
  TimeWindow,
  haversineDistanceMeters,
  rankCandidates,
} from '../../services/candidate-selection.service';

function offsetPointMeters(origin: GeoPoint, northMeters: number, eastMeters: number): GeoPoint {
  const latDegreeMeters = 111_111; // approximate
  const lonDegreeMeters = 111_111 * Math.cos((origin.latitude * Math.PI) / 180);
  return {
    latitude: origin.latitude + northMeters / latDegreeMeters,
    longitude: origin.longitude + eastMeters / lonDegreeMeters,
  };
}

describe('Candidate Selection - Ranking', () => {
  const pickup: GeoPoint = { latitude: -1.29, longitude: 36.82 }; // Nairobi approx

  const baseCandidates: RiderCandidate[] = [
    // A at pickup (0m)
    { riderId: 'A', lastKnownLocation: pickup, lastSeenAt: new Date('2024-01-01T12:00:00.000Z') },
    // B ~ 1km north
    {
      riderId: 'B',
      lastKnownLocation: offsetPointMeters(pickup, 1000, 0),
      lastSeenAt: new Date('2024-01-01T12:05:00.000Z'),
    },
    // C ~ 2km east
    {
      riderId: 'C',
      lastKnownLocation: offsetPointMeters(pickup, 0, 2000),
      lastSeenAt: new Date('2024-01-01T11:59:00.000Z'),
    },
    // D ~ 3.5km north (outside 3km radius)
    {
      riderId: 'D',
      lastKnownLocation: offsetPointMeters(pickup, 3500, 0),
      lastSeenAt: new Date('2024-01-01T12:10:00.000Z'),
    },
  ];

  it('should compute haversine distances reasonably', () => {
    const bDist = haversineDistanceMeters(pickup, baseCandidates[1].lastKnownLocation);
    const cDist = haversineDistanceMeters(pickup, baseCandidates[2].lastKnownLocation);
    expect(bDist).toBeGreaterThan(900);
    expect(bDist).toBeLessThan(1100);
    expect(cDist).toBeGreaterThan(1800);
    expect(cDist).toBeLessThan(2200);
  });

  it('ranks by distance and filters out-of-radius', () => {
    const ranked = rankCandidates(baseCandidates, {
      pickup,
      maxDistanceMeters: 3000,
      considerWindowMinutes: 30,
      now: new Date('2024-01-01T12:00:00.000Z'),
    });

    const ids = ranked.map((r) => r.riderId);
    expect(ids).toEqual(['A', 'B', 'C']); // D filtered (outside radius), others ordered by distance
    expect(ranked[0].distanceMeters).toBeLessThan(1); // ~0m
    expect(ranked[1].distanceMeters).toBeGreaterThan(900);
  });

  it('filters out candidates busy during the scheduled window', () => {
    const scheduled = new Date('2024-01-01T12:00:00.000Z');
    const busyOverlap: TimeWindow = {
      start: new Date('2024-01-01T11:45:00.000Z'),
      end: new Date('2024-01-01T12:10:00.000Z'),
    };

    const candidates: RiderCandidate[] = [
      baseCandidates[0],
      { ...baseCandidates[1], busyWindows: [busyOverlap] }, // B is busy during window
      baseCandidates[2],
    ];

    const ranked = rankCandidates(candidates, {
      pickup,
      scheduledPickupTime: scheduled,
      considerWindowMinutes: 30, // window 11:30-12:30
      maxDistanceMeters: 3000,
    });

    const ids = ranked.map((r) => r.riderId);
    expect(ids).toEqual(['A', 'C']); // B excluded due to overlap
  });

  it('breaks distance ties by recency (more recent first)', () => {
    // Two candidates at same location with different lastSeenAt
    const sameSpot = offsetPointMeters(pickup, 500, 0);
    const c1: RiderCandidate = {
      riderId: 'X',
      lastKnownLocation: sameSpot,
      lastSeenAt: new Date('2024-01-01T12:01:00.000Z'),
    };
    const c2: RiderCandidate = {
      riderId: 'Y',
      lastKnownLocation: sameSpot,
      lastSeenAt: new Date('2024-01-01T12:02:00.000Z'),
    };

    const ranked = rankCandidates([c1, c2], {
      pickup,
      maxDistanceMeters: 3000,
    });

    expect(ranked.map((r) => r.riderId)).toEqual(['Y', 'X']); // Y seen later -> prioritized
  });
});

describe('CandidateSelectionService - end-to-end over in-memory repo', () => {
  const repo = new InMemoryRiderCandidateRepository();
  const service = new CandidateSelectionService(repo);
  const pickup: GeoPoint = { latitude: -1.29, longitude: 36.82 };

  beforeEach(() => {
    repo.setData([]);
  });

  it('should fetch, rank and limit results', async () => {
    const data: RiderCandidate[] = [
      { riderId: 'near-0', lastKnownLocation: pickup },
      { riderId: 'near-1k', lastKnownLocation: offsetPointMeters(pickup, 1000, 0) },
      { riderId: 'near-2k', lastKnownLocation: offsetPointMeters(pickup, 0, 2000) },
      { riderId: 'far-4k', lastKnownLocation: offsetPointMeters(pickup, 4000, 0) },
    ];

    repo.setData(data);

    const result = await service.findAndRankCandidates({
      pickup,
      radiusMeters: 3000,
      considerWindowMinutes: 20,
      limit: 2,
    });

    expect(result.map((r) => r.riderId)).toEqual(['near-0', 'near-1k']);
    expect(result.length).toBe(2);
  });

  it('should honor scheduling window when ranking', async () => {
    const scheduled = new Date('2024-01-01T12:00:00.000Z');
    const overlappingBusy: TimeWindow = {
      start: new Date('2024-01-01T11:50:00.000Z'),
      end: new Date('2024-01-01T12:20:00.000Z'),
    };

    const data: RiderCandidate[] = [
      { riderId: 'free', lastKnownLocation: pickup },
      {
        riderId: 'busy',
        lastKnownLocation: offsetPointMeters(pickup, 500, 0),
        busyWindows: [overlappingBusy],
      },
      { riderId: 'also-free', lastKnownLocation: offsetPointMeters(pickup, 800, 0) },
    ];

    repo.setData(data);

    const result = await service.findAndRankCandidates({
      pickup,
      scheduledPickupTime: scheduled,
      considerWindowMinutes: 15,
      radiusMeters: 2000,
      limit: 10,
    });

    const ids = result.map((r) => r.riderId);
    expect(ids).toContain('free');
    expect(ids).toContain('also-free');
    expect(ids).not.toContain('busy');
  });
});
