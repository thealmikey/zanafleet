<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Exceptions;

/**
 * Thrown when authentication fails (invalid API keys, expired tokens)
 */
class AuthenticationException extends ZanaFleetException
{
    public static function invalidCredentials(): self
    {
        return new self(
            'Invalid API credentials',
            401
        );
    }

    public static function missingCredentials(): self
    {
        return new self(
            'API credentials not configured',
            401
        );
    }

    public static function tokenExpired(): self
    {
        return new self(
            'API token has expired',
            401
        );
    }
}