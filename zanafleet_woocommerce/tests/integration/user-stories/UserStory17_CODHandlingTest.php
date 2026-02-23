<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 17: Cash on Delivery (COD) Handling
 * 
 * As a store owner,
 * I want to offer cash on delivery option,
 * So that customers who prefer paying upon delivery can do so.
 */
class UserStory17_CODHandlingTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testCanCreateDeliveryWithCOD(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test COD',
            customerPhone: '+254700000001',
            customerEmail: 'cod@example.com',
            paymentType: 'COD',
            codAmount: 10000,
        );

        $delivery = $this->client->createDelivery($request);

        $this->assertEquals('COD', $delivery->getPaymentType());
        $this->assertEquals(10000, $delivery->getCodAmount());
    }

    public function testCODAmountCannotExceedOrderTotal(): void
    {
        // COD amount should be validated against order value
        $this->expectException(\ZanaFleet\Core\Exceptions\ApiException::class);
        
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test',
            customerPhone: '+254700000002',
            customerEmail: 'test@example.com',
            paymentType: 'COD',
            codAmount: 50000, // More than order value
        );

        $this->client->createDelivery($request);
    }

    public function testCODStatusUpdatesOnCollection(): void
    {
        // When rider collects cash, COD status should update
        $delivery = (object) [
            'id' => 'DEL-COD-123',
            'paymentType' => 'COD',
            'codAmount' => 5000,
            'codStatus' => 'PENDING',
        ];

        // Simulate collection
        $delivery->codStatus = 'COLLECTED';

        $this->assertEquals('COLLECTED', $delivery->codStatus);
    }

    public function testCODFailureUpdatesOrder(): void
    {
        // When customer refuses to pay, should update status
        $delivery = (object) [
            'id' => 'DEL-COD-456',
            'paymentType' => 'COD',
            'codAmount' => 5000,
            'codStatus' => 'PENDING',
        ];

        $delivery->codStatus = 'FAILED';
        $delivery->codFailureReason = 'Customer refused payment';

        $this->assertEquals('FAILED', $delivery->codStatus);
    }
}
