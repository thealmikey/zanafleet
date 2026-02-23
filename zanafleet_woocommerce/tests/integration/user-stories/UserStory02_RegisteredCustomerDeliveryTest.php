<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Core\Models\Delivery;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 2: Registered Customer Creates Delivery
 * 
 * As a registered customer,
 * I want my delivery to be linked to my account,
 * So that I can track my order history and manage deliveries.
 */
class UserStory02_RegisteredCustomerDeliveryTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_api_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testRegisteredCustomerCanCreateDelivery(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '100 Business Park, Nairobi',
            deliveryAddress: '200 Residential Ave, Nairobi',
            packageDetails: ['weight' => 3.0, 'dimensions' => ['length' => 25, 'width' => 20, 'height' => 15], 'description' => 'Clothing', 'value' => 15000],
            customerName: 'John Doe',
            customerPhone: '+254711111111',
            customerEmail: 'john@example.com',
            customerId: 'cust_12345',
        );

        $delivery = $this->client->createDelivery($request);

        $this->assertInstanceOf(Delivery::class, $delivery);
        $this->assertNotEmpty($delivery->getId());
        $this->assertEquals('PENDING', $delivery->getStatus());
        $this->assertEquals('cust_12345', $delivery->getCustomerId());
    }

    public function testDeliveryIsLinkedToWooCommerceOrder(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '100 Business Park, Nairobi',
            deliveryAddress: '200 Residential Ave, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Books', 'value' => 5000],
            customerName: 'Jane Doe',
            customerPhone: '+254722222222',
            customerEmail: 'jane@example.com',
            externalOrderId: 'WC-12345',
        );

        $delivery = $this->client->createDelivery($request);

        $this->assertEquals('WC-12345', $delivery->getExternalOrderId());
    }

    public function testCanRetrieveDeliveryByExternalId(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '100 Business Park, Nairobi',
            deliveryAddress: '200 Residential Ave, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 15, 'width' => 10, 'height' => 5], 'description' => 'Electronics', 'value' => 20000],
            customerName: 'Test User',
            customerPhone: '+254733333333',
            customerEmail: 'test@example.com',
            externalOrderId: 'WC-99999',
        );

        $created = $this->client->createDelivery($request);
        $retrieved = $this->client->getDeliveryByExternalId('WC-99999');

        $this->assertNotNull($retrieved);
        $this->assertEquals($created->getId(), $retrieved->getId());
    }

    public function testRegisteredCustomerCanCancelDelivery(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '100 Business Park, Nairobi',
            deliveryAddress: '200 Residential Ave, Nairobi',
            packageDetails: ['weight' => 1.5, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Items', 'value' => 8000],
            customerName: 'Cancel Test',
            customerPhone: '+254744444444',
            customerEmail: 'cancel@example.com',
        );

        $delivery = $this->client->createDelivery($request);
        $cancelled = $this->client->cancelDelivery($delivery->getId(), 'Customer requested cancellation');

        $this->assertEquals('CANCELLED', $cancelled->getStatus());
    }
}
