<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * Delivery quote - price estimation from API
 */
final class DeliveryQuote
{
    private string $quoteId;
    private float $basePrice;
    private float $distancePrice;
    private float $totalPrice;
    private string $currency;
    private ?float $distanceKm;
    private ?int $estimatedPickupMinutes;
    private ?int $estimatedDeliveryMinutes;
    private ?string $vehicleType;
    private ?\DateTime $expiresAt;
    private array $meta;

    public function __construct(
        string $quoteId,
        float $basePrice,
        float $distancePrice,
        float $totalPrice,
        string $currency = 'KES',
        ?float $distanceKm = null,
        ?int $estimatedPickupMinutes = null,
        ?int $estimatedDeliveryMinutes = null,
        ?string $vehicleType = null,
        ?\DateTime $expiresAt = null,
        array $meta = []
    ) {
        $this->quoteId = $quoteId;
        $this->basePrice = $basePrice;
        $this->distancePrice = $distancePrice;
        $this->totalPrice = $totalPrice;
        $this->currency = $currency;
        $this->distanceKm = $distanceKm;
        $this->estimatedPickupMinutes = $estimatedPickupMinutes;
        $this->estimatedDeliveryMinutes = $estimatedDeliveryMinutes;
        $this->vehicleType = $vehicleType;
        $this->expiresAt = $expiresAt;
        $this->meta = $meta;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            $data['quoteId'] ?? $data['quote_id'] ?? '',
            (float) ($data['basePrice'] ?? $data['base_price'] ?? 0),
            (float) ($data['distancePrice'] ?? $data['distance_price'] ?? 0),
            (float) ($data['totalPrice'] ?? $data['total_price'] ?? 0),
            $data['currency'] ?? 'KES',
            isset($data['distanceKm']) ? (float) $data['distance_km'] : null,
            $data['estimatedPickupMinutes'] ?? null,
            $data['estimatedDeliveryMinutes'] ?? null,
            $data['vehicleType'] ?? $data['vehicle_type'] ?? null,
            isset($data['expiresAt']) ? new \DateTime($data['expires_at']) : null,
            $data['meta'] ?? []
        );
    }

    public function isExpired(): bool
    {
        return $this->expiresAt && $this->expiresAt < new \DateTime();
    }

    // Getters
    public function getQuoteId(): string { return $this->quoteId; }
    public function getBasePrice(): float { return $this->basePrice; }
    public function getDistancePrice(): float { return $this->distancePrice; }
    public function getTotalPrice(): float { return $this->totalPrice; }
    public function getCurrency(): string { return $this->currency; }
    public function getDistanceKm(): ?float { return $this->distanceKm; }
    public function getEstimatedPickupMinutes(): ?int { return $this->estimatedPickupMinutes; }
    public function getEstimatedDeliveryMinutes(): ?int { return $this->estimatedDeliveryMinutes; }
    public function getVehicleType(): ?string { return $this->vehicleType; }
    public function getExpiresAt(): ?\DateTime { return $this->expiresAt; }
    public function getMeta(): array { return $this->meta; }

    public function getFormattedPrice(): string
    {
        return number_format($this->totalPrice, 2) . ' ' . $this->currency;
    }
}