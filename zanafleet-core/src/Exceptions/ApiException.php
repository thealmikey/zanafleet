<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Exceptions;

/**
 * Thrown when API returns an error response
 */
class ApiException extends ZanaFleetException
{
    public static function fromResponse(int $statusCode, array $response): self
    {
        $message = $response['message'] ?? $response['error'] ?? 'API Error';
        
        return new self(
            $message,
            $statusCode,
            null,
            $response,
            $statusCode
        );
    }

    public static function networkError(\Throwable $e): self
    {
        return new self(
            'Network error: ' . $e->getMessage(),
            0,
            $e
        );
    }

    public static function timeout(): self
    {
        return new self(
            'Request timed out',
            408
        );
    }

    public static function serverError(int $statusCode, ?array $response = null): self
    {
        return new self(
            'ZanaFleet server error',
            $statusCode,
            null,
            $response,
            $statusCode
        );
    }
}