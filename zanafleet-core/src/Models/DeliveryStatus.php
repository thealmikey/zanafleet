<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * Delivery status enum - mirrors ZanaFleet contracts
 */
final class DeliveryStatus
{
    public const REQUESTED = 'Requested';
    public const ASSIGNED = 'Assigned';
    public const PICKED_UP = 'PickedUp';
    public const IN_TRANSIT = 'InTransit';
    public const DELIVERED = 'Delivered';
    public const FAILED = 'Failed';
    public const CANCELLED = 'Cancelled';
    public const SCHEDULED = 'Scheduled';

    public const ALL_STATUSES = [
        self::REQUESTED,
        self::ASSIGNED,
        self::PICKED_UP,
        self::IN_TRANSIT,
        self::DELIVERED,
        self::FAILED,
        self::CANCELLED,
        self::SCHEDULED,
    ];

    public static function isValid(string $status): bool
    {
        return in_array($status, self::ALL_STATUSES, true);
    }

    public static function isTerminal(string $status): bool
    {
        return in_array($status, [self::DELIVERED, self::FAILED, self::CANCELLED], true);
    }

    public static function isActive(string $status): bool
    {
        return in_array($status, [self::ASSIGNED, self::PICKED_UP, self::IN_TRANSIT], true);
    }
}