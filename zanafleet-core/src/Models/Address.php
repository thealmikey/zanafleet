<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * Address model representing a physical location
 */
final class Address
{
    private ?string $id;
    private string $formattedAddress;
    private ?string $street;
    private ?string $city;
    private ?string $state;
    private ?string $country;
    private ?string $postalCode;
    private ?float $latitude;
    private ?float $longitude;

    public function __construct(
        string $formattedAddress,
        ?string $id = null,
        ?string $street = null,
        ?string $city = null,
        ?string $state = null,
        ?string $country = null,
        ?string $postalCode = null,
        ?float $latitude = null,
        ?float $longitude = null
    ) {
        $this->id = $id;
        $this->formattedAddress = $formattedAddress;
        $this->street = $street;
        $this->city = $city;
        $this->state = $state;
        $this->country = $country;
        $this->postalCode = $postalCode;
        $this->latitude = $latitude;
        $this->longitude = $longitude;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            $data['formattedAddress'] ?? $data['formatted_address'] ?? '',
            $data['id'] ?? null,
            $data['street'] ?? null,
            $data['city'] ?? null,
            $data['state'] ?? null,
            $data['country'] ?? null,
            $data['postalCode'] ?? $data['postal_code'] ?? null,
            isset($data['latitude']) ? (float) $data['latitude'] : null,
            isset($data['longitude']) ? (float) $data['longitude'] : null
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'id' => $this->id,
            'formattedAddress' => $this->formattedAddress,
            'street' => $this->street,
            'city' => $this->city,
            'state' => $this->state,
            'country' => $this->country,
            'postalCode' => $this->postalCode,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
        ], fn($v) => $v !== null);
    }

    // Getters
    public function getId(): ?string { return $this->id; }
    public function getFormattedAddress(): string { return $this->formattedAddress; }
    public function getStreet(): ?string { return $this->street; }
    public function getCity(): ?string { return $this->city; }
    public function getState(): ?string { return $this->state; }
    public function getCountry(): ?string { return $this->country; }
    public function getPostalCode(): ?string { return $this->postalCode; }
    public function getLatitude(): ?float { return $this->latitude; }
    public function getLongitude(): ?float { return $this->longitude; }
    public function hasCoordinates(): bool { return $this->latitude !== null && $this->longitude !== null; }
}