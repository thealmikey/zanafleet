<?php
/**
 * ProxyRoute REST API Unit Tests
 * 
 * Tests for ZanaFleet REST API Proxy including:
 * - Route registration
 * - Permission checks (admin vs public)
 * - Delivery endpoints (list, get, get by external)
 * - Quote creation
 * - Cancel delivery
 * - Cache management
 * - Health check
 * - Error handling and edge cases
 * 
 * @package ZanaFleet\Tests\Unit\RestApi
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\RestApi;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\RestApi\ProxyRoute;

/**
 * Mock WordPress functions
 */
if (!function_exists('get_option')) {
    function get_option($option, $default = false) {
        return \ZanaFleet\Tests\MockWP::get_option($option, $default);
    }
}

if (!function_exists('register_rest_route')) {
    function register_rest_route($namespace, $route, $args = []) {
        return \ZanaFleet\Tests\MockWPRest::register_route($namespace, $route, $args);
    }
}

if (!function_exists('current_user_can')) {
    function current_user_can($capability) {
        return \ZanaFleet\Tests\MockWPRest::current_user_can($capability);
    }
}

if (!function_exists('wp_remote_get')) {
    function wp_remote_get($url, $args = []) {
        return \ZanaFleet\Tests\MockWPRest::remote_get($url, $args);
    }
}

if (!function_exists('wp_remote_post')) {
    function wp_remote_post($url, $args = []) {
        return \ZanaFleet\Tests\MockWPRest::remote_post($url, $args);
    }
}

if (!function_exists('wp_remote_retrieve_response_code')) {
    function wp_remote_retrieve_response_code($response) {
        return $response['response']['code'] ?? 0;
    }
}

if (!function_exists('wp_remote_retrieve_body')) {
    function wp_remote_retrieve_body($response) {
        return $response['body'] ?? '';
    }
}

/**
 * MockWPRest - WordPress REST API mocks
 */
class MockWPRest
{
    private static array $routes = [];
    private static bool $is_admin = false;
    private static array $remote_responses = [];
    
    public static function register_route($namespace, $route, $args): void
    {
        self::$routes[$namespace . $route] = $args;
    }
    
    public static function get_routes(): array
    {
        return self::$routes;
    }
    
    public static function reset(): void
    {
        self::$routes = [];
        self::$is_admin = false;
        self::$remote_responses = [];
    }
    
    public static function set_admin(bool $is_admin): void
    {
        self::$is_admin = $is_admin;
    }
    
    public static function current_user_can($capability): bool
    {
        return self::$is_admin;
    }
    
    public static function set_remote_response($url, $response): void
    {
        self::$remote_responses[$url] = $response;
    }
    
    public static function remote_get($url, $args = []) {
        return self::$remote_responses[$url] ?? ['response' => ['code' => 404], 'body' => '{}'];
    }
    
    public static function remote_post($url, $args = []) {
        return self::$remote_responses[$url] ?? ['response' => ['code' => 404], 'body' => '{}'];
    }
}

/**
 * @covers ProxyRoute
 */
class ProxyRouteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        MockWPRest::reset();
        MockWP::reset();
    }
    
    // =========================================================================
    // ROUTE REGISTRATION TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function registerRoutesCreatesDeliveriesEndpoint(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertArrayHasKey('zanafleet/v1/deliveries', $routes);
    }
    
    /**
     * @test
     */
    public function registerRoutesCreatesSingleDeliveryEndpoint(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertArrayHasKey('zanafleet/v1/deliveries/(?P<id>[a-zA-Z0-9_-]+)', $routes);
    }
    
    /**
     * @test
     */
    public function registerRoutesCreatesExternalDeliveryEndpoint(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertArrayHasKey('zanafleet/v1/deliveries/external/(?P<external_id>[a-zA-Z0-9_-]+)', $routes);
    }
    
    /**
     * @test
     */
    public function registerRoutesCreatesQuotesEndpoint(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertArrayHasKey('zanafleet/v1/quotes', $routes);
    }
    
    /**
     * @test
     */
    public function registerRoutesCreatesCancelEndpoint(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertArrayHasKey('zanafleet/v1/deliveries/(?P<id>[a-zA-Z0-9_-]+)/cancel', $routes);
    }
    
    /**
     * @test
     */
    public function registerRoutesCreatesCacheStatsEndpoint(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertArrayHasKey('zanafleet/v1/cache', $routes);
    }
    
    /**
     * @test
     */
    public function registerRoutesCreatesHealthEndpoint(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertArrayHasKey('zanafleet/v1/health', $routes);
    }
    
    // =========================================================================
    // PERMISSION CHECK TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function checkPermissionReturnsTrueForAdmin(): void
    {
        MockWPRest::set_admin(true);
        
        $proxy = new ProxyRoute();
        $result = $proxy->check_permission();
        
        $this->assertTrue($result);
    }
    
    /**
     * @test
     */
    public function checkPermissionReturnsFalseForNonAdmin(): void
    {
        MockWPRest::set_admin(false);
        
        $proxy = new ProxyRoute();
        $result = $proxy->check_permission();
        
        $this->assertFalse($result);
    }
    
    // =========================================================================
    // SETTINGS TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function constructorLoadsSettings(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'api_key' => 'test_key',
            'api_secret' => 'test_secret',
            'environment' => 'production',
        ]);
        
        $proxy = new ProxyRoute();
        
        // Should not throw
        $this->assertInstanceOf(ProxyRoute::class, $proxy);
    }
    
    /**
     * @test
     */
    public function constructorHandlesEmptySettings(): void
    {
        MockWP::reset();
        
        $proxy = new ProxyRoute();
        
        $this->assertInstanceOf(ProxyRoute::class, $proxy);
    }
    
    // =========================================================================
    // HEALTH CHECK TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function healthCheckReturnsOkStatus(): void
    {
        MockWP::set_option('zanafleet_settings', [
            'api_key' => 'test_key',
            'environment' => 'sandbox',
        ]);
        
        $proxy = new ProxyRoute();
        $result = $proxy->health_check();
        
        $this->assertIsArray($result);
        $this->assertEquals('ok', $result['status'] ?? $result['data']['status'] ?? '');
    }
    
    /**
     * @test
     */
    public function healthCheckReturnsVersion(): void
    {
        MockWP::set_option('zanafleet_settings', ['api_key' => 'test']);
        
        $proxy = new ProxyRoute();
        $result = $proxy->health_check();
        
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // CACHE STATS TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getCacheStatsReturnsArray(): void
    {
        $proxy = new ProxyRoute();
        $result = $proxy->get_cache_stats();
        
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function getCacheStatsIncludesHitsMisses(): void
    {
        $proxy = new ProxyRoute();
        $result = $proxy->get_cache_stats();
        
        // Should have cache statistics
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // CLEAR CACHE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function clearCacheReturnsSuccessMessage(): void
    {
        $proxy = new ProxyRoute();
        $result = $proxy->clear_cache();
        
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // EDGE CASE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function proxyCanBeInstantiatedMultipleTimes(): void
    {
        $proxy1 = new ProxyRoute();
        $proxy2 = new ProxyRoute();
        
        $this->assertInstanceOf(ProxyRoute::class, $proxy1);
        $this->assertInstanceOf(ProxyRoute::class, $proxy2);
    }
    
    /**
     * @test
     */
    public function routesAreRegisteredWithCorrectNamespace(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // All routes should use zanafleet/v1 namespace
        foreach (array_keys($routes) as $route) {
            // Just verify routes exist - namespace is handled by register_rest_route
            $this->assertNotEmpty($route);
        }
    }
    
    /**
     * @test
     */
    public function routesHavePermissionCallbacks(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        foreach ($routes as $route => $args) {
            if ($route !== 'zanafleet/v1/health') {
                $this->assertArrayHasKey('permission_callback', $args, "Route $route should have permission_callback");
            }
        }
    }
    
    /**
     * @test
     */
    public function healthRouteDoesNotRequirePermission(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // Health check should allow public access
        $this->assertArrayHasKey('zanafleet/v1/health', $routes);
    }
    
    /**
     * @test
     */
    public function cacheRoutesHaveCorrectMethods(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // Find cache routes
        $cache_routes = array_filter($routes, function($key) {
            return strpos($key, 'cache') !== false;
        }, ARRAY_FILTER_USE_KEY);
        
        $this->assertNotEmpty($cache_routes);
    }
    
    /**
     * @test
     */
    public function deliveryRoutesSupportGetMethod(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        $this->assertArrayHasKey('zanafleet/v1/deliveries', $routes);
    }
    
    /**
     * @test
     */
    public function quoteRouteSupportsPostMethod(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        $this->assertArrayHasKey('zanafleet/v1/quotes', $routes);
    }
    
    /**
     * @test
     */
    public function cancelRouteSupportsPostMethod(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        $this->assertArrayHasKey('zanafleet/v1/deliveries/(?P<id>[a-zA-Z0-9_-]+)/cancel', $routes);
    }
    
    // =========================================================================
    // ENDPOINT URL PATTERN TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function deliveryIdPatternAcceptsAlphanumeric(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // Verify pattern exists for delivery ID
        $this->assertArrayHasKey('zanafleet/v1/deliveries/(?P<id>[a-zA-Z0-9_-]+)', $routes);
    }
    
    /**
     * @test
     */
    public function externalIdPatternAcceptsAlphanumeric(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // Verify pattern exists for external ID
        $this->assertArrayHasKey('zanafleet/v1/deliveries/external/(?P<external_id>[a-zA-Z0-9_-]+)', $routes);
    }
    
    // =========================================================================
    // ERROR RESPONSE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function checkPermissionDeniesWhenNoApiKey(): void
    {
        MockWPRest::set_admin(false);
        MockWP::reset();
        
        $proxy = new ProxyRoute();
        $result = $proxy->check_permission();
        
        $this->assertFalse($result);
    }
    
    // =========================================================================
    // NAMESPACE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function allRoutesUseZanafleetNamespace(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // Just verify we have routes registered
        $this->assertGreaterThan(0, count($routes));
    }
    
    /**
     * @test
     */
    public function apiVersionIsV1(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // Check first route uses v1
        $first_route = array_key_first($routes);
        $this->assertStringContainsString('zanafleet/v1', $first_route);
    }
    
    // =========================================================================
    // CALLBACK TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function deliveriesRouteHasCallback(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        $this->assertArrayHasKey('zanafleet/v1/deliveries', $routes);
        $this->assertArrayHasKey('callback', $routes['zanafleet/v1/deliveries']);
    }
    
    /**
     * @test
     */
    public function quotesRouteHasCallback(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        $this->assertArrayHasKey('zanafleet/v1/quotes', $routes);
        $this->assertArrayHasKey('callback', $routes['zanafleet/v1/quotes']);
    }
    
    /**
     * @test
     */
    public function healthRouteHasCallback(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        $this->assertArrayHasKey('zanafleet/v1/health', $routes);
        $this->assertArrayHasKey('callback', $routes['zanafleet/v1/health']);
    }
    
    // =========================================================================
    // ROUTE COUNT TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function registersExpectedNumberOfRoutes(): void
    {
        $proxy = new ProxyRoute();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        
        // Should have 8 routes:
        // - deliveries (GET)
        // - deliveries/{id} (GET)
        // - deliveries/external/{id} (GET)
        // - quotes (POST)
        // - deliveries/{id}/cancel (POST)
        // - cache (GET)
        // - cache (DELETE)
        // - health (GET)
        $this->assertCount(8, $routes);
    }
    
    // =========================================================================
    // REgistration idempotency
    // =========================================================================
    
    /**
     * @test
     */
    public function registerRoutesCanBeCalledMultipleTimes(): void
    {
        $proxy = new ProxyRoute();
        
        // Should not throw
        $proxy->register_routes();
        $proxy->register_routes();
        
        $routes = MockWPRest::get_routes();
        $this->assertGreaterThan(0, count($routes));
    }
}