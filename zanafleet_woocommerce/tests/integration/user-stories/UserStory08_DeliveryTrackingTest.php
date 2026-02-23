<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 8: Delivery Tracking
 * 
 * As a customer,
 * I want to track my delivery in real-time,
 * So that I know exactly where my package is.
 */
class UserStory08_DeliveryTrackingTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_api_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testCanRetrieveDeliveryStatus(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Item', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $created = $this->client->createDelivery($request);
        $retrieved = $this->client->getDelivery($created->getId());

        $this->assertNotEmpty($retrieved->getStatus());
        $this->assertContains($retrieved->getStatus(), ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']);
    }

    public function testDeliveryStatusIncludesTimeline(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Item', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000002',
            customerEmail: 'test2@example.com',
        );

        $created = $this->client->createDelivery($request);
        $retrieved = $this->client->getDelivery($created->getId());

        $timeline = $retrieved->getTimeline();
        $this->assertNotEmpty($timeline);
        $this->assertIsArray($timeline);
        
        // First event should be creation
        $this->assertEquals('CREATED', $timeline[0]['status']);
    }

    public function testDeliveryTrackingIncludesDriverInfo(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Item', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000003',
            customerEmail: 'test3@example.com',
        );

        $created = $this->client->createDelivery($request);
        $retrieved = $this->client->getDelivery($created->getId());

        // Once assigned, should have driver info
        if (in_array($retrieved->getStatus(), ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])) {
            $this->assertNotEmpty($retrieved->getDriverName());
            $this->assertNotEmpty($retrieved->getDriverPhone());
        }
    }

    public function testDeliveryTrackingIncludesLocation(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Item', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000004',
            customerEmail: 'test4@example.com',
        );

        $created = $this->client->createDelivery($request);
        $retrieved = $this->client->getDelivery($created->getId());

        // Once in transit, should have current location
        if ($retrieved->getStatus() === 'IN_TRANSIT') {
            $this->assertNotEmpty($retrieved->getCurrentLocation());
        }
    }
}
