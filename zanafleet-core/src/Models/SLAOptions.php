<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * SLA (Service Level Agreement) options for delivery
 */
final class SLAOptions
{
    private ?\DateTime $scheduledPickupTime;
    private ?\DateTime $scheduledDropoffTime;
    private bool $isScheduled;
    private ?string $priority;
    private ?int $estimatedPickupMinutes;
    private ?int $estimatedDeliveryMinutes;

    public const PRIORITY_STANDARD = 'standard';
    public const PRIORITY_EXPRESS = 'express';
    public const PRIORITY_SAME_DAY = 'same_day';
    public const PRIORITY_SCHEDULED = 'scheduled';

    public function __construct(
        ?\DateTime $scheduledPickupTime = null,
        ?\DateTime $scheduledDropoffTime = null,
        bool $isScheduled = false,
        ?string $priority = null,
        ?int $estimatedPickupMinutes = null,
        ?int $estimatedDeliveryMinutes = null
    ) {
        $this->scheduledPickupTime = $scheduledPickupTime;
        $this->scheduledDropoffTime = $scheduledDropoffTime;
        $this->isScheduled = $isScheduled;
        $this->priority = $priority ?? self::PRIORITY_STANDARD;
        $this->estimatedPickupMinutes = $estimatedPickupMinutes;
        $this->estimatedDeliveryMinutes = $estimatedDeliveryMinutes;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            isset($data['scheduledPickupTime']) ? new \DateTime($data['scheduledPickupTime']) : null,
            isset($data['scheduledDropoffTime']) ? new \DateTime($data['scheduledDropoffTime']) : null,
            $data['isScheduled'] ?? false,
            $data['priority'] ?? null,
            $data['estimatedPickupMinutes'] ?? null,
            $data['estimatedDeliveryMinutes'] ?? null
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'scheduledPickupTime' => $this->scheduledPickupTime?->format(\DateTime::ATOM),
            'scheduledDropoffTime' => $this->scheduledDropoffTime?->format(\DateTime::ATOM),
            'isScheduled' => $this->isScheduled,
            'priority' => $this->priority,
            'estimatedPickupMinutes' => $this->estimatedPickupMinutes,
            'estimatedDeliveryMinutes' => $this->estimatedDeliveryMinutes,
        ], fn($v) => $v !== null);
    }

    public static function standard(): self
    {
        return new self(null, null, false, self::PRIORITY_STANDARD);
    }

    public static function express(): self
    {
        return new self(null, null, false, self::PRIORITY_EXPRESS);
    }

    public static function scheduled(\DateTime $pickup, \DateTime $dropoff): self
    {
        return new self($pickup, $dropoff, true, self::PRIORITY_SCHEDULED);
    }

    // Getters
    public function getScheduledPickupTime(): ?\DateTime { return $this->scheduledPickupTime; }
    public function getScheduledDropoffTime(): ?\DateTime { return $this->scheduledDropoffTime; }
    public function isScheduled(): bool { return $this->isScheduled; }
    public function getPriority(): ?string { return $this->priority; }
    public function getEstimatedPickupMinutes(): ?int { return $this->estimatedPickupMinutes; }
    public function getEstimatedDeliveryMinutes(): ?int { return $this->estimatedDeliveryMinutes; }
}