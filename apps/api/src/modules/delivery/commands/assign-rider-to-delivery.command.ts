export class AssignRiderToDeliveryCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly riderId: string,
    public readonly notifyAssignment: boolean = false,
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {}
}
