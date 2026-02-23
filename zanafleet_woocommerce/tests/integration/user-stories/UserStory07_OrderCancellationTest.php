<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 7: Order Cancellation
 * 
 * As a customer,
 * I want to cancel my delivery order,
 * So that I can change my mind before the package is picked up.
 */
class UserStory07_OrderCancellationTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_api_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testCanCancelPendingDelivery(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer Address, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Item', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $delivery = $this->client->createDelivery($request);
        $cancelled = $this->client->cancelDelivery($delivery->getId(), 'Changed my mind');

        $this->assertEquals('CANCELLED', $cancelled->getStatus());
        $this->assertEquals('Changed my mind', $cancelled->getCancellationReason());
    }

    public function testCancellationFailsForInProgressDelivery(): void
    {
        // This would be tested with a delivery in IN_PROGRESS state
        // In test mode, we'd simulate this
        
        $this->expectException(\ZanaFleet\Core\Exceptions\ApiException::class);
        
        // Attempt to cancel a delivery that's already picked up
        $this->client->cancelDelivery('delivery_in_progress_123', 'Test');
    }

    public function testCancellationReturnsRefundInfo(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer Address, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Item', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000002',
            customerEmail: 'test2@example.com',
        );

        $delivery = $this->client->createDelivery($request);
        $cancelled = $this->client->cancelDelivery($delivery->getId());

        // Should include refund information
        $this->assertArrayHasKey('refundAmount', (array) $cancelled);
    }
}
