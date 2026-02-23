<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Core\Models\DeliveryQuote;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 5: Delivery Time Slot Selection
 * 
 * As a customer,
 * I want to select a delivery time slot,
 * So that I can ensure someone is available to receive the package.
 */
class UserStory05_TimeSlotSelectionTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_api_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testQuoteIncludesAvailableTimeSlots(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'City Center, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 8000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $quote = $this->client->createQuote($request);
        $timeSlots = $quote->getTimeSlots();

        $this->assertNotEmpty($timeSlots);
        $this->assertIsArray($timeSlots);
    }

    public function testTimeSlotsHaveValidTimeRanges(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'City Center, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 8000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $quote = $this->client->createQuote($request);
        $timeSlots = $quote->getTimeSlots();

        foreach ($timeSlots as $slot) {
            $this->assertArrayHasKey('start', $slot);
            $this->assertArrayHasKey('end', $slot);
            $this->assertNotEmpty($slot['start']);
            $this->assertNotEmpty($slot['end']);
        }
    }

    public function testSelectedTimeSlotIsSavedWithOrder(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'City Center, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 8000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
            preferredTimeSlot: '14:00-16:00',
        );

        $delivery = $this->client->createDelivery($request);

        $this->assertEquals('14:00-16:00', $delivery->getPreferredTimeSlot());
    }
}
