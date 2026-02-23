<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Core\Models\DeliveryQuote;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 1: Guest Customer Gets Delivery Quote
 * 
 * As a guest customer (not logged in),
 * I want to see delivery options and pricing at checkout,
 * So that I can complete my purchase with delivery.
 */
class UserStory01_GuestCheckoutQuoteTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->config = new ZanaFleetConfig([
            'api_key' => 'test_api_key_12345',
            'api_secret' => 'test_api_secret_67890',
            'base_url' => 'https://api.zanafleet.test/v1',
            'test_mode' => true,
        ]);
        
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testGuestCanRequestDeliveryQuote(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '123 Store Street, Nairobi, Kenya',
            deliveryAddress: '456 Customer Avenue, Nairobi, Kenya',
            packageDetails: [
                'weight' => 5.5,
                'dimensions' => ['length' => 30, 'width' => 20, 'height' => 15],
                'description' => 'Electronics',
                'value' => 25000,
            ],
            customerName: 'Guest Customer',
            customerPhone: '+254700000000',
            customerEmail: 'guest@example.com',
        );

        $quote = $this->client->createQuote($request);

        $this->assertInstanceOf(DeliveryQuote::class, $quote);
        $this->assertNotEmpty($quote->getId());
        $this->assertGreaterThan(0, $quote->getPrice());
        $this->assertNotEmpty($quote->getCurrency());
    }

    public function testGuestQuoteIncludesEstimatedDeliveryTime(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '123 Store Street, Nairobi, Kenya',
            deliveryAddress: '456 Customer Avenue, Nairobi, Kenya',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Books', 'value' => 5000],
            customerName: 'Guest',
            customerPhone: '+254700000001',
            customerEmail: 'guest2@example.com',
        );

        $quote = $this->client->createQuote($request);
        
        $this->assertNotEmpty($quote->getEstimatedDeliveryTime());
    }

    public function testGuestQuoteHasMultipleVehicleOptions(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '123 Store Street, Nairobi, Kenya',
            deliveryAddress: '456 Customer Avenue, Nairobi, Kenya',
            packageDetails: ['weight' => 10.0, 'dimensions' => ['length' => 50, 'width' => 40, 'height' => 30], 'description' => 'Large package', 'value' => 50000],
            customerName: 'Guest',
            customerPhone: '+254700000002',
            customerEmail: 'guest3@example.com',
        );

        $quote = $this->client->createQuote($request);
        $options = $quote->getVehicleOptions();
        
        $this->assertNotEmpty($options);
    }

    public function testGuestCheckoutFailsWithInvalidAddress(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '123 Store Street, Nairobi, Kenya',
            deliveryAddress: '',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 10, 'width' => 10, 'height' => 10], 'description' => 'Small item', 'value' => 1000],
            customerName: 'Guest',
            customerPhone: '+254700000003',
            customerEmail: 'guest4@example.com',
        );

        $this->expectException(\ZanaFleet\Core\Exceptions\ApiException::class);
        $this->client->createQuote($request);
    }

    public function testGuestCheckoutFailsWithUnserviceableLocation(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '123 Store Street, Nairobi, Kenya',
            deliveryAddress: 'Remote Location, Marsabit, Kenya',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 10, 'width' => 10, 'height' => 10], 'description' => 'Small item', 'value' => 1000],
            customerName: 'Guest',
            customerPhone: '+254700000004',
            customerEmail: 'guest5@example.com',
        );

        $this->expectException(\ZanaFleet\Core\Exceptions\ApiException::class);
        $this->client->createQuote($request);
    }

    public function testGuestQuoteIsValidForReasonableTime(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: '123 Store Street, Nairobi, Kenya',
            deliveryAddress: '456 Customer Avenue, Nairobi, Kenya',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 10, 'width' => 10, 'height' => 10], 'description' => 'Item', 'value' => 1000],
            customerName: 'Guest',
            customerPhone: '+254700000005',
            customerEmail: 'guest5@example.com',
        );

        $quote = $this->client->createQuote($request);
        $validUntil = new \DateTime($quote->getValidUntil());
        $now = new \DateTime();
        
        $this->assertGreaterThan($now, $validUntil);
        $diff = $validUntil->getTimestamp() - $now->getTimestamp();
        $this->assertGreaterThanOrEqual(300, $diff);
        $this->assertLessThanOrEqual(3600, $diff);
    }
}
