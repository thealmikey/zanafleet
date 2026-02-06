export class RecordDeliveryAttemptFailedCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly reason: string,
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {}
}
