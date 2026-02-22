<?php

declare(strict_types=1);

namespace ZanaFleet\Core\Configuration;

/**
 * ZanaFleet API Configuration
 * 
 * Handles API credentials and environment settings.
 * Supports sandbox (testing) and production environments.
 * Includes Test Mode for local testing without API.
 */
final class ZanaFleetConfig
{
    private const PRODUCTION_BASE_URL = 'https://api.zanafleet.com';
    private const SANDBOX_BASE_URL = 'https://sandbox.api.zanafleet.com';

    private string $apiKey;
    private string $apiSecret;
    private string $environment;
    private string $webhookSecret;
    private ?string $businessId;
    private ?string $workspaceId;
    private int $timeout;
    private int $retryAttempts;
    private int $retryDelayMs;
    private bool $testMode;

    public function __construct(
        string $apiKey,
        string $apiSecret,
        string $environment = 'sandbox',
        ?string $webhookSecret = null,
        ?string $businessId = null,
        ?string $workspaceId = null,
        int $timeout = 30,
        int $retryAttempts = 3,
        int $retryDelayMs = 1000,
        bool $testMode = false
    ) {
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->environment = $environment;
        $this->webhookSecret = $webhookSecret ?? '';
        $this->businessId = $businessId;
        $this->workspaceId = $workspaceId;
        $this->timeout = $timeout;
        $this->retryAttempts = $retryAttempts;
        $this->retryDelayMs = $retryDelayMs;
        $this->testMode = $testMode;

        // Skip validation in test mode
        if (!$testMode) {
            $this->validate();
        }
    }

    /**
     * Create config from array (e.g., from WooCommerce settings)
     */
    public static function fromArray(array $config): self
    {
        return new self(
            $config['api_key'] ?? '',
            $config['api_secret'] ?? '',
            $config['environment'] ?? 'sandbox',
            $config['webhook_secret'] ?? null,
            $config['business_id'] ?? null,
            $config['workspace_id'] ?? null,
            (int) ($config['timeout'] ?? 30),
            (int) ($config['retry_attempts'] ?? 3),
            (int) ($config['retry_delay_ms'] ?? 1000),
            (bool) ($config['test_mode'] ?? false)
        );
    }

    /**
     * Create a test mode configuration for local testing
     */
    public static function createTestMode(): self
    {
        return new self(
            'test_api_key_12345',
            'test_api_secret_67890',
            'sandbox',
            'test_webhook_secret',
            'test_business_id',
            'test_workspace_id',
            10,
            1,
            500,
            true // testMode = true
        );
    }

    /**
     * Check if test mode is enabled
     */
    public function isTestMode(): bool
    {
        return $this->testMode;
    }

    /**
     * Get the base URL for API requests
     */
    public function getBaseUrl(): string
    {
        // In test mode, return a mock URL
        if ($this->testMode) {
            return 'http://localhost:3000/api';
        }
        
        return $this->environment === 'production'
            ? self::PRODUCTION_BASE_URL
            : self::SANDBOX_BASE_URL;
    }

    /**
     * Check if running in sandbox mode
     */
    public function isSandbox(): bool
    {
        return $this->environment === 'sandbox';
    }

    /**
     * Get headers for API requests
     */
    public function getHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->apiKey . ':' . $this->apiSecret,
            'Content-Type' => 'application/json',
            'X-Client-Version' => '1.0.0',
            'X-Platform' => 'PHP-SDK',
        ];
    }

    // Getters
    public function getApiKey(): string { return $this->apiKey; }
    public function getApiSecret(): string { return $this->apiSecret; }
    public function getEnvironment(): string { return $this->environment; }
    public function getWebhookSecret(): string { return $this->webhookSecret; }
    public function getBusinessId(): ?string { return $this->businessId; }
    public function getWorkspaceId(): ?string { return $this->workspaceId; }
    public function getTimeout(): int { return $this->timeout; }
    public function getRetryAttempts(): int { return $this->retryAttempts; }
    public function getRetryDelayMs(): int { return $this->retryDelayMs; }

    private function validate(): void
    {
        if (empty($this->apiKey)) {
            throw new \InvalidArgumentException('API Key is required');
        }

        if (empty($this->apiSecret)) {
            throw new \InvalidArgumentException('API Secret is required');
        }

        if (!in_array($this->environment, ['sandbox', 'production'], true)) {
            throw new \InvalidArgumentException('Environment must be "sandbox" or "production"');
        }

        if ($this->timeout < 1 || $this->timeout > 300) {
            throw new \InvalidArgumentException('Timeout must be between 1 and 300 seconds');
        }
    }
}