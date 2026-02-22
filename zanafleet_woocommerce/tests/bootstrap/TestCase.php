<?php
/**
 * ZanaFleet Base Test Case
 * 
 * Base class for all ZanaFleet PHPUnit tests providing common utilities
 * and mock helpers.
 * 
 * @package ZanaFleet\Tests
 */

declare(strict_types=1);

namespace ZanaFleet\Tests;

use PHPUnit\Framework\TestCase as BaseTestCase;

/**
 * Base test case for ZanaFleet plugin tests
 */
abstract class TestCase extends BaseTestCase
{
    /**
     * @var bool Whether test mode is enabled
     */
    protected bool $testMode = true;

    /**
     * Set up test fixtures
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->testMode = defined('ZANAFLEET_TESTING') && ZANAFLEET_TESTING;
    }

    /**
     * Get test data directory
     */
    protected function getTestDataDir(): string
    {
        return dirname(__DIR__) . '/fixtures';
    }

    /**
     * Create a mock logger
     */
    protected function createMockLogger(): MockLogger
    {
        return new MockLogger();
    }

    /**
     * Create test delivery data
     */
    protected function getTestDeliveryData(): array
    {
        return [
            'id' => 'del_test_123',
            'business_id' => 'biz_456',
            'workspace_id' => 'ws_789',
            'external_order_id' => '12345',
            'pickup_location_id' => 'loc_pickup',
            'dropoff_location_id' => 'loc_dropoff',
            'assigned_rider_id' => 'rider_001',
            'status' => 'requested',
            'scheduled_pickup_time' => '2024-01-15T10:00:00Z',
            'scheduled_dropoff_time' => '2024-01-15T12:00:00Z',
            'recipient_name' => 'John Doe',
            'recipient_phone' => '+254712345678',
            'is_scheduled' => true,
            'assigned_at' => null,
            'picked_up_at' => null,
            'delivered_at' => null,
            'cancelled_at' => null,
            'created_at' => '2024-01-15T09:00:00Z',
            'updated_at' => '2024-01-15T09:00:00Z',
            'distance_km' => 15.5,
            'price' => 1500.00,
            'tracking_url' => 'https://track.zanafleet.com/del_test_123',
        ];
    }

    /**
     * Create test delivery quote data
     */
    protected function getTestQuoteData(): array
    {
        return [
            'id' => 'quote_abc123',
            'business_id' => 'biz_456',
            'pickup_address' => '123 Sender St, Nairobi',
            'pickup_latitude' => -1.2921,
            'pickup_longitude' => 36.8219,
            'dropoff_address' => '456 Recipient Ave, Nairobi',
            'dropoff_latitude' => -1.2865,
            'dropoff_longitude' => 36.8172,
            'distance_km' => 8.5,
            'estimated_pickup_time' => '2024-01-15T11:00:00Z',
            'estimated_dropoff_time' => '2024-01-15T11:45:00Z',
            'price' => 850.00,
            'currency' => 'KES',
            'vehicle_type' => 'motorcycle',
            'valid_until' => '2024-01-15T10:30:00Z',
            'items' => [
                [
                    'description' => 'Small package',
                    'quantity' => 1,
                    'weight_kg' => 2.0,
                ],
            ],
            'created_at' => '2024-01-15T09:30:00Z',
        ];
    }

    /**
     * Create test delivery request data
     */
    protected function getTestDeliveryRequestData(): array
    {
        return [
            'business_id' => 'biz_456',
            'workspace_id' => 'ws_789',
            'external_order_id' => '12345',
            'pickup' => [
                'address' => '123 Sender St, Nairobi',
                'latitude' => -1.2921,
                'longitude' => 36.8219,
                'contact_name' => 'Sender Name',
                'contact_phone' => '+254798765432',
                'instructions' => 'Ring doorbell',
            ],
            'dropoff' => [
                'address' => '456 Recipient Ave, Nairobi',
                'latitude' => -1.2865,
                'longitude' => 36.8172,
                'contact_name' => 'Recipient Name',
                'contact_phone' => '+254712345678',
                'instructions' => 'Leave at gate',
            ],
            'scheduled_pickup_time' => '2024-01-15T10:00:00Z',
            'scheduled_dropoff_time' => '2024-01-15T12:00:00Z',
            'is_scheduled' => true,
            'items' => [
                [
                    'description' => 'Electronics',
                    'quantity' => 1,
                    'weight_kg' => 3.0,
                    'value' => 25000.00,
                ],
            ],
            'special_instructions' => 'Handle with care',
        ];
    }

    /**
     * Create test configuration data
     */
    protected function getTestConfigData(): array
    {
        return [
            'api_key' => 'test_api_key_12345',
            'api_secret' => 'test_api_secret_67890',
            'environment' => 'sandbox',
            'webhook_secret' => 'test_webhook_secret',
            'business_id' => 'biz_456',
            'workspace_id' => 'ws_789',
            'timeout' => 30,
            'retry_attempts' => 3,
            'retry_delay_ms' => 1000,
        ];
    }

    /**
     * Assert valid delivery array
     */
    protected function assertValidDeliveryArray(array $delivery): void
    {
        $this->assertArrayHasKey('id', $delivery);
        $this->assertArrayHasKey('business_id', $delivery);
        $this->assertArrayHasKey('status', $delivery);
        $this->assertNotEmpty($delivery['id']);
        $this->assertNotEmpty($delivery['business_id']);
    }

    /**
     * Assert valid quote array
     */
    protected function assertValidQuoteArray(array $quote): void
    {
        $this->assertArrayHasKey('id', $quote);
        $this->assertArrayHasKey('business_id', $quote);
        $this->assertArrayHasKey('price', $quote);
        $this->assertNotEmpty($quote['id']);
        $this->assertIsNumeric($quote['price']);
    }

    /**
     * Create mock HTTP response
     */
    protected function createMockHttpResponse(int $statusCode, array $body, array $headers = []): array
    {
        return [
            'response' => ['code' => $statusCode],
            'body' => json_encode($body),
            'headers' => array_merge([
                'content-type' => 'application/json',
            ], $headers),
        ];
    }

    /**
     * Create mock WP_Error
     */
    protected function createMockWpError(string $code, string $message, $data = null): \WP_Error
    {
        return new \WP_Error($code, $message, $data);
    }
}

/**
 * Mock Logger for testing
 */
class MockLogger
{
    public $logs = [
        'debug' => [],
        'info' => [],
        'warning' => [],
        'error' => [],
        'critical' => [],
    ];

    public function debug($message, $context = []): void
    {
        $this->logs['debug'][] = ['message' => $message, 'context' => $context];
    }

    public function info($message, $context = []): void
    {
        $this->logs['info'][] = ['message' => $message, 'context' => $context];
    }

    public function warning($message, $context = []): void
    {
        $this->logs['warning'][] = ['message' => $message, 'context' => $context];
    }

    public function error($message, $context = []): void
    {
        $this->logs['error'][] = ['message' => $message, 'context' => $context];
    }

    public function critical($message, $context = []): void
    {
        $this->logs['critical'][] = ['message' => $message, 'context' => $context];
    }

    public function getLogs(string $level = ''): array
    {
        if (empty($level)) {
            return $this->logs;
        }
        return $this->logs[$level] ?? [];
    }

    public function clear(): void
    {
        foreach ($this->logs as $key => $value) {
            $this->logs[$key] = [];
        }
    }

    public function hasLogs(string $level): bool
    {
        return !empty($this->logs[$level]);
    }
}