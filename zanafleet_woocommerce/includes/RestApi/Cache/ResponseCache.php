<?php
/**
 * ZanaFleet Response Cache
 * 
 * Caches API responses to prevent SaaS overload
 * Uses WordPress transients for persistence
 */

namespace ZanaFleet\RestApi\Cache;

defined('ABSPATH') || exit;

class ResponseCache
{
    private $ttl_default = 300; // 5 minutes
    private $prefix = 'zanafleet_cache_';
    private $enabled = true;
    private $ttl;

    /**
     * Constructor
     */
    public function __construct(array $options = [])
    {
        $this->ttl = $options['ttl'] ?? 300;
        $this->enabled = $options['enabled'] ?? true;
    }

    /**
     * Get cached response
     */
    public function get(string $key): ?array
    {
        if (!$this->enabled) {
            return null;
        }
        
        $cache_key = $this->prefix . $this->sanitize_key($key);
        $cached = get_transient($cache_key);
        
        if (false !== $cached) {
            return $cached;
        }
        
        return null;
    }

    /**
     * Set cached response
     */
    public function set(string $key, array $data, ?int $ttl = null): bool
    {
        if (!$this->enabled) {
            return false;
        }
        
        $cache_key = $this->prefix . $this->sanitize_key($key);
        $ttl = $ttl ?? $this->ttl;
        
        return set_transient($cache_key, $data, $ttl);
    }

    /**
     * Delete cached response
     */
    public function delete(string $key): bool
    {
        $cache_key = $this->prefix . $this->sanitize_key($key);
        return delete_transient($cache_key);
    }

    /**
     * Clear all ZanaFleet cache
     */
    public function clear_all(): int
    {
        global $wpdb;
        
        $deleted = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                $this->prefix . '%'
            )
        );
        
        return $deleted;
    }

    /**
     * Clear all cache
     */
    public function clear(): bool
    {
        return $this->clear_all() > 0;
    }

    /**
     * Get cache statistics
     */
    public function get_stats(): array
    {
        global $wpdb;
        
        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
                $this->prefix . '%'
            )
        );
        
        return [
            'cached_items' => (int) $count,
            'prefix' => $this->prefix,
            'default_ttl' => $this->ttl_default,
        ];
    }

    /**
     * Generate cache key from request
     */
    public function generateKey(array $data): string
    {
        return md5(json_encode($data));
    }

    /**
     * Check if cache is enabled
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Sanitize cache key
     */
    private function sanitize_key(string $key): string
    {
        return preg_replace('/[^a-zA-Z0-9_-]/', '_', $key);
    }
}
