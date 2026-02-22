<?php
/**
 * ZanaFleet Bulk Order Processor
 * 
 * Batch processing for multiple orders
 * Uses existing shipment creation logic - NO DUPLICATION
 */

namespace ZanaFleet\Bulk;

use ZanaFleet\Licensing\TierGate;
use ZanaFleet\Core\Client\ZanaFleetClient;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Core\Exceptions\ApiException;

defined('ABSPATH') || exit;

class OrderProcessor
{
    private ?ZanaFleetClient $client = null;
    private array $settings;
    private int $batch_size = 10;

    public function __construct()
    {
        $this->settings = get_option('zanafleet_settings', []);
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
     * Process multiple orders in batch
     * Uses TierGate for feature gating
     */
    public function process_orders(array $order_ids, ?callable $progress = null): array
    {
        // Check tier-gated bulk limit
        $bulk_limit = TierGate::get_bulk_limit();
        
        if ($bulk_limit > 0 && count($order_ids) > $bulk_limit) {
            return [
                'error' => true,
                'code' => 'bulk_limit_exceeded',
                'message' => sprintf(
                    __('Bulk processing limited to %d orders. Upgrade for unlimited.', 'zanafleet'),
                    $bulk_limit
                ),
                'limit' => $bulk_limit,
                'required_tier' => TierGate::get_tier() === TierGate::FREE ? TierGate::BASIC : TierGate::PRO,
            ];
        }

        // Process orders
        return TierGate::execute_if_allowed(
            'bulk_orders_10',
            function() use ($order_ids, $progress) {
                return $this->execute_batch($order_ids, $progress);
            },
            function() {
                return [
                    'error' => true,
                    'code' => 'feature_not_available',
                    'message' => __('Bulk order processing requires Basic tier or higher.', 'zanafleet'),
                ];
            }
        );
    }

    /**
     * Execute batch processing
     */
    private function execute_batch(array $order_ids, ?callable $progress): array
    {
        $results = [];
        $total = count($order_ids);
        
        foreach ($order_ids as $index => $order_id) {
            try {
                $result = $this->process_single_order($order_id);
                $results[] = $result;

                // Progress callback
                if ($progress) {
                    call_user_func($progress, $index + 1, $total);
                }

            } catch (ApiException $e) {
                $results[] = [
                    'order_id' => $order_id,
                    'error' => true,
                    'message' => $e->getMessage(),
                ];
            }
        }

        return [
            'success' => true,
            'total' => $total,
            'results' => $results,
            'success_count' => count(array_filter($results, function($r) {
                return empty($r['error']);
            })),
        ];
    }

    /**
     * Process single order - reuses existing logic
     * NO NEW SHIPMENT ORCHESTRATION - delegates to existing flow
     */
    private function process_single_order($order_id): array
    {
        // Get order
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return [
                'order_id' => $order_id,
                'error' => true,
                'message' => 'Order not found',
            ];
        }

        // Check if delivery already exists
        $existing_delivery_id = $order->get_meta('_zanafleet_delivery_id');
        if ($existing_delivery_id) {
            return [
                'order_id' => $order_id,
                'error' => true,
                'message' => 'Delivery already exists',
                'delivery_id' => $existing_delivery_id,
            ];
        }

        // Build delivery request - replicates existing logic
        $request = $this->build_delivery_request($order);
        
        // Create delivery via existing client
        $client = $this->get_client();
        $delivery = $client->createDelivery($request);
        
        // Save delivery ID to order
        $order->update_meta_data('_zanafleet_delivery_id', $delivery->getId());
        $order->update_meta_data('_zanafleet_delivery_status', 'pending');
        $order->save();

        return [
            'order_id' => $order_id,
            'delivery_id' => $delivery->getId(),
            'status' => 'success',
        ];
    }

    /**
     * Build delivery request from order
     * Uses same logic as existing order creation flow
     */
    private function build_delivery_request($order): DeliveryRequest
    {
        $settings = $this->settings;
        
        // Get shipping address
        $shipping = $order->get_address('shipping');
        
        // Get package details
        $package_details = $this->get_package_details($order);
        
        // Get business address (pickup)
        $pickup_address = $settings['business_address'] ?? '';
        $pickup_contact = $settings['business_name'] ?? '';
        
        return new DeliveryRequest([
            'pickup' => [
                'address' => $pickup_address,
                'contact' => $pickup_contact,
                'phone' => $settings['business_phone'] ?? '',
            ],
            'delivery' => [
                'address' => implode(', ', array_filter([
                    $shipping['address_1'],
                    $shipping['address_2'],
                    $shipping['city'],
                    $shipping['state'],
                    $shipping['postcode'],
                    $shipping['country'],
                ])),
                'contact' => $shipping['first_name'] . ' ' . $shipping['last_name'],
                'phone' => $order->get_billing_phone(),
                'email' => $order->get_billing_email(),
            ],
            'package' => $package_details,
            'vehicle_type' => $order->get_meta('_zanafleet_vehicle_type') ?? 'Bike',
            'special_instructions' => $order->get_meta('_zanafleet_instructions') ?? '',
            'external_order_id' => (string) $order->get_id(),
            'metadata' => [
                'order_number' => $order->get_order_number(),
                'customer' => $order->get_customer_name(),
            ],
        ]);
    }

    /**
     * Get package details from order
     */
    private function get_package_details($order): array
    {
        $weight = $order->get_weight();
        $total = 0;
        $items = [];
        
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if ($product) {
                $items[] = [
                    'name' => $product->get_name(),
                    'quantity' => $item->get_quantity(),
                    'sku' => $product->get_sku(),
                ];
                $total += $item->get_quantity();
            }
        }
        
        return [
            'weight' => $weight ?: 1,
            'item_count' => $total,
            'items' => $items,
            'description' => sprintf(__('%d items', 'zanafleet'), $total),
        ];
    }

    /**
     * Get orders eligible for bulk processing
     */
    public function get_eligible_orders(array $args = []): array
    {
        $defaults = [
            'status' => ['wc-processing', 'wc-completed'],
            'limit' => 50,
            'meta_key' => '_zanafleet_delivery_id',
            'meta_compare' => 'NOT EXISTS',
        ];
        
        $args = wp_parse_args($args, $defaults);
        
        $query = new \WP_Query([
            'post_type' => 'shop_order',
            'post_status' => $args['status'],
            'posts_per_page' => $args['limit'],
            'meta_query' => [
                [
                    'key' => $args['meta_key'],
                    'compare' => $args['meta_compare'],
                ],
            ],
        ]);
        
        return $query->posts;
    }

    /**
     * Get bulk processing status
     */
    public function get_bulk_status(): array
    {
        return [
            'allowed' => TierGate::can('bulk_orders_10'),
            'limit' => TierGate::get_bulk_limit(),
            'current_tier' => TierGate::get_tier(),
            'current_tier_display' => TierGate::get_tier_display(),
        ];
    }
}
