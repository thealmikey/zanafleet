<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 6: Vehicle Type Selection
 * 
 * As a customer,
 * I want to choose the type of vehicle for my delivery,
 * So that I can select appropriate transport for my package size/value.
 */
class UserStory06_VehicleTypeSelectionTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_api_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testQuoteShowsMultipleVehicleTypes(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Suburbs, Nairobi',
            packageDetails: ['weight' => 50.0, 'dimensions' => ['length' => 200, 'width' => 150, 'height' => 100], 'description' => 'Furniture', 'value' => 100000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $quote = $this->client->createQuote($request);
        $options = $quote->getVehicleOptions();

        $this->assertCountGreaterThan(1, $options);
        
        $vehicleTypes = array_column($options, 'type');
        $this->assertContains('motorcycle', $vehicleTypes);
        $this->assertContains('van', $vehicleTypes);
    }

    public function testVehicleTypeAffectsPrice(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'City, Nairobi',
            packageDetails: ['weight' => 10.0, 'dimensions' => ['length' => 50, 'width' => 40, 'height' => 30], 'description' => 'Package', 'value' => 20000],
            customerName: 'Test',
            customerPhone: '+254700000002',
            customerEmail: 'test2@example.com',
        );

        $quote = $this->client->createQuote($request);
        $options = $quote->getVehicleOptions();

        $prices = array_column($options, 'price');
        $this->assertGreaterThan(max($prices), min($prices));
    }

    public function testSelectedVehicleIsSavedWithDelivery(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'City, Nairobi',
            packageDetails: ['weight' => 10.0, 'dimensions' => ['length' => 50, 'width' => 40, 'height' => 30], 'description' => 'Package', 'value' => 20000],
            customerName: 'Test',
            customerPhone: '+254700000003',
            customerEmail: 'test3@example.com',
            vehicleType: 'van',
        );

        $delivery = $this->client->createDelivery($request);

        $this->assertEquals('van', $delivery->getVehicleType());
    }
}
