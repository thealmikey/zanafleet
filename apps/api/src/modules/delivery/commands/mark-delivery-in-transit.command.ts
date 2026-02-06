export class MarkDeliveryInTransitCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {}
}
