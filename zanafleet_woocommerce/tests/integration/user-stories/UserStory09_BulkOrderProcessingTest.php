<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Bulk\OrderProcessor;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 9: Bulk Order Processing
 * 
 * As a store owner with many orders,
 * I want to process multiple orders at once,
 * So that I can efficiently create deliveries in bulk.
 */
class UserStory09_BulkOrderProcessingTest extends TestCase
{
    private OrderProcessor $processor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = new OrderProcessor();
    }

    public function testCanProcessSingleOrder(): void
    {
        $order = $this->createWooOrder(123, ['product_id' => 1, 'qty' => 2], 5000);

        $result = $this->processor->processOrder($order);

        $this->assertTrue($result['success']);
        $this->assertNotEmpty($result['delivery_id']);
    }

    public function testCanProcessMultipleOrders(): void
    {
        $orders = [
            $this->createWooOrder(100, ['product_id' => 1, 'qty' => 1], 3000),
            $this->createWooOrder(101, ['product_id' => 2, 'qty' => 2], 6000),
            $this->createWooOrder(102, ['product_id' => 3, 'qty' => 1], 4000),
        ];

        $results = $this->processor->processOrders($orders);

        $this->assertCount(3, $results);
        $this->assertTrue($results[0]['success']);
        $this->assertTrue($results[1]['success']);
        $this->assertTrue($results[2]['success']);
    }

    public function testBulkProcessingRespectsTierLimits(): void
    {
        // Basic tier should limit to 50 orders
        $orders = [];
        for ($i = 200; $i < 260; $i++) {
            $orders[] = $this->createWooOrder($i, ['product_id' => 1, 'qty' => 1], 1000);
        }

        $results = $this->processor->processOrders($orders, ['tier' => 'basic', 'limit' => 50]);

        // Should process only 50
        $this->assertLessThanOrEqual(50, count(array_filter($results, fn($r) => $r['success'])));
    }

    public function testBulkProcessingContinuesOnFailure(): void
    {
        $orders = [
            $this->createWooOrder(300, ['product_id' => 1, 'qty' => 1], 1000),
            $this->createWooOrder(301, [], 0), // Invalid - no items
            $this->createWooOrder(302, ['product_id' => 2, 'qty' => 1], 1500),
        ];

        $results = $this->processor->processOrders($orders);

        // Should process valid orders even if one fails
        $this->assertTrue($results[0]['success']);
        $this->assertFalse($results[1]['success']);
        $this->assertTrue($results[2]['success']);
    }

    private function createWooOrder(int $id, array $items, float $total): object
    {
        return (object) [
            'id' => $id,
            'get_items' => function() use ($items) {
                return $items ? [(object) $items] : [];
            },
            'get_total' => $total,
            'get_billing_address_1' => '123 Test Street',
            'get_billing_city' => 'Nairobi',
            'get_billing_phone' => '+254700000000',
        ];
    }
}
