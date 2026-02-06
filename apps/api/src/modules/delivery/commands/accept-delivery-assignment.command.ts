export class AcceptDeliveryAssignmentCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly riderId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {}
}
