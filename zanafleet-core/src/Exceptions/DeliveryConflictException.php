<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Exceptions;

/**
 * Thrown when a delivery operation conflicts with current state
 * (e.g., cancelling an already delivered package)
 */
class DeliveryConflictException extends ZanaFleetException
{
    private string $deliveryId;
    private string $currentStatus;

    public function __construct(
        string $message,
        string $deliveryId,
        string $currentStatus,
        int $code = 409,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->deliveryId = $deliveryId;
        $this->currentStatus = $currentStatus;
    }

    public function getDeliveryId(): string
    {
        return $this->deliveryId;
    }

    public function getCurrentStatus(): string
    {
        return $this->currentStatus;
    }

    public static function alreadyDelivered(string $deliveryId): self
    {
        return new self(
            "Cannot modify delivery {$deliveryId}: already delivered",
            $deliveryId,
            'Delivered'
        );
    }

    public static function alreadyCancelled(string $deliveryId): self
    {
        return new self(
            "Cannot modify delivery {$deliveryId}: already cancelled",
            $deliveryId,
            'Cancelled'
        );
    }

    public static function alreadyAssigned(string $deliveryId): self
    {
        return new self(
            "Cannot reassign delivery {$deliveryId}: already assigned to a rider",
            $deliveryId,
            'Assigned'
        );
    }
}