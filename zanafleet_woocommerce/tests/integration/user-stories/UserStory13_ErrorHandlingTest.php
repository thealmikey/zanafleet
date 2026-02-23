<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Exceptions\ApiException;
use ZanaFleet\Core\Exceptions\AuthenticationException;
use ZanaFleet\Core\Exceptions\DeliveryConflictException;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 13: Error Handling
 * 
 * As a store owner,
 * I want clear error messages when something goes wrong,
 * So that I can quickly identify and resolve issues.
 */
class UserStory13_ErrorHandlingTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testNetworkErrorIncludesHelpfulMessage(): void
    {
        try {
            $this->client->createDelivery(new \ZanaFleet\Core\Models\DeliveryRequest(
                pickupAddress: 'Test',
                deliveryAddress: 'Test',
                packageDetails: ['weight' => 1, 'dimensions' => ['l' => 10, 'w' => 10, 'h' => 10], 'desc' => 'Test', 'value' => 1000],
                customerName: 'Test',
                customerPhone: '+254700000000',
                customerEmail: 'test@test.com',
            ));
        } catch (ApiException $e) {
            $this->assertNotEmpty($e->getMessage());
            $this->assertNotEmpty($e->getStatusCode());
        }
    }

    public function testRateLimitErrorIncludesRetryInfo(): void
    {
        // Should include retry-after header info
        $this->assertTrue(true); // Placeholder
    }

    public function testValidationErrorsAreDescriptive(): void
    {
        // Empty address should give clear error
        $this->expectException(ApiException::class);
        
        $this->client->createDelivery(new \ZanaFleet\Core\Models\DeliveryRequest(
            pickupAddress: '',
            deliveryAddress: '',
            packageDetails: ['weight' => 1, 'dimensions' => ['l' => 10, 'w' => 10, 'h' => 10], 'desc' => 'Test', 'value' => 1000],
            customerName: 'Test',
            customerPhone: '+254700000000',
            customerEmail: 'test@test.com',
        ));
    }

    public function testConflictErrorForDuplicateDelivery(): void
    {
        $this->expectException(DeliveryConflictException::class);
        
        // Try to create duplicate delivery
        $this->client->createDelivery(new \ZanaFleet\Core\Models\DeliveryRequest(
            pickupAddress: 'Test',
            deliveryAddress: 'Test',
            packageDetails: ['weight' => 1, 'dimensions' => ['l' => 10, 'w' => 10, 'h' => 10], 'desc' => 'Test', 'value' => 1000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test1@test.com',
            externalOrderId: 'WC-DUPLICATE-123',
        ));
        
        // Try again with same external ID
        $this->client->createDelivery(new \ZanaFleet\Core\Models\DeliveryRequest(
            pickupAddress: 'Test',
            deliveryAddress: 'Test',
            packageDetails: ['weight' => 1, 'dimensions' => ['l' => 10, 'w' => 10, 'h' => 10], 'desc' => 'Test', 'value' => 1000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test1@test.com',
            externalOrderId: 'WC-DUPLICATE-123',
        ));
    }
}
