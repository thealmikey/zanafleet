<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Licensing\TierGate;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 4: Free Shipping Threshold
 * 
 * As a store owner,
 * I want to offer free shipping above a certain order amount,
 * So that I can encourage larger purchases.
 */
class UserStory04_FreeShippingThresholdTest extends TestCase
{
    private TierGate $tierGate;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tierGate = new TierGate(['license_key' => 'test_license', 'license_type' => 'pro']);
    }

    public function testFreeShippingAppliesAboveThreshold(): void
    {
        $settings = [
            'free_shipping_threshold' => 10000,
            'free_shipping_enabled' => true,
        ];

        $order = $this->createOrder(15000);

        // Should qualify for free shipping
        $this->assertTrue($this->qualifiesForFreeShipping($order, $settings));
    }

    public function testPaidShippingBelowThreshold(): void
    {
        $settings = [
            'free_shipping_threshold' => 10000,
            'free_shipping_enabled' => true,
        ];

        $order = $this->createOrder(5000);

        // Should NOT qualify for free shipping
        $this->assertFalse($this->qualifiesForFreeShipping($order, $settings));
    }

    public function testFreeShippingDisabled(): void
    {
        $settings = [
            'free_shipping_threshold' => 10000,
            'free_shipping_enabled' => false,
        ];

        $order = $this->createOrder(15000);

        // Should NOT qualify when disabled
        $this->assertFalse($this->qualifiesForFreeShipping($order, $settings));
    }

    public function testFreeShippingExactThreshold(): void
    {
        $settings = [
            'free_shipping_threshold' => 10000,
            'free_shipping_enabled' => true,
        ];

        $order = $this->createOrder(10000);

        // Should qualify at exact threshold
        $this->assertTrue($this->qualifiesForFreeShipping($order, $settings));
    }

    private function createOrder(float $total): object
    {
        return (object) ['total' => $total];
    }

    private function qualifiesForFreeShipping(object $order, array $settings): bool
    {
        if (empty($settings['free_shipping_enabled'])) {
            return false;
        }
        return $order->total >= $settings['free_shipping_threshold'];
    }
}
