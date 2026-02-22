<?php
/**
 * DeliveryQuote Model Unit Tests
 * 
 * Tests for the ZanaFleet DeliveryQuote model
 * 
 * @package ZanaFleet\Tests\Unit\Models
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Models;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\Core\Models\DeliveryQuote;

/**
 * Test suite for DeliveryQuote model
 */
class DeliveryQuoteTest extends TestCase
{
    /**
     * Test basic quote creation
     */
    public function testCanCreateQuoteWithMinimalData(): void
    {
        $data = [
            'quoteId' => 'quote_123',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
        ];

        $quote = DeliveryQuote::fromArray($data);

        $this->assertEquals('quote_123', $quote->getQuoteId());
        $this->assertEquals(500.0, $quote->getBasePrice());
        $this->assertEquals(100.0, $quote->getDistancePrice());
        $this->assertEquals(600.0, $quote->getTotalPrice());
        $this->assertEquals('KES', $quote->getCurrency());
    }

    /**
     * Test quote creation with all fields
     */
    public function testCanCreateQuoteWithAllFields(): void
    {
        $data = [
            'quoteId' => 'quote_full_123',
            'basePrice' => 500,
            'distancePrice' => 300,
            'totalPrice' => 800,
            'currency' => 'USD',
            'distanceKm' => 15.5,
            'estimatedPickupMinutes' => 30,
            'estimatedDeliveryMinutes' => 45,
            'vehicleType' => 'motorcycle',
            'expiresAt' => '2024-01-15T12:00:00Z',
            'meta' => ['source' => 'woocommerce'],
        ];

        $quote = DeliveryQuote::fromArray($data);

        $this->assertEquals('quote_full_123', $quote->getQuoteId());
        $this->assertEquals(500.0, $quote->getBasePrice());
        $this->assertEquals(300.0, $quote->getDistancePrice());
        $this->assertEquals(800.0, $quote->getTotalPrice());
        $this->assertEquals('USD', $quote->getCurrency());
        $this->assertEquals(15.5, $quote->getDistanceKm());
        $this->assertEquals(30, $quote->getEstimatedPickupMinutes());
        $this->assertEquals(45, $quote->getEstimatedDeliveryMinutes());
        $this->assertEquals('motorcycle', $quote->getVehicleType());
        $this->assertInstanceOf(\DateTime::class, $quote->getExpiresAt());
        $this->assertEquals(['source' => 'woocommerce'], $quote->getMeta());
    }

    /**
     * Test snake_case field mapping
     */
    public function testFromArraySupportsSnakeCase(): void
    {
        $data = [
            'quote_id' => 'quote_snake_123',
            'base_price' => 400,
            'distance_price' => 200,
            'total_price' => 600,
            'currency' => 'KES',
            'distance_km' => 10.0,
            'estimated_pickup_minutes' => 20,
            'estimated_delivery_minutes' => 30,
            'vehicle_type' => 'car',
            'expires_at' => '2024-01-15T15:00:00Z',
        ];

        $quote = DeliveryQuote::fromArray($data);

        $this->assertEquals('quote_snake_123', $quote->getQuoteId());
        $this->assertEquals(400.0, $quote->getBasePrice());
        $this->assertEquals(200.0, $quote->getDistancePrice());
        $this->assertEquals(600.0, $quote->getTotalPrice());
        $this->assertEquals(10.0, $quote->getDistanceKm());
        $this->assertEquals(20, $quote->getEstimatedPickupMinutes());
        $this->assertEquals(30, $quote->getEstimatedDeliveryMinutes());
        $this->assertEquals('car', $quote->getVehicleType());
    }

    /**
     * Test default currency is KES
     */
    public function testDefaultCurrencyIsKES(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_123',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
        ]);

        $this->assertEquals('KES', $quote->getCurrency());
    }

    /**
     * Test null values for optional fields
     */
    public function testOptionalFieldsCanBeNull(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_null_123',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
        ]);

        $this->assertNull($quote->getDistanceKm());
        $this->assertNull($quote->getEstimatedPickupMinutes());
        $this->assertNull($quote->getEstimatedDeliveryMinutes());
        $this->assertNull($quote->getVehicleType());
        $this->assertNull($quote->getExpiresAt());
        $this->assertEquals([], $quote->getMeta());
    }

    /**
     * Test isExpired with future expiry
     */
    public function testIsExpiredWithFutureExpiry(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_future',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
            'expiresAt' => '2099-12-31T23:59:59Z',
        ]);

        $this->assertFalse($quote->isExpired());
    }

    /**
     * Test isExpired with past expiry
     */
    public function testIsExpiredWithPastExpiry(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_past',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
            'expiresAt' => '2020-01-01T00:00:00Z',
        ]);

        $this->assertTrue($quote->isExpired());
    }

    /**
     * Test isExpired without expiry date
     */
    public function testIsExpiredWithoutExpiryDate(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_no_expiry',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
        ]);

        $this->assertFalse($quote->isExpired());
    }

    /**
     * Test getFormattedPrice with KES
     */
    public function testGetFormattedPriceWithKES(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_format',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600.50,
            'currency' => 'KES',
        ]);

        $this->assertEquals('600.50 KES', $quote->getFormattedPrice());
    }

    /**
     * Test getFormattedPrice with USD
     */
    public function testGetFormattedPriceWithUSD(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_usd',
            'basePrice' => 10,
            'distancePrice' => 5,
            'totalPrice' => 15.99,
            'currency' => 'USD',
        ]);

        $this->assertEquals('15.99 USD', $quote->getFormattedPrice());
    }

    /**
     * Test getFormattedPrice with integer price
     */
    public function testGetFormattedPriceWithInteger(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_int',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
            'currency' => 'KES',
        ]);

        $this->assertEquals('600.00 KES', $quote->getFormattedPrice());
    }

    /**
     * Test numeric casting from strings
     */
    public function testNumericFieldsCastFromStrings(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_string_num',
            'basePrice' => '500.00',
            'distancePrice' => '100.50',
            'totalPrice' => '600.50',
        ]);

        $this->assertIsFloat($quote->getBasePrice());
        $this->assertIsFloat($quote->getDistancePrice());
        $this->assertIsFloat($quote->getTotalPrice());
        $this->assertEquals(500.0, $quote->getBasePrice());
        $this->assertEquals(100.5, $quote->getDistancePrice());
        $this->assertEquals(600.5, $quote->getTotalPrice());
    }

    /**
     * Test vehicle types
     */
    public function testVehicleTypes(): void
    {
        $vehicleTypes = ['motorcycle', 'car', 'van', 'truck', 'bicycle'];

        foreach ($vehicleTypes as $type) {
            $quote = DeliveryQuote::fromArray([
                'quoteId' => 'quote_vehicle',
                'basePrice' => 500,
                'distancePrice' => 100,
                'totalPrice' => 600,
                'vehicleType' => $type,
            ]);

            $this->assertEquals($type, $quote->getVehicleType());
        }
    }

    /**
     * Test meta data handling
     */
    public function testMetaDataHandling(): void
    {
        // Empty meta
        $quote1 = DeliveryQuote::fromArray([
            'quoteId' => 'quote_empty_meta',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
        ]);
        $this->assertEquals([], $quote1->getMeta());

        // With meta
        $quote2 = DeliveryQuote::fromArray([
            'quoteId' => 'quote_with_meta',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
            'meta' => ['key1' => 'value1', 'key2' => 123],
        ]);
        $this->assertEquals(['key1' => 'value1', 'key2' => 123], $quote2->getMeta());
    }

    /**
     * Test minutes values are integers
     */
    public function testMinutesValuesAreIntegers(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_minutes',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
            'estimatedPickupMinutes' => '30',
            'estimatedDeliveryMinutes' => '45',
        ]);

        $this->assertIsInt($quote->getEstimatedPickupMinutes());
        $this->assertIsInt($quote->getEstimatedDeliveryMinutes());
        $this->assertEquals(30, $quote->getEstimatedPickupMinutes());
        $this->assertEquals(45, $quote->getEstimatedDeliveryMinutes());
    }

    /**
     * Test expiry DateTime parsing
     */
    public function testExpiryDateTimeParsing(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_expiry',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
            'expiresAt' => '2024-06-15T14:30:00+03:00',
        ]);

        $expiresAt = $quote->getExpiresAt();
        $this->assertInstanceOf(\DateTime::class, $expiresAt);
    }

    /**
     * Test zero values for price
     */
    public function testZeroPriceValues(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_zero',
            'basePrice' => 0,
            'distancePrice' => 0,
            'totalPrice' => 0,
        ]);

        $this->assertEquals(0.0, $quote->getBasePrice());
        $this->assertEquals(0.0, $quote->getDistancePrice());
        $this->assertEquals(0.0, $quote->getTotalPrice());
    }

    /**
     * Test large price values
     */
    public function testLargePriceValues(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_large',
            'basePrice' => 1000000,
            'distancePrice' => 500000,
            'totalPrice' => 1500000,
            'currency' => 'KES',
        ]);

        $this->assertEquals(1000000.0, $quote->getBasePrice());
        $this->assertEquals(500000.0, $quote->getDistancePrice());
        $this->assertEquals(1500000.0, $quote->getTotalPrice());
    }

    /**
     * Test distance precision
     */
    public function testDistancePrecision(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_precision',
            'basePrice' => 500,
            'distancePrice' => 100,
            'totalPrice' => 600,
            'distanceKm' => 123.456789,
        ]);

        $this->assertEquals(123.456789, $quote->getDistanceKm());
    }

    /**
     * Test currency codes
     */
    public function testCurrencyCodes(): void
    {
        $currencies = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];

        foreach ($currencies as $currency) {
            $quote = DeliveryQuote::fromArray([
                'quoteId' => 'quote_currency',
                'basePrice' => 500,
                'distancePrice' => 100,
                'totalPrice' => 600,
                'currency' => $currency,
            ]);

            $this->assertEquals($currency, $quote->getCurrency());
        }
    }

    /**
     * Test price calculation consistency
     */
    public function testPriceCalculationConsistency(): void
    {
        $quote = DeliveryQuote::fromArray([
            'quoteId' => 'quote_calc',
            'basePrice' => 200,
            'distancePrice' => 150,
            'totalPrice' => 350,
        ]);

        // Total should equal base + distance
        $expectedTotal = $quote->getBasePrice() + $quote->getDistancePrice();
        $this->assertEquals($expectedTotal, $quote->getTotalPrice());
    }
}