export class MarkDeliveryDeliveredCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}
