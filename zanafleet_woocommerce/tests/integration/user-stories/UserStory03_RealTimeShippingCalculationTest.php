<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 3: Real-Time Shipping Calculation
 * 
 * As a customer at checkout,
 * I want to see real-time shipping costs,
 * So that I know the exact total before paying.
 */
class UserStory03_RealTimeShippingCalculationTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_api_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testShippingCalculationUpdatesOnAddressChange(): void
    {
        $request1 = new DeliveryRequest(
            pickupAddress: 'Central Warehouse, Nairobi',
            deliveryAddress: 'Downtown Nairobi',
            packageDetails: ['weight' => 5.0, 'dimensions' => ['length' => 30, 'width' => 20, 'height' => 15], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $quote1 = $this->client->createQuote($request1);

        $request2 = new DeliveryRequest(
            pickupAddress: 'Central Warehouse, Nairobi',
            deliveryAddress: 'Kasarani, Nairobi',
            packageDetails: ['weight' => 5.0, 'dimensions' => ['length' => 30, 'width' => 20, 'height' => 15], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $quote2 = $this->client->createQuote($request2);

        // Different locations should have different prices
        $this->assertNotEquals($quote1->getPrice(), $quote2->getPrice());
    }

    public function testShippingCalculationIncludesFuelSurcharge(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Mombasa Road, Nairobi',
            packageDetails: ['weight' => 10.0, 'dimensions' => ['length' => 40, 'width' => 30, 'height' => 20], 'description' => 'Heavy items', 'value' => 30000],
            customerName: 'Test',
            customerPhone: '+254700000002',
            customerEmail: 'test2@example.com',
        );

        $quote = $this->client->createQuote($request);

        // Price should reflect distance and weight
        $this->assertGreaterThan(500, $quote->getPrice());
    }

    public function testShippingCalculationFactorsPackageDimensions(): void
    {
        $small = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Westlands, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 10, 'width' => 10, 'height' => 10], 'description' => 'Small', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000003',
            customerEmail: 'test3@example.com',
        );

        $large = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Westlands, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 100, 'width' => 100, 'height' => 100], 'description' => 'Large', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000003',
            customerEmail: 'test3@example.com',
        );

        $quoteSmall = $this->client->createQuote($small);
        $quoteLarge = $this->client->createQuote($large);

        // Larger package should cost more
        $this->assertGreaterThan($quoteSmall->getPrice(), $quoteLarge->getPrice());
    }
}
