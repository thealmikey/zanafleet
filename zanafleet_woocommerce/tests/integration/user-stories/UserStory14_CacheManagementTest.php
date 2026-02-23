<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\RestApi\Cache\ResponseCache;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 14: Cache Management
 * 
 * As a store owner,
 * I want delivery quotes to be cached,
 * So that repeated requests are faster and reduce API calls.
 */
class UserStory14_CacheManagementTest extends TestCase
{
    private ResponseCache $cache;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cache = new ResponseCache(['ttl' => 300, 'enabled' => true]);
    }

    public function testQuoteIsCached(): void
    {
        $key = 'quote_nairobi_suburbs';
        $value = ['price' => 1500, 'currency' => 'KES', 'vehicle' => 'van'];

        $this->cache->set($key, $value);
        $cached = $this->cache->get($key);

        $this->assertEquals($value, $cached);
    }

    public function testCacheExpiresAfterTTL(): void
    {
        $cache = new ResponseCache(['ttl' => 1, 'enabled' => true]); // 1 second TTL
        
        $cache->set('test_key', ['data' => 'test']);
        
        // Wait for expiry
        sleep(2);
        
        $result = $cache->get('test_key');
        $this->assertNull($result);
    }

    public function testCacheCanBeCleared(): void
    {
        $this->cache->set('key1', 'value1');
        $this->cache->set('key2', 'value2');

        $this->cache->clear();

        $this->assertNull($this->cache->get('key1'));
        $this->assertNull($this->cache->get('key2'));
    }

    public function testCacheCanBeDisabled(): void
    {
        $disabledCache = new ResponseCache(['ttl' => 300, 'enabled' => false]);
        
        $disabledCache->set('key', 'value');
        $result = $disabledCache->get('key');
        
        $this->assertNull($result);
    }

    public function testCacheGeneratesKeyFromRequest(): void
    {
        $address1 = '123 Nairobi, Kenya';
        $address2 = '456 Nairobi, Kenya';
        
        $key1 = $this->cache->generateKey(['address' => $address1, 'weight' => 5]);
        $key2 = $this->cache->generateKey(['address' => $address2, 'weight' => 5]);
        
        // Different addresses should generate different keys
        $this->assertNotEquals($key1, $key2);
        
        // Same address should generate same key
        $key1Duplicate = $this->cache->generateKey(['address' => $address1, 'weight' => 5]);
        $this->assertEquals($key1, $key1Duplicate);
    }
}
