<?php
/**
 * Delivery Model Unit Tests
 * 
 * Tests for the ZanaFleet Delivery model including:
 * - Object creation and initialization
 * - fromArray factory method
 * - Status checks (isTerminal, isActive)
 * - Edge cases for all fields
 * - Invalid data handling
 * 
 * @package ZanaFleet\Tests\Unit\Models
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Models;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\Core\Models\Delivery;
use ZanaFleet\Core\Models\DeliveryStatus;

/**
 * Test suite for Delivery model
 */
class DeliveryTest extends TestCase
{
    /**
     * Test basic delivery creation
     */
    public function testCanCreateDeliveryWithMinimalData(): void
    {
        $data = [
            'id' => 'del_123',
            'business_id' => 'biz_456',
        ];

        $delivery = Delivery::fromArray($data);

        $this->assertEquals('del_123', $delivery->getId());
        $this->assertEquals('biz_456', $delivery->getBusinessId());
        $this->assertNull($delivery->getWorkspaceId());
        $this->assertEquals(DeliveryStatus::REQUESTED, $delivery->getStatus());
    }

    /**
     * Test delivery creation with all fields
     */
    public function testCanCreateDeliveryWithAllFields(): void
    {
        $data = [
            'id' => 'del_full_123',
            'business_id' => 'biz_456',
            'workspace_id' => 'ws_789',
            'external_order_id' => 'woo_order_1001',
            'pickup_location_id' => 'loc_pickup',
            'dropoff_location_id' => 'loc_dropoff',
            'assigned_rider_id' => 'rider_001',
            'status' => DeliveryStatus::ASSIGNED,
            'scheduled_pickup_time' => '2024-01-15T10:00:00Z',
            'scheduled_dropoff_time' => '2024-01-15T12:00:00Z',
            'recipient_name' => 'John Doe',
            'recipient_phone' => '+254712345678',
            'is_scheduled' => true,
            'assigned_at' => '2024-01-15T10:30:00Z',
            'picked_up_at' => null,
            'delivered_at' => null,
            'cancelled_at' => null,
            'created_at' => '2024-01-15T09:00:00Z',
            'updated_at' => '2024-01-15T09:00:00Z',
            'distance_km' => 15.5,
            'price' => 1500.00,
            'tracking_url' => 'https://track.zanafleet.com/del_full_123',
        ];

        $delivery = Delivery::fromArray($data);

        $this->assertEquals('del_full_123', $delivery->getId());
        $this->assertEquals('biz_456', $delivery->getBusinessId());
        $this->assertEquals('ws_789', $delivery->getWorkspaceId());
        $this->assertEquals('woo_order_1001', $delivery->getExternalOrderId());
        $this->assertEquals('loc_pickup', $delivery->getPickupLocationId());
        $this->assertEquals('loc_dropoff', $delivery->getDropoffLocationId());
        $this->assertEquals('rider_001', $delivery->getAssignedRiderId());
        $this->assertEquals(DeliveryStatus::ASSIGNED, $delivery->getStatus());
        $this->assertInstanceOf(\DateTime::class, $delivery->getScheduledPickupTime());
        $this->assertInstanceOf(\DateTime::class, $delivery->getScheduledDropoffTime());
        $this->assertEquals('John Doe', $delivery->getRecipientName());
        $this->assertEquals('+254712345678', $delivery->getRecipientPhone());
        $this->assertTrue($delivery->isScheduled());
        $this->assertInstanceOf(\DateTime::class, $delivery->getAssignedAt());
        $this->assertNull($delivery->getPickedUpAt());
        $this->assertNull($delivery->getDeliveredAt());
        $this->assertNull($delivery->getCancelledAt());
        $this->assertInstanceOf(\DateTime::class, $delivery->getCreatedAt());
        $this->assertInstanceOf(\DateTime::class, $delivery->getUpdatedAt());
        $this->assertEquals(15.5, $delivery->getDistanceKm());
        $this->assertEquals(1500.00, $delivery->getPrice());
        $this->assertEquals('https://track.zanafleet.com/del_full_123', $delivery->getTrackingUrl());
    }

    /**
     * Test camelCase field name mapping
     */
    public function testFromArraySupportsCamelCase(): void
    {
        $data = [
            'id' => 'del_camel_123',
            'businessId' => 'biz_camel',
            'workspaceId' => 'ws_camel',
            'externalOrderId' => 'order_camel',
            'pickupLocationId' => 'pickup_camel',
            'dropoffLocationId' => 'dropoff_camel',
            'assignedRiderId' => 'rider_camel',
            'status' => DeliveryStatus::IN_PROGRESS,
            'scheduledPickupTime' => '2024-01-15T10:00:00Z',
            'scheduledDropoffTime' => '2024-01-15T12:00:00Z',
            'recipientName' => 'Jane Doe',
            'recipientPhone' => '+254798765432',
            'isScheduled' => true,
            'assignedAt' => '2024-01-15T10:30:00Z',
            'createdAt' => '2024-01-15T09:00:00Z',
            'updatedAt' => '2024-01-15T09:00:00Z',
            'distanceKm' => 20.0,
            'price' => 2000.00,
            'trackingUrl' => 'https://track.zanafleet.com/del_camel_123',
        ];

        $delivery = Delivery::fromArray($data);

        $this->assertEquals('del_camel_123', $delivery->getId());
        $this->assertEquals('biz_camel', $delivery->getBusinessId());
        $this->assertEquals('ws_camel', $delivery->getWorkspaceId());
        $this->assertEquals('order_camel', $delivery->getExternalOrderId());
        $this->assertEquals('pickup_camel', $delivery->getPickupLocationId());
        $this->assertEquals('dropoff_camel', $delivery->getDropoffLocationId());
        $this->assertEquals('rider_camel', $delivery->getAssignedRiderId());
        $this->assertEquals(DeliveryStatus::IN_PROGRESS, $delivery->getStatus());
        $this->assertEquals('Jane Doe', $delivery->getRecipientName());
        $this->assertEquals('+254798765432', $delivery->getRecipientPhone());
        $this->assertTrue($delivery->isScheduled());
        $this->assertEquals(20.0, $delivery->getDistanceKm());
        $this->assertEquals(2000.00, $delivery->getPrice());
    }

    /**
     * Test fromArray with empty array
     */
    public function testFromArrayWithEmptyArray(): void
    {
        $delivery = Delivery::fromArray([]);

        $this->assertEquals('', $delivery->getId());
        $this->assertEquals('', $delivery->getBusinessId());
        $this->assertEquals(DeliveryStatus::REQUESTED, $delivery->getStatus());
    }

    /**
     * Test null values for optional fields
     */
    public function testOptionalFieldsCanBeNull(): void
    {
        $data = [
            'id' => 'del_null_123',
            'business_id' => 'biz_null',
        ];

        $delivery = Delivery::fromArray($data);

        $this->assertNull($delivery->getWorkspaceId());
        $this->assertNull($delivery->getExternalOrderId());
        $this->assertNull($delivery->getPickupLocationId());
        $this->assertNull($delivery->getDropoffLocationId());
        $this->assertNull($delivery->getAssignedRiderId());
        $this->assertNull($delivery->getScheduledPickupTime());
        $this->assertNull($delivery->getScheduledDropoffTime());
        $this->assertNull($delivery->getRecipientName());
        $this->assertNull($delivery->getRecipientPhone());
        $this->assertFalse($delivery->isScheduled());
        $this->assertNull($delivery->getAssignedAt());
        $this->assertNull($delivery->getPickedUpAt());
        $this->assertNull($delivery->getDeliveredAt());
        $this->assertNull($delivery->getCancelledAt());
        $this->assertNull($delivery->getDistanceKm());
        $this->assertNull($delivery->getPrice());
        $this->assertNull($delivery->getTrackingUrl());
    }

    /**
     * Test isScheduled returns correct boolean
     */
    public function testIsScheduledReturnsCorrectBoolean(): void
    {
        // Test with is_scheduled = true
        $deliveryScheduled = Delivery::fromArray([
            'id' => 'del_scheduled',
            'business_id' => 'biz',
            'is_scheduled' => true,
        ]);
        $this->assertTrue($deliveryScheduled->isScheduled());

        // Test with is_scheduled = false
        $deliveryNotScheduled = Delivery::fromArray([
            'id' => 'del_not_scheduled',
            'business_id' => 'biz',
            'is_scheduled' => false,
        ]);
        $this->assertFalse($deliveryNotScheduled->isScheduled());

        // Test with isScheduled (camelCase)
        $deliveryCamel = Delivery::fromArray([
            'id' => 'del_camel',
            'business_id' => 'biz',
            'isScheduled' => true,
        ]);
        $this->assertTrue($deliveryCamel->isScheduled());

        // Test with missing is_scheduled (should default to false)
        $deliveryMissing = Delivery::fromArray([
            'id' => 'del_missing',
            'business_id' => 'biz',
        ]);
        $this->assertFalse($deliveryMissing->isScheduled());
    }

    /**
     * Test isTerminal with terminal statuses
     */
    public function testIsTerminalWithTerminalStatuses(): void
    {
        $terminalStatuses = [
            DeliveryStatus::COMPLETED,
            DeliveryStatus::CANCELLED,
            DeliveryStatus::FAILED,
        ];

        foreach ($terminalStatuses as $status) {
            $delivery = Delivery::fromArray([
                'id' => 'del_terminal_' . $status,
                'business_id' => 'biz',
                'status' => $status,
            ]);
            $this->assertTrue($delivery->isTerminal(), "Status {$status} should be terminal");
        }
    }

    /**
     * Test isTerminal with non-terminal statuses
     */
    public function testIsTerminalWithNonTerminalStatuses(): void
    {
        $nonTerminalStatuses = [
            DeliveryStatus::REQUESTED,
            DeliveryStatus::QUOTED,
            DeliveryStatus::CONFIRMED,
            DeliveryStatus::ASSIGNED,
            DeliveryStatus::PICKED_UP,
            DeliveryStatus::IN_PROGRESS,
        ];

        foreach ($nonTerminalStatuses as $status) {
            $delivery = Delivery::fromArray([
                'id' => 'del_non_terminal_' . $status,
                'business_id' => 'biz',
                'status' => $status,
            ]);
            $this->assertFalse($delivery->isTerminal(), "Status {$status} should not be terminal");
        }
    }

    /**
     * Test isActive with active statuses
     */
    public function testIsActiveWithActiveStatuses(): void
    {
        $activeStatuses = [
            DeliveryStatus::REQUESTED,
            DeliveryStatus::QUOTED,
            DeliveryStatus::CONFIRMED,
            DeliveryStatus::ASSIGNED,
            DeliveryStatus::PICKED_UP,
            DeliveryStatus::IN_PROGRESS,
        ];

        foreach ($activeStatuses as $status) {
            $delivery = Delivery::fromArray([
                'id' => 'del_active_' . $status,
                'business_id' => 'biz',
                'status' => $status,
            ]);
            $this->assertTrue($delivery->isActive(), "Status {$status} should be active");
        }
    }

    /**
     * Test isActive with inactive statuses
     */
    public function testIsActiveWithInactiveStatuses(): void
    {
        $inactiveStatuses = [
            DeliveryStatus::COMPLETED,
            DeliveryStatus::CANCELLED,
            DeliveryStatus::FAILED,
        ];

        foreach ($inactiveStatuses as $status) {
            $delivery = Delivery::fromArray([
                'id' => 'del_inactive_' . $status,
                'business_id' => 'biz',
                'status' => $status,
            ]);
            $this->assertFalse($delivery->isActive(), "Status {$status} should not be active");
        }
    }

    /**
     * Test default status is REQUESTED when not provided
     */
    public function testDefaultStatusIsRequested(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_default_status',
            'business_id' => 'biz',
        ]);

        $this->assertEquals(DeliveryStatus::REQUESTED, $delivery->getStatus());
    }

    /**
     * Test numeric fields are properly cast
     */
    public function testNumericFieldsAreProperlyCast(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_numeric',
            'business_id' => 'biz',
            'distance_km' => '25.5',  // String should be cast to float
            'price' => '1999.99',      // String should be cast to float
        ]);

        $this->assertIsFloat($delivery->getDistanceKm());
        $this->assertIsFloat($delivery->getPrice());
        $this->assertEquals(25.5, $delivery->getDistanceKm());
        $this->assertEquals(1999.99, $delivery->getPrice());
    }

    /**
     * Test DateTime fields are properly parsed
     */
    public function testDateTimeFieldsAreProperlyParsed(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_datetime',
            'business_id' => 'biz',
            'scheduled_pickup_time' => '2024-06-15T14:30:00+03:00',
            'created_at' => '2024-06-15T10:00:00Z',
        ]);

        $this->assertInstanceOf(\DateTime::class, $delivery->getScheduledPickupTime());
        $this->assertInstanceOf(\DateTime::class, $delivery->getCreatedAt());
    }

    /**
     * Test getStatus returns exact status value
     */
    public function testGetStatusReturnsExactValue(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_status',
            'business_id' => 'biz',
            'status' => DeliveryStatus::PICKED_UP,
        ]);

        $this->assertEquals(DeliveryStatus::PICKED_UP, $delivery->getStatus());
    }

    /**
     * Test all nullable getters return null when not set
     */
    public function testAllNullableGettersReturnNull(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_nulls',
            'business_id' => 'biz',
        ]);

        $this->assertNull($delivery->getWorkspaceId());
        $this->assertNull($delivery->getExternalOrderId());
        $this->assertNull($delivery->getPickupLocationId());
        $this->assertNull($delivery->getDropoffLocationId());
        $this->assertNull($delivery->getAssignedRiderId());
        $this->assertNull($delivery->getScheduledPickupTime());
        $this->assertNull($delivery->getScheduledDropoffTime());
        $this->assertNull($delivery->getRecipientName());
        $this->assertNull($delivery->getRecipientPhone());
        $this->assertNull($delivery->getAssignedAt());
        $this->assertNull($delivery->getPickedUpAt());
        $this->assertNull($delivery->getDeliveredAt());
        $this->assertNull($delivery->getCancelledAt());
        $this->assertNull($delivery->getDistanceKm());
        $this->assertNull($delivery->getPrice());
        $this->assertNull($delivery->getTrackingUrl());
    }

    /**
     * Test delivery with various status values
     */
    public function testDeliveryWithVariousStatusValues(): void
    {
        $statuses = [
            'requested',
            'quoted',
            'confirmed',
            'assigned',
            'picked_up',
            'in_progress',
            'completed',
            'cancelled',
            'failed',
        ];

        foreach ($statuses as $status) {
            $delivery = Delivery::fromArray([
                'id' => 'del_status_' . $status,
                'business_id' => 'biz',
                'status' => $status,
            ]);
            $this->assertEquals($status, $delivery->getStatus());
        }
    }

    /**
     * Test getId returns string
     */
    public function testGetIdReturnsString(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_string_id_123',
            'business_id' => 'biz',
        ]);

        $this->assertIsString($delivery->getId());
        $this->assertEquals('del_string_id_123', $delivery->getId());
    }

    /**
     * Test getBusinessId returns string
     */
    public function testGetBusinessIdReturnsString(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del',
            'business_id' => 'biz_string_456',
        ]);

        $this->assertIsString($delivery->getBusinessId());
        $this->assertEquals('biz_string_456', $delivery->getBusinessId());
    }

    /**
     * Test phone number format is preserved
     */
    public function testPhoneNumberFormatIsPreserved(): void
    {
        $phoneNumbers = [
            '+254712345678',
            '254712345678',
            '0712345678',
            '+1-234-567-8900',
        ];

        foreach ($phoneNumbers as $phone) {
            $delivery = Delivery::fromArray([
                'id' => 'del_phone',
                'business_id' => 'biz',
                'recipient_phone' => $phone,
            ]);
            $this->assertEquals($phone, $delivery->getRecipientPhone());
        }
    }

    /**
     * Test float precision for price
     */
    public function testPriceFloatPrecision(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_price',
            'business_id' => 'biz',
            'price' => 1234567.89,
        ]);

        $this->assertEquals(1234567.89, $delivery->getPrice());
    }

    /**
     * Test float precision for distance
     */
    public function testDistanceFloatPrecision(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_distance',
            'business_id' => 'biz',
            'distance_km' => 123.456789,
        ]);

        $this->assertEquals(123.456789, $delivery->getDistanceKm());
    }

    /**
     * Test address fields can contain special characters
     */
    public function testAddressFieldsWithSpecialCharacters(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_special',
            'business_id' => 'biz',
            // Note: These would be in address fields if they existed
            'recipient_name' => "O'Brien-Smith Jr.",
        ]);

        $this->assertEquals("O'Brien-Smith Jr.", $delivery->getRecipientName());
    }

    /**
     * Test zero values for numeric fields
     */
    public function testZeroValuesForNumericFields(): void
    {
        $delivery = Delivery::fromArray([
            'id' => 'del_zero',
            'business_id' => 'biz',
            'distance_km' => 0,
            'price' => 0,
        ]);

        $this->assertEquals(0, $delivery->getDistanceKm());
        $this->assertEquals(0, $delivery->getPrice());
    }

    /**
     * Test isScheduled with various truthy/falsy values
     */
    public function testIsScheduledWithVariousTruthyFalsyValues(): void
    {
        // Truthy values
        $this->assertTrue(Delivery::fromArray(['id' => 'd', 'business_id' => 'b', 'is_scheduled' => 1])->isScheduled());
        $this->assertTrue(Delivery::fromArray(['id' => 'd', 'business_id' => 'b', 'is_scheduled' => 'yes'])->isScheduled());
        $this->assertTrue(Delivery::fromArray(['id' => 'd', 'business_id' => 'b', 'is_scheduled' => 'true'])->isScheduled());

        // Falsy values
        $this->assertFalse(Delivery::fromArray(['id' => 'd', 'business_id' => 'b', 'is_scheduled' => 0])->isScheduled());
        $this->assertFalse(Delivery::fromArray(['id' => 'd', 'business_id' => 'b', 'is_scheduled' => ''])->isScheduled());
        $this->assertFalse(Delivery::fromArray(['id' => 'd', 'business_id' => 'b', 'is_scheduled' => 'false'])->isScheduled());
    }

    /**
     * Test fromArray with partial date fields
     */
    public function testPartialDateFieldsInFromArray(): void
    {
        // Only assigned_at set
        $delivery = Delivery::fromArray([
            'id' => 'del_partial',
            'business_id' => 'biz',
            'assigned_at' => '2024-01-15T10:30:00Z',
        ]);

        $this->assertInstanceOf(\DateTime::class, $delivery->getAssignedAt());
        $this->assertNull($delivery->getPickedUpAt());
        $this->assertNull($delivery->getDeliveredAt());
        $this->assertNull($delivery->getCancelledAt());
    }

    /**
     * Test fromArray with all timestamp fields
     */
    public function testAllTimestampFieldsInFromArray(): void
    {
        $data = [
            'id' => 'del_all_times',
            'business_id' => 'biz',
            'scheduled_pickup_time' => '2024-01-15T10:00:00Z',
            'scheduled_dropoff_time' => '2024-01-15T12:00:00Z',
            'assigned_at' => '2024-01-15T10:15:00Z',
            'picked_up_at' => '2024-01-15T10:30:00Z',
            'delivered_at' => '2024-01-15T12:15:00Z',
            'cancelled_at' => null,
            'created_at' => '2024-01-15T09:00:00Z',
            'updated_at' => '2024-01-15T12:15:00Z',
        ];

        $delivery = Delivery::fromArray($data);

        $this->assertInstanceOf(\DateTime::class, $delivery->getScheduledPickupTime());
        $this->assertInstanceOf(\DateTime::class, $delivery->getScheduledDropoffTime());
        $this->assertInstanceOf(\DateTime::class, $delivery->getAssignedAt());
        $this->assertInstanceOf(\DateTime::class, $delivery->getPickedUpAt());
        $this->assertInstanceOf(\DateTime::class, $delivery->getDeliveredAt());
        $this->assertNull($delivery->getCancelledAt());
        $this->assertInstanceOf(\DateTime::class, $delivery->getCreatedAt());
        $this->assertInstanceOf(\DateTime::class, $delivery->getUpdatedAt());
    }

    /**
     * Test empty string handling
     */
    public function testEmptyStringHandling(): void
    {
        $delivery = Delivery::fromArray([
            'id' => '',
            'business_id' => '',
        ]);

        $this->assertEquals('', $delivery->getId());
        $this->assertEquals('', $delivery->getBusinessId());
    }

    /**
     * Test tracking URL format
     */
    public function testTrackingUrlFormat(): void
    {
        $urls = [
            'https://track.zanafleet.com/del_123',
            'https://sandbox.zanafleet.com/track/del_456',
            'http://localhost:3000/track/del_789',
        ];

        foreach ($urls as $url) {
            $delivery = Delivery::fromArray([
                'id' => 'del_url',
                'business_id' => 'biz',
                'tracking_url' => $url,
            ]);
            $this->assertEquals($url, $delivery->getTrackingUrl());
        }
    }
}