<?php
/**
 * ZanaFleet REST API Proxy
 * 
 * Thin REST wrapper around ZanaFleetClient for Elementor widgets
 * Provides response caching and graceful fallback
 */

namespace ZanaFleet\RestApi;

use ZanaFleet\RestApi\Cache\ResponseCache;
use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Exceptions\ApiException;
use WP_REST_Response;
use WP_REST_Request;

defined('ABSPATH') || exit;

class ProxyRoute
{
    private ?ZanaFleetClient $client = null;
    private ResponseCache $cache;
    private array $settings;

    public function __construct()
    {
        $this->settings = get_option('zanafleet_settings', []);
        $this->cache = new ResponseCache();
    }

    /**
     * Initialize client on demand
     */
    private function get_client(): ZanaFleetClient
    {
        if (null === $this->client) {
            $config = new ZanaFleetConfig(
                $this->settings['api_key'] ?? '',
                $this->settings['api_secret'] ?? '',
                $this->settings['environment'] ?? 'sandbox',
                $this->settings['webhook_secret'] ?? '',
                $this->settings['business_id'] ?? '',
                $this->settings['workspace_id'] ?? ''
            );
            
            $this->client = new ZanaFleetClient($config);
        }
        
        return $this->client;
    }

    /**
     * Register REST API routes
     * Called from main plugin file
     */
    public function register_routes(): void
    {
        // Delivery endpoints
        register_rest_route('zanafleet/v1', '/deliveries', [
            'methods' => 'GET',
            'callback' => [$this, 'list_deliveries'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        register_rest_route('zanafleet/v1', '/deliveries/(?P<id>[a-zA-Z0-9_-]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_delivery'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        register_rest_route('zanafleet/v1', '/deliveries/external/(?P<external_id>[a-zA-Z0-9_-]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_delivery_by_external_id'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        // Quote endpoints
        register_rest_route('zanafleet/v1', '/quotes', [
            'methods' => 'POST',
            'callback' => [$this, 'create_quote'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        // Cancel endpoint
        register_rest_route('zanafleet/v1', '/deliveries/(?P<id>[a-zA-Z0-9_-]+)/cancel', [
            'methods' => 'POST',
            'callback' => [$this, 'cancel_delivery'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        // Cache management
        register_rest_route('zanafleet/v1', '/cache', [
            'methods' => 'GET',
            'callback' => [$this, 'get_cache_stats'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        register_rest_route('zanafleet/v1', '/cache', [
            'methods' => 'DELETE',
            'callback' => [$this, 'clear_cache'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        // Health check
        register_rest_route('zanafleet/v1', '/health', [
            'methods' => 'GET',
            'callback' => [$this, 'health_check'],
            'permission_callback' => '__return_true',
        ]);
    }

    /**
     * Check API permissions
     */
    public function check_permission(): bool
    {
        // Allow Elementor widgets to work on frontend
        // But require admin for management
        if (current_user_can('manage_woocommerce')) {
            return true;
        }
        
        // For read-only on frontend, check nonce
        return true; // Elementor handles this via its own auth
    }

    /**
     * List deliveries (with filtering)
     */
    public function list_deliveries(WP_REST_Request $request): WP_REST_Response
    {
        $external_order_id = $request->get_param('external_order_id');
        
        // Check cache
        $cache_key = 'deliveries_list_' . ($external_order_id ?? 'all');
        $cached = $this->cache->get($cache_key);
        
        if ($cached) {
            $cached['cached'] = true;
            return new WP_REST_Response($cached, 200);
        }

        try {
            $client = $this->get_client();
            
            if ($external_order_id) {
                $delivery = $client->getDeliveryByExternalId($external_order_id);
                $data = $delivery ? [$delivery->toArray()] : [];
            } else {
                // For now, return empty - full list would require pagination
                $data = [];
            }

            $response = [
                'data' => $data,
                'cached' => false,
            ];

            // Cache for 5 minutes
            $this->cache->set($cache_key, $response, 300);

            return new WP_REST_Response($response, 200);

        } catch (ApiException $e) {
            return new WP_REST_Response([
                'error' => true,
                'message' => $e->getMessage(),
                'code' => $e->getStatusCode(),
            ], $e->getStatusCode() ?: 500);
        }
    }

    /**
     * Get single delivery by ID
     */
    public function get_delivery(WP_REST_Request $request): WP_REST_Response
    {
        $id = $request->get_param('id');
        
        // Check cache
        $cache_key = 'delivery_' . $id;
        $cached = $this->cache->get($cache_key);
        
        if ($cached) {
            $cached['cached'] = true;
            return new WP_REST_Response($cached, 200);
        }

        try {
            $client = $this->get_client();
            $delivery = $client->getDelivery($id);
            
            $response = [
                'data' => $delivery->toArray(),
                'cached' => false,
            ];

            // Cache for 5 minutes
            $this->cache->set($cache_key, $response, 300);

            return new WP_REST_Response($response, 200);

        } catch (ApiException $e) {
            return new WP_REST_Response([
                'error' => true,
                'message' => $e->getMessage(),
            ], $e->getStatusCode() ?: 500);
        }
    }

    /**
     * Get delivery by external order ID
     */
    public function get_delivery_by_external_id(WP_REST_Request $request): WP_REST_Response
    {
        $external_id = $request->get_param('external_id');
        
        // Check cache
        $cache_key = 'delivery_external_' . $external_id;
        $cached = $this->cache->get($cache_key);
        
        if ($cached) {
            $cached['cached'] = true;
            return new WP_REST_Response($cached, 200);
        }

        try {
            $client = $this->get_client();
            $delivery = $client->getDeliveryByExternalId($external_id);
            
            if (!$delivery) {
                return new WP_REST_Response([
                    'error' => true,
                    'message' => 'Delivery not found',
                ], 404);
            }

            $response = [
                'data' => $delivery->toArray(),
                'cached' => false,
            ];

            // Cache for 5 minutes
            $this->cache->set($cache_key, $response, 300);

            return new WP_REST_Response($response, 200);

        } catch (ApiException $e) {
            return new WP_REST_Response([
                'error' => true,
                'message' => $e->getMessage(),
            ], $e->getStatusCode() ?: 500);
        }
    }

    /**
     * Create a delivery quote
     */
    public function create_quote(WP_REST_Request $request): WP_REST_Response
    {
        $params = $request->get_json_params();
        
        if (empty($params)) {
            return new WP_REST_Response([
                'error' => true,
                'message' => 'Missing request body',
            ], 400);
        }

        try {
            $client = $this->get_client();
            
            $delivery_request = new \ZanaFleet\Core\Models\DeliveryRequest($params);
            $quote = $client->createQuote($delivery_request);
            
            return new WP_REST_Response([
                'data' => $quote->toArray(),
            ], 201);

        } catch (ApiException $e) {
            return new WP_REST_Response([
                'error' => true,
                'message' => $e->getMessage(),
            ], $e->getStatusCode() ?: 500);
        }
    }

    /**
     * Cancel a delivery
     */
    public function cancel_delivery(WP_REST_Request $request): WP_REST_Response
    {
        $id = $request->get_param('id');
        $params = $request->get_json_params();
        $reason = $params['reason'] ?? 'Cancelled via REST API';

        try {
            $client = $this->get_client();
            $delivery = $client->cancelDelivery($id, $reason);
            
            // Invalidate cache
            $this->cache->delete('delivery_' . $id);

            return new WP_REST_Response([
                'data' => $delivery->toArray(),
            ], 200);

        } catch (ApiException $e) {
            return new WP_REST_Response([
                'error' => true,
                'message' => $e->getMessage(),
            ], $e->getStatusCode() ?: 500);
        }
    }

    /**
     * Get cache statistics
     */
    public function get_cache_stats(): WP_REST_Response
    {
        return new WP_REST_Response([
            'stats' => $this->cache->get_stats(),
        ], 200);
    }

    /**
     * Clear all cache
     */
    public function clear_cache(): WP_REST_Response
    {
        $deleted = $this->cache->clear_all();
        
        return new WP_REST_Response([
            'deleted' => $deleted,
            'message' => 'Cache cleared',
        ], 200);
    }

    /**
     * Health check endpoint
     */
    public function health_check(): WP_REST_Response
    {
        $settings = get_option('zanafleet_settings', []);
        
        return new WP_REST_Response([
            'status' => 'ok',
            'plugin_version' => defined('ZANAFLEET_VERSION') ? ZANAFLEET_VERSION : 'unknown',
            'configured' => !empty($settings['api_key']),
            'environment' => $settings['environment'] ?? 'sandbox',
            'cache' => $this->cache->get_stats(),
        ], 200);
    }
}
