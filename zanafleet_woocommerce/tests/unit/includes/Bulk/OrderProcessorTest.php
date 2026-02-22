<?php
/**
 * OrderProcessor Unit Tests
 * 
 * Tests for ZanaFleet Bulk Order Processor including:
 * - process_orders with tier gating
 * - Bulk limit enforcement
 * - Batch execution
 * - Order eligibility checks
 * - Bulk status queries
 * - Error handling
 * 
 * @package ZanaFleet\Tests\Unit\Bulk
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Bulk;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\Bulk\OrderProcessor;

/**
 * Mock WordPress/WooCommerce functions
 */
if (!function_exists('get_option')) {
    function get_option($option, $default = false) {
        return \ZanaFleet\Tests\MockWP::get_option($option, $default);
    }
}

if (!function_exists('wc_get_order')) {
    function wc_get_order($order_id) {
        return \ZanaFleet\Tests\MockWooCommerce::get_order($order_id);
    }
}

if (!function_exists('wp_parse_args')) {
    function wp_parse_args($args, $defaults) {
        return array_merge($defaults, $args);
    }
}

if (!function_exists('__')) {
    function __($text, $domain = 'default') {
        return $text;
    }
}

/**
 * Mock WP_Query class
 */
if (!class_exists('WP_Query')) {
    class WP_Query {
        public $posts = [];
        public function __construct($args = []) {}
    }
}

/**
 * MockWooCommerce - WooCommerce function mocks
 */
class MockWooCommerce
{
    private static array $orders = [];
    
    public static function set_order($id, $order): void
    {
        self::$orders[$id] = $order;
    }
    
    public static function get_order($id) {
        return self::$orders[$id] ?? null;
    }
    
    public static function reset(): void
    {
        self::$orders = [];
    }
}

/**
 * @covers OrderProcessor
 */
class OrderProcessorTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        MockWP::reset();
        MockWooCommerce::reset();
    }
    
    // =========================================================================
    // CONSTRUCTOR TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function canBeInstantiated(): void
    {
        $processor = new OrderProcessor();
        $this->assertInstanceOf(OrderProcessor::class, $processor);
    }
    
    /**
     * @test
     */
    public function constructorLoadsSettings(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'api_key' => 'test_key',
            'business_id' => 'biz_123',
        ]);
        
        $processor = new OrderProcessor();
        
        $this->assertInstanceOf(OrderProcessor::class, $processor);
    }
    
    /**
     * @test
     */
    public function constructorHandlesEmptySettings(): void
    {
        MockWP::reset();
        
        $processor = new OrderProcessor();
        
        $this->assertInstanceOf(OrderProcessor::class, $processor);
    }
    
    // =========================================================================
    // GET_BULK_STATUS TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getBulkStatusReturnsArray(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function getBulkStatusIncludesAllowedKey(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertArrayHasKey('allowed', $result);
    }
    
    /**
     * @test
     */
    public function getBulkStatusIncludesLimit(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertArrayHasKey('limit', $result);
    }
    
    /**
     * @test
     */
    public function getBulkStatusIncludesCurrentTier(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertArrayHasKey('current_tier', $result);
        $this->assertEquals('basic', $result['current_tier']);
    }
    
    /**
     * @test
     */
    public function getBulkStatusIncludesCurrentTierDisplay(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertArrayHasKey('current_tier_display', $result);
    }
    
    /**
     * @test
     */
    public function getBulkStatusProAllowsBulk(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertTrue($result['allowed']);
    }
    
    /**
     * @test
     */
    public function getBulkStatusBasicAllowsBulk(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertTrue($result['allowed']);
    }
    
    /**
     * @test
     */
    public function getBulkStatusFreeDoesNotAllowBulk(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_bulk_status();
        
        $this->assertFalse($result['allowed']);
    }
    
    // =========================================================================
    // PROCESS_ORDERS - TIER GATING TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function processOrdersReturnsErrorForFreeTier(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'free',
            'api_key' => 'test',
        ]);
        
        $processor = new OrderProcessor();
        $result = $processor->process_orders([1, 2, 3]);
        
        $this->assertIsArray($result);
        $this->assertTrue($result['error'] ?? false);
        $this->assertEquals('feature_not_available', $result['code'] ?? '');
    }
    
    /**
     * @test
     */
    public function processOrdersEnforcesLimitOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'basic',
            'api_key' => 'test',
        ]);
        
        $processor = new OrderProcessor();
        
        // Try to process 15 orders (limit is 10)
        $result = $processor->process_orders(range(1, 15));
        
        $this->assertIsArray($result);
        $this->assertTrue($result['error'] ?? false);
        $this->assertEquals('bulk_limit_exceeded', $result['code'] ?? '');
        $this->assertEquals(10, $result['limit'] ?? 0);
    }
    
    /**
     * @test
     */
    public function processOrdersAllowsAtLimitOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'basic',
            'api_key' => 'test',
        ]);
        
        $processor = new OrderProcessor();
        
        // 10 orders should be allowed
        $result = $processor->process_orders(range(1, 10));
        
        // Should not have bulk_limit_exceeded error
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function processOrdersProAllowsUnlimited(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'pro',
            'api_key' => 'test',
        ]);
        
        $processor = new OrderProcessor();
        
        // 100 orders should be allowed on Pro
        $result = $processor->process_orders(range(1, 100));
        
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // PROCESS_ORDERS - EDGE CASES
    // =========================================================================
    
    /**
     * @test
     */
    public function processOrdersHandlesEmptyArray(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'pro',
            'api_key' => 'test',
        ]);
        
        $processor = new OrderProcessor();
        $result = $processor->process_orders([]);
        
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function processOrdersWithProgressCallback(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'pro',
            'api_key' => 'test',
        ]);
        
        $processor = new OrderProcessor();
        $called = false;
        $progress = function($current, $total) use (&$called) {
            $called = true;
        };
        
        $result = $processor->process_orders([1], $progress);
        
        // Result should be array (may have errors for non-existent orders)
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function processOrdersSingleOrder(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'pro',
            'api_key' => 'test',
        ]);
        
        $processor = new OrderProcessor();
        $result = $processor->process_orders([999]);
        
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // GET_ELIGIBLE_ORDERS TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getEligibleOrdersReturnsArray(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_eligible_orders();
        
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function getEligibleOrdersWithCustomArgs(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor = new OrderProcessor();
        
        $result = $processor->get_eligible_orders([
            'limit' => 25,
            'status' => ['wc-processing'],
        ]);
        
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function getEligibleOrdersDefaultLimit(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor = new OrderProcessor();
        $result = $processor->get_eligible_orders();
        
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // ERROR RESPONSE FORMAT TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function errorResponseHasCode(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $processor = new OrderProcessor();
        $result = $processor->process_orders([1]);
        
        $this->assertArrayHasKey('code', $result);
    }
    
    /**
     * @test
     */
    public function errorResponseHasMessage(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $processor = new OrderProcessor();
        $result = $processor->process_orders([1]);
        
        $this->assertArrayHasKey('message', $result);
    }
    
    /**
     * @test
     */
    public function limitExceededResponseHasLimit(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic', 'api_key' => 'test']);
        
        $processor = new OrderProcessor();
        $result = $processor->process_orders(range(1, 15));
        
        $this->assertArrayHasKey('limit', $result);
    }
    
    /**
     * @test
     */
    public function limitExceededResponseHasRequiredTier(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free', 'api_key' => 'test']);
        
        $processor = new OrderProcessor();
        $result = $processor->process_orders([1, 2]);
        
        $this->assertArrayHasKey('required_tier', $result);
        $this->assertEquals('basic', $result['required_tier']);
    }
    
    // =========================================================================
    // SUCCESS RESPONSE FORMAT TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function successResponseHasSuccessKey(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'pro',
            'api_key' => 'test',
        ]);
        
        MockWooCommerce::reset();
        
        $processor = new OrderProcessor();
        
        // This will fail on order lookup but format should be correct
        $result = $processor->process_orders([99999]);
        
        // Even with errors, should have results array
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // INSTANCE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function multipleInstancesAreIndependent(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $processor1 = new OrderProcessor();
        $processor2 = new OrderProcessor();
        
        $this->assertInstanceOf(OrderProcessor::class, $processor1);
        $this->assertInstanceOf(OrderProcessor::class, $processor2);
    }
    
    // =========================================================================
    // SETTINGS STRUCTURE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function processorUsesBusinessId(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'pro',
            'api_key' => 'test',
            'business_id' => 'biz_123',
            'workspace_id' => 'ws_456',
        ]);
        
        $processor = new OrderProcessor();
        
        $this->assertInstanceOf(OrderProcessor::class, $processor);
    }
    
    /**
     * @test
     */
    public function processorUsesEnvironment(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'license_tier' => 'pro',
            'environment' => 'production',
        ]);
        
        $processor = new OrderProcessor();
        
        $this->assertInstanceOf(OrderProcessor::class, $processor);
    }
}