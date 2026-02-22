<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Client;

use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Exceptions\ApiException;
use ZanaFleet\Core\Exceptions\AuthenticationException;
use ZanaFleet\Core\Exceptions\DeliveryConflictException;
use ZanaFleet\Core\Exceptions\ZanaFleetException;
use ZanaFleet\Core\Models\Delivery;
use ZanaFleet\Core\Models\DeliveryQuote;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Core\Models\DeliveryStatus;
use Psr\Log\LoggerInterface;

/**
 * Main ZanaFleet API Client
 * 
 * Provides methods for:
 * - Creating delivery quotes
 * - Creating, retrieving, and cancelling deliveries
 * - Webhook registration and verification
 */
class ZanaFleetClient
{
    private ZanaFleetConfig $config;
    private ?LoggerInterface $logger;

    public function __construct(ZanaFleetConfig $config, ?LoggerInterface $logger = null)
    {
        $this->config = $config;
        $this->logger = $logger;
    }

    /**
     * Create a delivery quote without creating the delivery
     */
    public function createQuote(DeliveryRequest $request): DeliveryQuote
    {
        $response = $this->request('POST', '/api/v1/quotes', $request->toArray());
        return DeliveryQuote::fromArray($response);
    }

    /**
     * Create a new delivery (after quote or directly)
     */
    public function createDelivery(DeliveryRequest $request, ?string $quoteId = null): Delivery
    {
        $payload = $request->toArray();
        if ($quoteId) {
            $payload['quoteId'] = $quoteId;
        }

        $response = $this->request('POST', '/api/v1/deliveries', $payload);
        return Delivery::fromArray($response);
    }

    /**
     * Get a delivery by ID
     */
    public function getDelivery(string $deliveryId): Delivery
    {
        $response = $this->request('GET', "/api/v1/deliveries/{$deliveryId}");
        return Delivery::fromArray($response);
    }

    /**
     * Get delivery by external order ID (e.g., WooCommerce order ID)
     */
    public function getDeliveryByExternalId(string $externalOrderId): ?Delivery
    {
        try {
            $response = $this->request('GET', '/api/v1/deliveries', ['externalOrderId' => $externalOrderId]);
            if (empty($response['data'])) {
                return null;
            }
            return Delivery::fromArray($response['data'][0]);
        } catch (ApiException $e) {
            if ($e->getStatusCode() === 404) {
                return null;
            }
            throw $e;
        }
    }

    /**
     * Cancel a delivery
     */
    public function cancelDelivery(string $deliveryId, ?string $reason = null): Delivery
    {
        $payload = ['reason' => $reason ?? 'Cancelled by customer'];
        $response = $this->request('POST', "/api/v1/deliveries/{$deliveryId}/cancel", $payload);
        return Delivery::fromArray($response);
    }

    /**
     * Register a webhook endpoint
     */
    public function registerWebhook(string $url, array $events): array
    {
        $payload = [
            'url' => $url,
            'events' => $events,
            'active' => true,
        ];
        return $this->request('POST', '/api/v1/webhooks', $payload);
    }

    /**
     * List registered webhooks
     */
    public function listWebhooks(): array
    {
        $response = $this->request('GET', '/api/v1/webhooks');
        return $response['data'] ?? [];
    }

    /**
     * Delete a webhook
     */
    public function deleteWebhook(string $webhookId): void
    {
        $this->request('DELETE', "/api/v1/webhooks/{$webhookId}");
    }

    /**
     * Verify webhook signature
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if (empty($this->config->getWebhookSecret())) {
            throw new \RuntimeException('Webhook secret not configured');
        }

        $expected = hash_hmac('sha256', $payload, $this->config->getWebhookSecret());
        return hash_equals($expected, $signature);
    }

    /**
     * Make an HTTP request to the API
     */
    private function request(string $method, string $endpoint, ?array $data = null): array
    {
        $url = $this->config->getBaseUrl() . $endpoint;
        $headers = $this->config->getHeaders();

        $this->log("Request: {$method} {$url}");

        $attempt = 0;
        $maxAttempts = $this->config->getRetryAttempts();

        while ($attempt < $maxAttempts) {
            $attempt++;
            try {
                $result = $this->executeRequest($method, $url, $headers, $data);
                return $result;
            } catch (ApiException $e) {
                // Don't retry on client errors (4xx)
                if ($e->getStatusCode() && $e->getStatusCode() < 500) {
                    throw $e;
                }

                // Retry on server errors
                if ($attempt >= $maxAttempts) {
                    throw $e;
                }

                $delayMs = $this->config->getRetryDelayMs() * $attempt;
                usleep($delayMs * 1000);
                $this->log("Retry attempt {$attempt} after {$delayMs}ms");
            }
        }

        throw new ApiException('Max retries exceeded', 500);
    }

    private function executeRequest(string $method, string $url, array $headers, ?array $data): array
    {
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->config->getTimeout());
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_map(
            fn($k, $v) => "{$k}: {$v}",
            array_keys($headers),
            array_values($headers)
        ));

        switch ($method) {
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                if ($data) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;
            case 'GET':
                if ($data) {
                    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($data));
                }
                break;
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
        }

        $response = curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw ApiException::networkError(new \Exception($error));
        }

        if ($statusCode === 0) {
            throw ApiException::timeout();
        }

        $data = json_decode($response, true);

        if ($statusCode >= 400) {
            $this->handleError($statusCode, $data ?? ['message' => 'Unknown error']);
        }

        return $data ?? [];
    }

    private function handleError(int $statusCode, array $response): void
    {
        $message = $response['message'] ?? $response['error'] ?? 'API Error';

        // Handle specific error cases
        if ($statusCode === 401) {
            throw AuthenticationException::invalidCredentials();
        }

        if ($statusCode === 409 && isset($response['currentStatus'])) {
            throw new DeliveryConflictException(
                $message,
                $response['deliveryId'] ?? '',
                $response['currentStatus'],
                $statusCode
            );
        }

        if ($statusCode >= 500) {
            throw ApiException::serverError($statusCode, $response);
        }

        throw ApiException::fromResponse($statusCode, $response);
    }

    private function log(string $message): void
    {
        if ($this->logger) {
            $this->logger->info($message);
        }
    }

    // Convenience methods
    public function getConfig(): ZanaFleetConfig
    {
        return $this->config;
    }

    public function isSandbox(): bool
    {
        return $this->config->isSandbox();
    }
}