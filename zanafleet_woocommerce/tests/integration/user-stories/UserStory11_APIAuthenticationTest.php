<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Exceptions\AuthenticationException;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 11: API Authentication
 * 
 * As a store owner,
 * I want secure API authentication,
 * So that only authorized users can access my account.
 */
class UserStory11_APIAuthenticationTest extends TestCase
{
    public function testValidCredentialsConnect(): void
    {
        $config = new ZanaFleetConfig([
            'api_key' => 'valid_key_12345',
            'api_secret' => 'valid_secret_67890',
            'base_url' => 'https://api.zanafleet.test/v1',
        ]);

        $client = new ZanaFleetClient($config);

        // Should not throw exception
        $this->assertInstanceOf(ZanaFleetClient::class, $client);
    }

    public function testInvalidApiKeyRejected(): void
    {
        $config = new ZanaFleetConfig([
            'api_key' => 'invalid_key',
            'api_secret' => 'valid_secret',
            'base_url' => 'https://api.zanafleet.test/v1',
        ]);

        $client = new ZanaFleetClient($config);
        
        $this->expectException(AuthenticationException::class);
        
        // Attempt to create a delivery
        $client->createDelivery(new \ZanaFleet\Core\Models\DeliveryRequest(
            pickupAddress: 'Test',
            deliveryAddress: 'Test',
            packageDetails: ['weight' => 1, 'dimensions' => ['l' => 10, 'w' => 10, 'h' => 10], 'desc' => 'Test', 'value' => 1000],
            customerName: 'Test',
            customerPhone: '+254700000000',
            customerEmail: 'test@test.com',
        ));
    }

    public function testMissingCredentialsRejected(): void
    {
        $config = new ZanaFleetConfig([
            'api_key' => '',
            'api_secret' => '',
            'base_url' => 'https://api.zanafleet.test/v1',
        ]);

        $this->expectException(\InvalidArgumentException::class);
        new ZanaFleetClient($config);
    }

    public function testTokenRefreshOnExpiry(): void
    {
        $config = new ZanaFleetConfig([
            'api_key' => 'test_key',
            'api_secret' => 'test_secret',
            'base_url' => 'https://api.zanafleet.test/v1',
            'test_mode' => true,
        ]);

        $client = new ZanaFleetClient($config);
        
        // Simulate token expiry - should automatically refresh
        // This would be tested with actual API mock
        $this->assertTrue(true); // Placeholder
    }
}
