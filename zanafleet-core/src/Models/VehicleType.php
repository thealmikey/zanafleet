<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Models;

/**
 * Vehicle type enum - mirrors ZanaFleet contracts
 */
final class VehicleType
{
    public const BIKE = 'Bike';
    public const CAR = 'Car';
    public const TUKTUK = 'TukTuk';
    public const PICKUP = 'Pickup';
    public const LORRY = 'Lorry';
    public const VAN = 'Van';

    public const ALL_TYPES = [
        self::BIKE,
        self::CAR,
        self::TUKTUK,
        self::PICKUP,
        self::LORRY,
        self::VAN,
    ];

    /**
     * Get vehicle type suitable for package size
     */
    public static function forPackageSize(string $size): string
    {
        return match ($size) {
            'small' => self::BIKE,
            'medium' => self::CAR,
            'large' => self::TUKTUK,
            'xlarge' => self::PICKUP,
            default => self::BIKE,
        };
    }

    public static function isValid(string $type): bool
    {
        return in_array($type, self::ALL_TYPES, true);
    }
}