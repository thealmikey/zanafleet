<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * Delivery request - sent when creating a new delivery
 */
final class DeliveryRequest
{
    private string $businessId;
    private string $workspaceId;
    private string $actorId;
    private Address $pickup;
    private Address $dropoff;
    private string $recipientName;
    private string $recipientPhone;
    private ?PackageDetails $package;
    private ?SLAOptions $sla;
    private ?string $externalOrderId;
    private ?string $specialInstructions;
    private ?float $distanceKm;
    private ?string $vehicleType;
    private ?string $customerId;
    private ?string $customerEmail;
    private ?string $preferredTimeSlot;
    private ?string $slaType;
    private ?string $paymentType;
    private ?float $codAmount;

    public function __construct(
        string $businessId,
        string $workspaceId,
        string $actorId,
        Address $pickup,
        Address $dropoff,
        string $recipientName,
        string $recipientPhone,
        ?PackageDetails $package = null,
        ?SLAOptions $sla = null,
        ?string $externalOrderId = null,
        ?string $specialInstructions = null,
        ?float $distanceKm = null,
        ?string $vehicleType = null,
        ?string $customerId = null,
        ?string $customerEmail = null,
        ?string $preferredTimeSlot = null,
        ?string $slaType = null,
        ?string $paymentType = null,
        ?float $codAmount = null
    ) {
        $this->businessId = $businessId;
        $this->workspaceId = $workspaceId;
        $this->actorId = $actorId;
        $this->pickup = $pickup;
        $this->dropoff = $dropoff;
        $this->recipientName = $recipientName;
        $this->recipientPhone = $recipientPhone;
        $this->package = $package;
        $this->sla = $sla;
        $this->externalOrderId = $externalOrderId;
        $this->specialInstructions = $specialInstructions;
        $this->distanceKm = $distanceKm;
        $this->vehicleType = $vehicleType;
        $this->customerId = $customerId;
        $this->customerEmail = $customerEmail;
        $this->preferredTimeSlot = $preferredTimeSlot;
        $this->slaType = $slaType;
        $this->paymentType = $paymentType;
        $this->codAmount = $codAmount;
    }

    public function toArray(): array
    {
        return [
            'businessId' => $this->businessId,
            'workspaceId' => $this->workspaceId,
            'actorId' => $this->actorId,
            'pickup' => $this->pickup->toArray(),
            'dropoff' => $this->dropoff->toArray(),
            'recipientName' => $this->recipientName,
            'recipientPhone' => $this->recipientPhone,
            'itemId' => $this->package?->getItemId(),
            'itemDescription' => $this->package?->getDescription(),
            'declaredItemValue' => $this->package?->getDeclaredValue(),
            'scheduledPickupTime' => $this->sla?->getScheduledPickupTime()?->format(\DateTime::ATOM),
            'scheduledDropoffTime' => $this->sla?->getScheduledDropoffTime()?->format(\DateTime::ATOM),
            'isScheduled' => $this->sla?->isScheduled() ?? false,
            'specialInstructions' => $this->specialInstructions,
            'distanceKm' => $this->distanceKm,
            'vehicleType' => $this->vehicleType,
        ];
    }

    // Static builder for convenience
    public static function create(
        string $businessId,
        string $workspaceId,
        Address $pickup,
        Address $dropoff,
        string $recipientName,
        string $recipientPhone,
        ?string $actorId = null,
        ?PackageDetails $package = null,
        ?SLAOptions $sla = null
    ): self {
        return new self(
            $businessId,
            $workspaceId,
            $actorId ?? 'system',
            $pickup,
            $dropoff,
            $recipientName,
            $recipientPhone,
            $package,
            $sla
        );
    }

    // Getters
    public function getBusinessId(): string { return $this->businessId; }
    public function getWorkspaceId(): string { return $this->workspaceId; }
    public function getActorId(): string { return $this->actorId; }
    public function getPickup(): Address { return $this->pickup; }
    public function getDropoff(): Address { return $this->dropoff; }
    public function getRecipientName(): string { return $this->recipientName; }
    public function getRecipientPhone(): string { return $this->recipientPhone; }
    public function getPackage(): ?PackageDetails { return $this->package; }
    public function getSla(): ?SLAOptions { return $this->sla; }
    public function getExternalOrderId(): ?string { return $this->externalOrderId; }
    public function getSpecialInstructions(): ?string { return $this->specialInstructions; }
    public function getDistanceKm(): ?float { return $this->distanceKm; }
    public function getVehicleType(): ?string { return $this->vehicleType; }
    public function getCustomerId(): ?string { return $this->customerId; }
    public function getCustomerEmail(): ?string { return $this->customerEmail; }
    public function getPreferredTimeSlot(): ?string { return $this->preferredTimeSlot; }
    public function getSlaType(): ?string { return $this->slaType; }
    public function getPaymentType(): ?string { return $this->paymentType; }
    public function getCodAmount(): ?float { return $this->codAmount; }
}