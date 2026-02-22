<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Webhooks;

/**
 * Webhook event from ZanaFleet
 */
final class WebhookEvent
{
    private string $eventId;
    private string $eventType;
    private string $eventVersion;
    private \DateTime $occurredAt;
    private string $deliveryId;
    private string $status;
    private ?string $riderId;
    private ?string $riderName;
    private ?string $riderPhone;
    private ?string $trackingUrl;
    private ?array $metadata;

    public function __construct(
        string $eventId,
        string $eventType,
        string $eventVersion,
        \DateTime $occurredAt,
        string $deliveryId,
        string $status,
        ?string $riderId = null,
        ?string $riderName = null,
        ?string $riderPhone = null,
        ?string $trackingUrl = null,
        ?array $metadata = null
    ) {
        $this->eventId = $eventId;
        $this->eventType = $eventType;
        $this->eventVersion = $eventVersion;
        $this->occurredAt = $occurredAt;
        $this->deliveryId = $deliveryId;
        $this->status = $status;
        $this->riderId = $riderId;
        $this->riderName = $riderName;
        $this->riderPhone = $riderPhone;
        $this->trackingUrl = $trackingUrl;
        $this->metadata = $metadata;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            $data['eventId'] ?? $data['event_id'] ?? '',
            $data['eventType'] ?? $data['event_type'] ?? '',
            $data['eventVersion'] ?? $data['event_version'] ?? 'v1',
            isset($data['occurredAt']) ? new \DateTime($data['occurred_at']) : new \DateTime(),
            $data['deliveryId'] ?? $data['delivery_id'] ?? '',
            $data['status'] ?? '',
            $data['riderId'] ?? $data['rider_id'] ?? null,
            $data['riderName'] ?? $data['rider_name'] ?? null,
            $data['riderPhone'] ?? $data['rider_phone'] ?? null,
            $data['trackingUrl'] ?? $data['tracking_url'] ?? null,
            $data['metadata'] ?? null
        );
    }

    /**
     * Map event type to WooCommerce order status
     */
    public function getWooCommerceStatus(): ?string
    {
        return match ($this->status) {
            'Assigned' => 'zf-assigned',
            'PickedUp' => 'zf-picked-up',
            'InTransit' => 'zf-in-transit',
            'Delivered' => 'completed',
            'Failed' => 'zf-failed',
            'Cancelled' => 'cancelled',
            default => null,
        };
    }

    // Getters
    public function getEventId(): string { return $this->eventId; }
    public function getEventType(): string { return $this->eventType; }
    public function getEventVersion(): string { return $this->eventVersion; }
    public function getOccurredAt(): \DateTime { return $this->occurredAt; }
    public function getDeliveryId(): string { return $this->deliveryId; }
    public function getStatus(): string { return $this->status; }
    public function getRiderId(): ?string { return $this->riderId; }
    public function getRiderName(): ?string { return $this->riderName; }
    public function getRiderPhone(): ?string { return $this->riderPhone; }
    public function getTrackingUrl(): ?string { return $this->trackingUrl; }
    public function getMetadata(): ?array { return $this->metadata; }
}