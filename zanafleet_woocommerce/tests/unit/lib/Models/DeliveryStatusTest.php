<?php
/**
 * DeliveryStatus Unit Tests
 * 
 * Tests for the ZanaFleet DeliveryStatus enum class
 * 
 * @package ZanaFleet\Tests\Unit\Models
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Models;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\Core\Models\DeliveryStatus;

/**
 * Test suite for DeliveryStatus model
 */
class DeliveryStatusTest extends TestCase
{
    /**
     * Test all status constants are defined
     */
    public function testAllStatusConstantsAreDefined(): void
    {
        $this->assertEquals('Requested', DeliveryStatus::REQUESTED);
        $this->assertEquals('Assigned', DeliveryStatus::ASSIGNED);
        $this->assertEquals('PickedUp', DeliveryStatus::PICKED_UP);
        $this->assertEquals('InTransit', DeliveryStatus::IN_TRANSIT);
        $this->assertEquals('Delivered', DeliveryStatus::DELIVERED);
        $this->assertEquals('Failed', DeliveryStatus::FAILED);
        $this->assertEquals('Cancelled', DeliveryStatus::CANCELLED);
        $this->assertEquals('Scheduled', DeliveryStatus::SCHEDULED);
    }

    /**
     * Test ALL_STATUSES contains all statuses
     */
    public function testAllStatusesContainsAllStatuses(): void
    {
        $expectedStatuses = [
            'Requested',
            'Assigned',
            'PickedUp',
            'InTransit',
            'Delivered',
            'Failed',
            'Cancelled',
            'Scheduled',
        ];

        $this->assertCount(8, DeliveryStatus::ALL_STATUSES);
        $this->assertEquals($expectedStatuses, DeliveryStatus::ALL_STATUSES);
    }

    /**
     * Test isValid with valid statuses
     */
    public function testIsValidWithValidStatuses(): void
    {
        $this->assertTrue(DeliveryStatus::isValid('Requested'));
        $this->assertTrue(DeliveryStatus::isValid('Assigned'));
        $this->assertTrue(DeliveryStatus::isValid('PickedUp'));
        $this->assertTrue(DeliveryStatus::isValid('InTransit'));
        $this->assertTrue(DeliveryStatus::isValid('Delivered'));
        $this->assertTrue(DeliveryStatus::isValid('Failed'));
        $this->assertTrue(DeliveryStatus::isValid('Cancelled'));
        $this->assertTrue(DeliveryStatus::isValid('Scheduled'));
    }

    /**
     * Test isValid with invalid statuses
     */
    public function testIsValidWithInvalidStatuses(): void
    {
        $this->assertFalse(DeliveryStatus::isValid('invalid'));
        $this->assertFalse(DeliveryStatus::isValid(''));
        $this->assertFalse(DeliveryStatus::isValid('pending'));
        $this->assertFalse(DeliveryStatus::isValid('completed'));
        $this->assertFalse(DeliveryStatus::isValid('ACTIVE'));
        $this->assertFalse(DeliveryStatus::isValid('delivered')); // lowercase
        $this->assertFalse(DeliveryStatus::isValid(' random '));
    }

    /**
     * Test isTerminal with terminal statuses
     */
    public function testIsTerminalWithTerminalStatuses(): void
    {
        $this->assertTrue(DeliveryStatus::isTerminal('Delivered'));
        $this->assertTrue(DeliveryStatus::isTerminal('Failed'));
        $this->assertTrue(DeliveryStatus::isTerminal('Cancelled'));
    }

    /**
     * Test isTerminal with non-terminal statuses
     */
    public function testIsTerminalWithNonTerminalStatuses(): void
    {
        $this->assertFalse(DeliveryStatus::isTerminal('Requested'));
        $this->assertFalse(DeliveryStatus::isTerminal('Assigned'));
        $this->assertFalse(DeliveryStatus::isTerminal('PickedUp'));
        $this->assertFalse(DeliveryStatus::isTerminal('InTransit'));
        $this->assertFalse(DeliveryStatus::isTerminal('Scheduled'));
    }

    /**
     * Test isActive with active statuses
     */
    public function testIsActiveWithActiveStatuses(): void
    {
        $this->assertTrue(DeliveryStatus::isActive('Assigned'));
        $this->assertTrue(DeliveryStatus::isActive('PickedUp'));
        $this->assertTrue(DeliveryStatus::isActive('InTransit'));
    }

    /**
     * Test isActive with non-active statuses
     */
    public function testIsActiveWithNonActiveStatuses(): void
    {
        $this->assertFalse(DeliveryStatus::isActive('Requested'));
        $this->assertFalse(DeliveryStatus::isActive('Scheduled'));
        $this->assertFalse(DeliveryStatus::isActive('Delivered'));
        $this->assertFalse(DeliveryStatus::isActive('Failed'));
        $this->assertFalse(DeliveryStatus::isActive('Cancelled'));
    }

    /**
     * Test isValid is case sensitive
     */
    public function testIsValidIsCaseSensitive(): void
    {
        $this->assertTrue(DeliveryStatus::isValid('Requested'));
        $this->assertFalse(DeliveryStatus::isValid('requested'));
        $this->assertFalse(DeliveryStatus::isValid('REQUESTED'));
        
        $this->assertTrue(DeliveryStatus::isValid('Delivered'));
        $this->assertFalse(DeliveryStatus::isValid('delivered'));
        $this->assertFalse(DeliveryStatus::isValid('DELIVERED'));
    }

    /**
     * Test isTerminal with empty string
     */
    public function testIsTerminalWithEmptyString(): void
    {
        $this->assertFalse(DeliveryStatus::isTerminal(''));
    }

    /**
     * Test isActive with empty string
     */
    public function testIsActiveWithEmptyString(): void
    {
        $this->assertFalse(DeliveryStatus::isActive(''));
    }

    /**
     * Test constants using class name
     */
    public function testConstantsViaClassName(): void
    {
        $this->assertEquals(DeliveryStatus::REQUESTED, 'Requested');
        $this->assertEquals(DeliveryStatus::DELIVERED, 'Delivered');
        $this->assertEquals(DeliveryStatus::FAILED, 'Failed');
        $this->assertEquals(DeliveryStatus::CANCELLED, 'Cancelled');
    }

    /**
     * Test status constants can be used in arrays
     */
    public function testStatusConstantsInArrays(): void
    {
        $statuses = [
            DeliveryStatus::REQUESTED,
            DeliveryStatus::ASSIGNED,
            DeliveryStatus::PICKED_UP,
            DeliveryStatus::IN_TRANSIT,
            DeliveryStatus::DELIVERED,
            DeliveryStatus::FAILED,
            DeliveryStatus::CANCELLED,
            DeliveryStatus::SCHEDULED,
        ];

        $this->assertCount(8, $statuses);
        $this->assertContains('Requested', $statuses);
        $this->assertContains('Delivered', $statuses);
    }

    /**
     * Test iteration over ALL_STATUSES
     */
    public function testIterationOverAllStatuses(): void
    {
        $count = 0;
        foreach (DeliveryStatus::ALL_STATUSES as $status) {
            $this->assertIsString($status);
            $this->assertNotEmpty($status);
            $count++;
        }
        $this->assertEquals(8, $count);
    }

    /**
     * Test isValid for each status in ALL_STATUSES
     */
    public function testIsValidForEachAllStatus(): void
    {
        foreach (DeliveryStatus::ALL_STATUSES as $status) {
            $this->assertTrue(DeliveryStatus::isValid($status), "Status '{$status}' should be valid");
        }
    }

    /**
     * Test status comparison with self
     */
    public function testStatusComparisonWithSelf(): void
    {
        $this->assertEquals(DeliveryStatus::REQUESTED, DeliveryStatus::REQUESTED);
        $this->assertEquals(DeliveryStatus::DELIVERED, DeliveryStatus::DELIVERED);
        $this->assertNotEquals(DeliveryStatus::REQUESTED, DeliveryStatus::DELIVERED);
    }

    /**
     * Test status matches expected string values
     */
    public function testStatusMatchesExpectedStringValues(): void
    {
        // These are the actual values from the API
        $this->assertEquals('Requested', DeliveryStatus::REQUESTED);
        $this->assertEquals('Assigned', DeliveryStatus::ASSIGNED);
        $this->assertEquals('PickedUp', DeliveryStatus::PICKED_UP);
        $this->assertEquals('InTransit', DeliveryStatus::IN_TRANSIT);
        $this->assertEquals('Delivered', DeliveryStatus::DELIVERED);
        $this->assertEquals('Failed', DeliveryStatus::FAILED);
        $this->assertEquals('Cancelled', DeliveryStatus::CANCELLED);
        $this->assertEquals('Scheduled', DeliveryStatus::SCHEDULED);
    }
}