import type {
  RiderCandidate,
  HeatmapCell,
  ZoneCluster,
  ETAResult,
  DistanceResult,
} from '../../services/geoApi';

export function createNearbyRiders(
  centerLat: number,
  centerLng: number,
  limit = 10
): RiderCandidate[] {
  const riders: RiderCandidate[] = [
    {
      riderId: 'rider_nearby_001',
      name: 'John Kamau',
      lat: centerLat + 0.002,
      lng: centerLng + 0.003,
      distance: 350,
      status: 'available',
    },
    {
      riderId: 'rider_nearby_002',
      name: 'Mary Wanjiku',
      lat: centerLat - 0.001,
      lng: centerLng + 0.004,
      distance: 520,
      status: 'available',
    },
    {
      riderId: 'rider_nearby_003',
      name: 'Peter Ochieng',
      lat: centerLat + 0.005,
      lng: centerLng - 0.002,
      distance: 780,
      status: 'busy',
    },
    {
      riderId: 'rider_nearby_004',
      name: 'Grace Njeri',
      lat: centerLat - 0.003,
      lng: centerLng - 0.004,
      distance: 920,
      status: 'available',
    },
    {
      riderId: 'rider_nearby_005',
      name: 'David Kiprop',
      lat: centerLat + 0.008,
      lng: centerLng + 0.001,
      distance: 1100,
      status: 'available',
    },
  ];
  return riders.slice(0, limit);
}

export function createHeatmapCells(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  resolution = 10
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const latStep = (maxLat - minLat) / resolution;
  const lngStep = (maxLng - minLng) / resolution;

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      cells.push({
        lat: minLat + latStep * (i + 0.5),
        lng: minLng + lngStep * (j + 0.5),
        weight: Math.random() * 100,
      });
    }
  }
  return cells;
}

export function createZoneClusters(): ZoneCluster[] {
  return [
    {
      zoneId: 'zone_cbd',
      name: 'CBD',
      centerLat: -1.2864,
      centerLng: 36.8172,
      riderCount: 25,
      demandLevel: 'high',
    },
    {
      zoneId: 'zone_westlands',
      name: 'Westlands',
      centerLat: -1.2673,
      centerLng: 36.811,
      riderCount: 18,
      demandLevel: 'medium',
    },
    {
      zoneId: 'zone_kilimani',
      name: 'Kilimani',
      centerLat: -1.2891,
      centerLng: 36.7832,
      riderCount: 12,
      demandLevel: 'medium',
    },
    {
      zoneId: 'zone_karen',
      name: 'Karen',
      centerLat: -1.3186,
      centerLng: 36.7119,
      riderCount: 6,
      demandLevel: 'low',
    },
  ];
}

export function createETAResult(distanceMeters: number): ETAResult {
  const speedMps = 8.33;
  return {
    durationSeconds: Math.round(distanceMeters / speedMps),
    distanceMeters,
  };
}

export function createDistanceResult(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): DistanceResult {
  const R = 6371000;
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLng = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLine = Math.round(R * c);
  return {
    distanceMeters: Math.round(straightLine * 1.3),
    straightLineMeters: straightLine,
  };
}
