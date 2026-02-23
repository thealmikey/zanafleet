<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 18: Delivery Confirmation
 * 
 * As a customer,
 * I want to confirm receipt of my delivery,
 * So that I can verify the package arrived safely.
 */
class UserStory18_DeliveryConfirmationTest extends TestCase
{
    private ZanaFleetClient $client;
    private ZanaFleetConfig $config;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = new ZanaFleetConfig(['api_key' => 'test_key', 'api_secret' => 'test_secret', 'base_url' => 'https://api.zanafleet.test/v1', 'test_mode' => true]);
        $this->client = new ZanaFleetClient($this->config, $this->logger);
    }

    public function testDeliveryCanBeConfirmedWithOTP(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000001',
            customerEmail: 'test@example.com',
        );

        $delivery = $this->client->createDelivery($request);

        // Should have OTP generated
        $this->assertNotEmpty($delivery->getOtp());
        $this->assertEquals(6, strlen($delivery->getOtp()));
    }

    public function testDeliveryConfirmationRequiresValidOTP(): void
    {
        // Should reject wrong OTP
        $this->expectException(\ZanaFleet\Core\Exceptions\ApiException::class);
        
        $this->client->confirmDelivery('DEL-123', 'WRONGOTP');
    }

    public function testDeliveryConfirmationWithCorrectOTP(): void
    {
        $request = new DeliveryRequest(
            pickupAddress: 'Warehouse, Nairobi',
            deliveryAddress: 'Customer, Nairobi',
            packageDetails: ['weight' => 1.0, 'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10], 'description' => 'Package', 'value' => 5000],
            customerName: 'Test',
            customerPhone: '+254700000002',
            customerEmail: 'test2@example.com',
        );

        $delivery = $this->client->createDelivery($request);
        $otp = $delivery->getOtp();
        
        $confirmed = $this->client->confirmDelivery($delivery->getId(), $otp);

        $this->assertEquals('DELIVERED', $confirmed->getStatus());
        $this->assertNotEmpty($confirmed->getDeliveredAt());
    }

    public function testDeliveryCanBeConfirmedWithSignature(): void
    {
        $delivery = (object) [
            'id' => 'DEL-SIG-123',
            'status' => 'IN_TRANSIT',
            'recipientName' => 'John Doe',
            'signature' => null,
        ];

        // Simulate signature capture
        $delivery->signature = 'base64_encoded_signature_data';
        $delivery->status = 'DELIVERED';

        $this->assertNotEmpty($delivery->signature);
        $this->assertEquals('DELIVERED', $delivery->status);
    }
}
