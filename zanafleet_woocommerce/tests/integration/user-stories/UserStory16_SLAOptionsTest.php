<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Core\Models\SLAOptions;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 16: SLA Options
 * 
 * As a store owner,
 * I want to offer different SLA options,
 * So that customers can choose delivery speed.
 */
class UserStory16_SLAOptionsTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testQuoteIncludesSLAOptions(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $quote = $this->client->createQuote($request);
        $slaOptions = $quote->getSlaOptions();

        $this->assertNotEmpty($slaOptions);
        $this->assertIsArray($slaOptions);
    }

    public function testSLAOptionsHaveDifferentPrices(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test',
            customerPhone: '+254700000002',
            customerEmail: 'test2@example.com',
        );

        $quote = $this->client->createQuote($request);
        $slaOptions = $quote->getSlaOptions();

        // Should have standard and express options
        $types = array_column($slaOptions, 'type');
        $this->assertContains('standard', $types);
        $this->assertContains('express', $types);
    }

    public function testExpressSLAIsMoreExpensive(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test',
            customerPhone: '+254700000003',
            customerEmail: 'test3@example.com',
        );

        $quote = $this->client->createQuote($request);
        $slaOptions = $quote->getSlaOptions();

        $express = array_values(array_filter($slaOptions, fn($s) => $s['type'] === 'express'))[0];
        $standard = array_values(array_filter($slaOptions, fn($s) => $s['type'] === 'standard'))[0];

        $this->assertGreaterThan($standard['price'], $express['price']);
    }

    public function testSelectedSLAIsSavedWithDelivery(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 2.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 10000],
            customerName: 'Test',
            customerPhone: '+254700000004',
            customerEmail: 'test4@example.com',
            slaType: 'express',
        );

        $delivery = $this->client->createDelivery($request);

        $this->assertEquals('express', $delivery->getSlaType());
    }
}
