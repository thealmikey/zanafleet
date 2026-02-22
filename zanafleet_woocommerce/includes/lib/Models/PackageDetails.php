<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * Package details for delivery requests
 */
final class PackageDetails
{
    private ?string $itemId;
    private ?string $description;
    private ?float $weight;
    private ?float $length;
    private ?float $width;
    private ?float $height;
    private ?int $quantity;
    private ?float $declaredValue;
    private bool $isFragile;
    private bool $requiresRefrigeration;

    public function __construct(
        ?string $description = null,
        ?string $itemId = null,
        ?float $weight = null,
        ?float $length = null,
        ?float $width = null,
        ?float $height = null,
        ?int $quantity = 1,
        ?float $declaredValue = null,
        bool $isFragile = false,
        bool $requiresRefrigeration = false
    ) {
        $this->itemId = $itemId;
        $this->description = $description;
        $this->weight = $weight;
        $this->length = $length;
        $this->width = $width;
        $this->height = $height;
        $this->quantity = $quantity ?? 1;
        $this->declaredValue = $declaredValue;
        $this->isFragile = $isFragile;
        $this->requiresRefrigeration = $requiresRefrigeration;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            $data['description'] ?? null,
            $data['itemId'] ?? $data['item_id'] ?? null,
            isset($data['weight']) ? (float) $data['weight'] : null,
            isset($data['length']) ? (float) $data['length'] : null,
            isset($data['width']) ? (float) $data['width'] : null,
            isset($data['height']) ? (float) $data['height'] : null,
            isset($data['quantity']) ? (int) $data['quantity'] : 1,
            isset($data['declaredValue']) ? (float) $data['declared_value'] : null,
            $data['isFragile'] ?? $data['fragile'] ?? false,
            $data['requiresRefrigeration'] ?? $data['refrigerated'] ?? false
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'itemId' => $this->itemId,
            'description' => $this->description,
            'weight' => $this->weight,
            'length' => $this->length,
            'width' => $this->width,
            'height' => $this->height,
            'quantity' => $this->quantity,
            'declaredValue' => $this->declaredValue,
            'isFragile' => $this->isFragile,
            'requiresRefrigeration' => $this->requiresRefrigeration,
        ], fn($v) => $v !== null);
    }

    // Getters
    public function getItemId(): ?string { return $this->itemId; }
    public function getDescription(): ?string { return $this->description; }
    public function getWeight(): ?float { return $this->weight; }
    public function getLength(): ?float { return $this->length; }
    public function getWidth(): ?float { return $this->width; }
    public function getHeight(): ?float { return $this->height; }
    public function getQuantity(): int { return $this->quantity; }
    public function getDeclaredValue(): ?float { return $this->declaredValue; }
    public function isFragile(): bool { return $this->isFragile; }
    public function requiresRefrigeration(): bool { return $this->requiresRefrigeration; }

    /**
     * Calculate volume in cubic meters
     */
    public function getVolume(): ?float
    {
        if ($this->length && $this->width && $this->height) {
            return ($this->length * $this->width * $this->height) / 1000000;
        }
        return null;
    }
}