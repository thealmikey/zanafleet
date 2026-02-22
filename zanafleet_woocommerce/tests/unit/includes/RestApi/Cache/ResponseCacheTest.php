<?php
/**
 * ResponseCache Unit Tests
 * 
 * Tests for ZanaFleet Response Cache including:
 * - Get cached responses
 * - Set cached responses with TTL
 * - Delete cached responses
 * - Clear all cache
 * - Get cache statistics
 * - Key sanitization
 * - Edge cases
 * 
 * @package ZanaFleet\Tests\Unit\RestApi\Cache
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\RestApi\Cache;

require_once dirname(__DIR__, 4) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\RestApi\Cache\ResponseCache;

/**
 * Mock WordPress transient functions
 */
if (!function_exists('get_transient')) {
    function get_transient($key) {
        return \ZanaFleet\Tests\MockTransients::get($key);
    }
}

if (!function_exists('set_transient')) {
    function set_transient($key, $value, $ttl = 0) {
        return \ZanaFleet\Tests\MockTransients::set($key, $value, $ttl);
    }
}

if (!function_exists('delete_transient')) {
    function delete_transient($key) {
        return \ZanaFleet\Tests\MockTransients::delete($key);
    }
}

/**
 * Mock transients storage
 */
class MockTransients
{
    private static array $store = [];
    private static array $expiry = [];
    
    public static function get($key) {
        if (isset(self::$expiry[$key]) && self::$expiry[$key] < time()) {
            unset(self::$store[$key], self::$expiry[$key]);
            return false;
        }
        return self::$store[$key] ?? false;
    }
    
    public static function set($key, $value, $ttl = 0): bool {
        self::$store[$key] = $value;
        if ($ttl > 0) {
            self::$expiry[$key] = time() + $ttl;
        }
        return true;
    }
    
    public static function delete($key): bool {
        unset(self::$store[$key], self::$expiry[$key]);
        return true;
    }
    
    public static function reset(): void {
        self::$store = [];
        self::$expiry = [];
    }
}

/**
 * @covers ResponseCache
 */
class ResponseCacheTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        MockTransients::reset();
    }
    
    // =========================================================================
    // CONSTRUCTOR TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function canBeInstantiated(): void
    {
        $cache = new ResponseCache();
        $this->assertInstanceOf(ResponseCache::class, $cache);
    }
    
    // =========================================================================
    // GET TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getReturnsNullWhenNotCached(): void
    {
        $cache = new ResponseCache();
        $result = $cache->get('nonexistent_key');
        
        $this->assertNull($result);
    }
    
    /**
     * @test
     */
    public function getReturnsDataWhenCached(): void
    {
        $cache = new ResponseCache();
        $cache->set('test_key', ['data' => 'value']);
        
        $result = $cache->get('test_key');
        
        $this->assertEquals(['data' => 'value'], $result);
    }
    
    /**
     * @test
     */
    public function getReturnsArrayWhenCached(): void
    {
        $cache = new ResponseCache();
        $cache->set('array_key', ['foo' => 'bar', 'baz' => 123]);
        
        $result = $cache->get('array_key');
        
        $this->assertIsArray($result);
    }
    
    // =========================================================================
    // SET TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function setReturnsTrue(): void
    {
        $cache = new ResponseCache();
        $result = $cache->set('test_key', ['data' => 'value']);
        
        $this->assertTrue($result);
    }
    
    /**
     * @test
     */
    public function setStoresData(): void
    {
        $cache = new ResponseCache();
        $cache->set('my_key', ['my' => 'data']);
        
        $result = $cache->get('my_key');
        
        $this->assertEquals(['my' => 'data'], $result);
    }
    
    /**
     * @test
     */
    public function setWithCustomTTL(): void
    {
        $cache = new ResponseCache();
        $cache->set('ttl_key', ['data' => 'value'], 600);
        
        // Should be cached
        $result = $cache->get('ttl_key');
        $this->assertEquals(['data' => 'value'], $result);
    }
    
    /**
     * @test
     */
    public function setWithZeroTTL(): void
    {
        $cache = new ResponseCache();
        $result = $cache->set('zero_ttl', ['data' => 'value'], 0);
        
        $this->assertTrue($result);
    }
    
    /**
     * @test
     */
    public function setOverwritesExisting(): void
    {
        $cache = new ResponseCache();
        $cache->set('overwrite', ['first' => 'value']);
        $cache->set('overwrite', ['second' => 'value']);
        
        $result = $cache->get('overwrite');
        
        $this->assertEquals(['second' => 'value'], $result);
    }
    
    // =========================================================================
    // DELETE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function deleteReturnsTrue(): void
    {
        $cache = new ResponseCache();
        $cache->set('to_delete', ['data' => 'value']);
        
        $result = $cache->delete('to_delete');
        
        $this->assertTrue($result);
    }
    
    /**
     * @test
     */
    public function deleteRemovesData(): void
    {
        $cache = new ResponseCache();
        $cache->set('delete_me', ['data' => 'value']);
        $cache->delete('delete_me');
        
        $result = $cache->get('delete_me');
        
        $this->assertNull($result);
    }
    
    /**
     * @test
     */
    public function deleteNonExistentReturnsTrue(): void
    {
        $cache = new ResponseCache();
        $result = $cache->delete('nonexistent');
        
        $this->assertTrue($result);
    }
    
    // =========================================================================
    // KEY SANITIZATION TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function keySanitizationReplacesSpaces(): void
    {
        $cache = new ResponseCache();
        $cache->set('key with spaces', ['data' => 'value']);
        
        $result = $cache->get('key_with_spaces');
        
        $this->assertEquals(['data' => 'value'], $result);
    }
    
    /**
     * @test
     */
    public function keySanitizationReplacesSpecialChars(): void
    {
        $cache = new ResponseCache();
        $cache->set('key@#$%', ['data' => 'value']);
        
        // Should sanitize to key_____
        $result = $cache->get('key_____');
        
        $this->assertEquals(['data' => 'value'], $result);
    }
    
    /**
     * @test
     */
    public function keySanitizationPreservesAlphanumeric(): void
    {
        $cache = new ResponseCache();
        $cache->set('valid-key_123', ['data' => 'value']);
        
        $result = $cache->get('valid-key_123');
        
        $this->assertEquals(['data' => 'value'], $result);
    }
    
    // =========================================================================
    // STATS TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getStatsReturnsArray(): void
    {
        $cache = new ResponseCache();
        $result = $cache->get_stats();
        
        $this->assertIsArray($result);
    }
    
    /**
     * @test
     */
    public function getStatsIncludesCachedItems(): void
    {
        $cache = new ResponseCache();
        $cache->set('stats_key1', ['data' => 'value']);
        $cache->set('stats_key2', ['data' => 'value']);
        
        $result = $cache->get_stats();
        
        $this->assertArrayHasKey('cached_items', $result);
    }
    
    /**
     * @test
     */
    public function getStatsIncludesPrefix(): void
    {
        $cache = new ResponseCache();
        $result = $cache->get_stats();
        
        $this->assertArrayHasKey('prefix', $result);
    }
    
    /**
     * @test
     */
    public function getStatsIncludesDefaultTTL(): void
    {
        $cache = new ResponseCache();
        $result = $cache->get_stats();
        
        $this->assertArrayHasKey('default_ttl', $result);
    }
    
    // =========================================================================
    // CLEAR ALL TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function clearAllReturnsCount(): void
    {
        $cache = new ResponseCache();
        $cache->set('clear1', ['data' => 'value']);
        $cache->set('clear2', ['data' => 'value']);
        
        $result = $cache->clear_all();
        
        $this->assertIsInt($result);
    }
    
    // =========================================================================
    // EDGE CASES
    // =========================================================================
    
    /**
     * @test
     */
    public function getHandlesEmptyKey(): void
    {
        $cache = new ResponseCache();
        $result = $cache->get('');
        
        $this->assertNull($result);
    }
    
    /**
     * @test
     */
    public function setHandlesEmptyData(): void
    {
        $cache = new ResponseCache();
        $result = $cache->set('empty_data', []);
        
        $this->assertTrue($result);
    }
    
    /**
     * @test
     */
    public function getReturnsNullForEmptyKey(): void
    {
        $cache = new ResponseCache();
        $cache->set('', ['data' => 'value']);
        
        $result = $cache->get('');
        
        $this->assertNull($result);
    }
    
    /**
     * @test
     */
    public function setHandlesNullData(): void
    {
        $cache = new ResponseCache();
        // Should handle gracefully
        $result = $cache->set('null_data', null);
        
        $this->assertTrue($result);
    }
    
    /**
     * @test
     */
    public function multipleCacheOperationsWork(): void
    {
        $cache = new ResponseCache();
        
        // Set multiple
        $cache->set('key1', ['v' => 1]);
        $cache->set('key2', ['v' => 2]);
        $cache->set('key3', ['v' => 3]);
        
        // Get all
        $this->assertEquals(['v' => 1], $cache->get('key1'));
        $this->assertEquals(['v' => 2], $cache->get('key2'));
        $this->assertEquals(['v' => 3], $cache->get('key3'));
        
        // Delete one
        $cache->delete('key2');
        
        $this->assertNotNull($cache->get('key1'));
        $this->assertNull($cache->get('key2'));
        $this->assertNotNull($cache->get('key3'));
    }
    
    /**
     * @test
     */
    public function cacheKeyHasPrefix(): void
    {
        $cache = new ResponseCache();
        $cache->set('test', ['data' => 'value']);
        
        // Get internal storage to verify prefix
        $reflection = new \ReflectionClass($cache);
        $property = $reflection->getProperty('prefix');
        $property->setAccessible(true);
        $prefix = $property->getValue($cache);
        
        $this->assertStringStartsWith($prefix, 'zanafleet_cache_');
    }
}