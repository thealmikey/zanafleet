import type {
  OperatorMetrics,
  AssignmentQueueItem,
  CandidateInfo,
  RouteHint,
} from '../../services/dashboardApi';

export function createOperatorMetrics(): OperatorMetrics {
  return {
    activeDeliveries: 47,
    pendingAssignments: 12,
    availableRiders: 34,
    avgAssignmentTime: 180,
  };
}

export function createAssignmentQueue(): AssignmentQueueItem[] {
  const now = new Date();
  return [
    {
      deliveryId: 'del_queue_001',
      status: 'pending_assignment',
      pickupAddress: '123 Restaurant Ave, CBD',
      dropoffAddress: '456 Apartment Complex, Kilimani',
      priority: 10,
      createdAt: new Date(now.getTime() - 2 * 60 * 1000),
      attempts: 0,
    },
    {
      deliveryId: 'del_queue_002',
      status: 'pending_assignment',
      pickupAddress: '789 Supermarket Rd, Westlands',
      dropoffAddress: '321 Office Park, Upper Hill',
      priority: 8,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      attempts: 1,
    },
    {
      deliveryId: 'del_queue_003',
      status: 'pending_assignment',
      pickupAddress: '555 Pharmacy Lane, Parklands',
      dropoffAddress: '666 Residential Estate, Lavington',
      priority: 5,
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      attempts: 2,
    },
    {
      deliveryId: 'del_queue_004',
      status: 'reassigning',
      pickupAddress: '100 Food Court, Junction Mall',
      dropoffAddress: '200 Home Address, Karen',
      priority: 7,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
      attempts: 3,
    },
  ];
}

export function createCandidates(): CandidateInfo[] {
  return [
    {
      riderId: 'rider_cand_001',
      name: 'James Mwangi',
      distance: 450,
      eta: 180,
      rating: 4.8,
      activeDeliveries: 0,
    },
    {
      riderId: 'rider_cand_002',
      name: 'Sarah Achieng',
      distance: 780,
      eta: 300,
      rating: 4.9,
      activeDeliveries: 1,
    },
    {
      riderId: 'rider_cand_003',
      name: 'David Kiprop',
      distance: 1200,
      eta: 420,
      rating: 4.6,
      activeDeliveries: 0,
    },
    {
      riderId: 'rider_cand_004',
      name: 'Grace Njeri',
      distance: 1500,
      eta: 540,
      rating: 4.7,
      activeDeliveries: 2,
    },
  ];
}

export function createRouteHint(): RouteHint {
  return {
    distanceMeters: 5200,
    durationSeconds: 900,
    polyline: 'encoded_polyline_string_here',
  };
}
