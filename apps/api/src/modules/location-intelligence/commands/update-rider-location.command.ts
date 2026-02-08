import { RiderTelemetryData } from '@zanafleet/contracts';

/**
 * Command to update a rider's location from telemetry data.
 * Processed by UpdateRiderLocationHandler.
 */
export class UpdateRiderLocationCommand {
  constructor(public readonly telemetry: RiderTelemetryData) {}
}
