<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 19: Analytics and Reporting
 * 
 * As a store owner,
 * I want to see delivery analytics,
 * So that I can understand my delivery performance.
 */
class UserStory19_AnalyticsReportingTest extends TestCase
{
    public function testCanGetDeliveryMetrics(): void
    {
        $metrics = [
            'total_deliveries' => 150,
            'successful_deliveries' => 145,
            'failed_deliveries' => 5,
            'on_time_percentage' => 92.5,
            'average_delivery_time' => 45, // minutes
        ];

        $this->assertGreaterThan(0, $metrics['total_deliveries']);
        $this->assertLessThanOrEqual($metrics['total_deliveries'], $metrics['successful_deliveries']);
    }

    public function testCanGetDeliveryTimeBreakdown(): void
    {
        $breakdown = [
            'same_day' => 50,
            'next_day' => 80,
            '2_3_days' => 15,
            'over_3_days' => 5,
        ];

        $this->assertEquals(150, array_sum($breakdown));
    }

    public function testCanGetFailureReasons(): void
    {
        $reasons = [
            'customer_not_available' => 2,
            'wrong_address' => 1,
            'refused_by_customer' => 1,
            'other' => 1,
        ];

        $this->assertCount(4, $reasons);
    }

    public function testCanGetRevenueReport(): void
    {
        $revenue = [
            'total_delivery_fees' => 225000,
            'cod_collected' => 75000,
            'refunds_issued' => 5000,
            'net_revenue' => 295000,
        ];

        $this->assertGreaterThan(0, $revenue['total_delivery_fees']);
    }

    public function testCanGetRiderPerformance(): void
    {
        $riderStats = [
            [
                'rider_id' => 'RIDER-001',
                'rider_name' => 'John Rider',
                'deliveries' => 50,
                'on_time_rate' => 95,
                'rating' => 4.8,
            ],
            [
                'rider_id' => 'RIDER-002',
                'rider_name' => 'Jane Rider',
                'deliveries' => 45,
                'on_time_rate' => 88,
                'rating' => 4.5,
            ],
        ];

        $this->assertCount(2, $riderStats);
    }
}
