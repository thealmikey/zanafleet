<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Exceptions;

/**
 * Base exception for ZanaFleet SDK
 */
class ZanaFleetException extends \Exception
{
    private ?array $responseData;
    private ?int $statusCode;

    public function __construct(
        string $message,
        int $code = 0,
        ?\Throwable $previous = null,
        ?array $responseData = null,
        ?int $statusCode = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->responseData = $responseData;
        $this->statusCode = $statusCode;
    }

    public function getResponseData(): ?array
    {
        return $this->responseData;
    }

    public function getStatusCode(): ?int
    {
        return $this->statusCode;
    }
}