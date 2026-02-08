import { RiderLocationUpdatedEventV1 } from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';
import { H3MultiIndex } from '../types/h3.types';

/**
 * Factory function to create a RiderLocationUpdatedEventV1 event.
 * Event type follows naming convention: Location.RiderLocation.UpdatedV1
 */
export function createRiderLocationUpdatedEvent(params: {
  riderId: string;
  latitude: number;
  longitude: number;
  h3Indices: H3MultiIndex;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
}): RiderLocationUpdatedEventV1 {
  return {
    eventId: uuidv4(),
    eventType: 'Location.RiderLocation.UpdatedV1',
    eventVersion: '1',
    occurredAt: new Date(),
    aggregateId: params.riderId,
    aggregateType: 'RiderLocation',
    correlationId: params.correlationId,
    causationId: params.causationId,
    payload: {
      riderId: params.riderId,
      latitude: params.latitude,
      longitude: params.longitude,
      h3IndexFine: params.h3Indices.fine,
      h3IndexMedium: params.h3Indices.medium,
      h3IndexCoarse: params.h3Indices.coarse,
      heading: params.heading,
      speed: params.speed,
      accuracy: params.accuracy,
      timestamp: params.timestamp,
    },
  };
}
