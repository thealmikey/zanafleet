<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * Delivery - represents an actual delivery in the system
 */
final class Delivery
{
    private string $id;
    private string $businessId;
    private ?string $workspaceId;
    private ?string $externalOrderId;
    private ?string $pickupLocationId;
    private ?string $dropoffLocationId;
    private ?string $assignedRiderId;
    private string $status;
    private ?\DateTime $scheduledPickupTime;
    private ?\DateTime $scheduledDropoffTime;
    private ?string $recipientName;
    private ?string $recipientPhone;
    private bool $isScheduled;
    private ?\DateTime $assignedAt;
    private ?\DateTime $pickedUpAt;
    private ?\DateTime $deliveredAt;
    private ?\DateTime $cancelledAt;
    private ?\DateTime $createdAt;
    private ?\DateTime $updatedAt;
    private ?float $distanceKm;
    private ?float $price;
    private ?string $trackingUrl;

    public static function fromArray(array $data): self
    {
        $delivery = new self(
            $data['id'] ?? '',
            $data['businessId'] ?? $data['business_id'] ?? '',
            $data['workspaceId'] ?? $data['workspace_id'] ?? null,
            $data['externalOrderId'] ?? $data['external_order_id'] ?? null,
            $data['pickupLocationId'] ?? $data['pickup_location_id'] ?? null,
            $data['dropoffLocationId'] ?? $data['dropoff_location_id'] ?? null,
            $data['assignedRiderId'] ?? $data['assigned_rider_id'] ?? null,
            $data['status'] ?? DeliveryStatus::REQUESTED,
            isset($data['scheduledPickupTime']) ? new \DateTime($data['scheduled_pickup_time']) : null,
            isset($data['scheduledDropoffTime']) ? new \DateTime($data['scheduled_dropoff_time']) : null,
            $data['recipientName'] ?? null,
            $data['recipientPhone'] ?? null,
            $data['isScheduled'] ?? false,
            isset($data['assignedAt']) ? new \DateTime($data['assigned_at']) : null,
            isset($data['pickedUpAt']) ? new \DateTime($data['picked_up_at']) : null,
            isset($data['deliveredAt']) ? new \DateTime($data['delivered_at']) : null,
            isset($data['cancelledAt']) ? new \DateTime($data['cancelled_at']) : null,
            isset($data['createdAt']) ? new \DateTime($data['created_at']) : null,
            isset($data['updatedAt']) ? new \DateTime($data['updated_at']) : null,
            isset($data['distanceKm']) ? (float) $data['distance_km'] : null,
            isset($data['price']) ? (float) $data['price'] : null,
            $data['trackingUrl'] ?? $data['tracking_url'] ?? null
        );
        return $delivery;
    }

    private function __construct(
        string $id,
        string $businessId,
        ?string $workspaceId,
        ?string $externalOrderId,
        ?string $pickupLocationId,
        ?string $dropoffLocationId,
        ?string $assignedRiderId,
        string $status,
        ?\DateTime $scheduledPickupTime,
        ?\DateTime $scheduledDropoffTime,
        ?string $recipientName,
        ?string $recipientPhone,
        bool $isScheduled,
        ?\DateTime $assignedAt,
        ?\DateTime $pickedUpAt,
        ?\DateTime $deliveredAt,
        ?\DateTime $cancelledAt,
        ?\DateTime $createdAt,
        ?\DateTime $updatedAt,
        ?float $distanceKm,
        ?float $price,
        ?string $trackingUrl
    ) {
        $this->id = $id;
        $this->businessId = $businessId;
        $this->workspaceId = $workspaceId;
        $this->externalOrderId = $externalOrderId;
        $this->pickupLocationId = $pickupLocationId;
        $this->dropoffLocationId = $dropoffLocationId;
        $this->assignedRiderId = $assignedRiderId;
        $this->status = $status;
        $this->scheduledPickupTime = $scheduledPickupTime;
        $this->scheduledDropoffTime = $scheduledDropoffTime;
        $this->recipientName = $recipientName;
        $this->recipientPhone = $recipientPhone;
        $this->isScheduled = $isScheduled;
        $this->assignedAt = $assignedAt;
        $this->pickedUpAt = $pickedUpAt;
        $this->deliveredAt = $deliveredAt;
        $this->cancelledAt = $cancelledAt;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
        $this->distanceKm = $distanceKm;
        $this->price = $price;
        $this->trackingUrl = $trackingUrl;
    }

    public function isTerminal(): bool
    {
        return DeliveryStatus::isTerminal($this->status);
    }

    public function isActive(): bool
    {
        return DeliveryStatus::isActive($this->status);
    }

    // Getters
    public function getId(): string { return $this->id; }
    public function getBusinessId(): string { return $this->businessId; }
    public function getWorkspaceId(): ?string { return $this->workspaceId; }
    public function getExternalOrderId(): ?string { return $this->externalOrderId; }
    public function getPickupLocationId(): ?string { return $this->pickupLocationId; }
    public function getDropoffLocationId(): ?string { return $this->dropoffLocationId; }
    public function getAssignedRiderId(): ?string { return $this->assignedRiderId; }
    public function getStatus(): string { return $this->status; }
    public function getScheduledPickupTime(): ?\DateTime { return $this->scheduledPickupTime; }
    public function getScheduledDropoffTime(): ?\DateTime { return $this->scheduledDropoffTime; }
    public function getRecipientName(): ?string { return $this->recipientName; }
    public function getRecipientPhone(): ?string { return $this->recipientPhone; }
    public function isScheduled(): bool { return $this->isScheduled; }
    public function getAssignedAt(): ?\DateTime { return $this->assignedAt; }
    public function getPickedUpAt(): ?\DateTime { return $this->pickedUpAt; }
    public function getDeliveredAt(): ?\DateTime { return $this->deliveredAt; }
    public function getCancelledAt(): ?\DateTime { return $this->cancelledAt; }
    public function getCreatedAt(): ?\DateTime { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTime { return $this->updatedAt; }
    public function getDistanceKm(): ?float { return $this->distanceKm; }
    public function getPrice(): ?float { return $this->price; }
    public function getTrackingUrl(): ?string { return $this->trackingUrl; }
}