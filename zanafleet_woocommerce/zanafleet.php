<?php
/**
 * Plugin Name: ZanaFleet Delivery Integration
 * Plugin URI: https://zanafleet.com/woocommerce
 * Description: Integrate ZanaFleet last-mile delivery with your WooCommerce store. Get real-time quotes, track deliveries, and manage shipments.
 * Version: 1.0.0
 * Author: ZanaFleet Team
 * Author URI: https://zanafleet.com
 * License: MIT
 * License URI: https://opensource.org/licenses/MIT
 * Text Domain: zanafleet
 * Domain Path: /languages
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 * 
 * @package ZanaFleet
 * @subpackage WooCommerce
 */

defined('ABSPATH') || exit;

// Plugin version
define('ZANAFLEET_VERSION', '1.0.0');
define('ZANAFLEET_PATH', plugin_dir_path(__FILE__));
define('ZANAFLEET_URL', plugin_dir_url(__FILE__));
define('ZANAFLEET_BASENAME', plugin_basename(__FILE__));

// Load inline autoloader (no composer required)
require_once ZANAFLEET_PATH . 'includes/Autoloader.php';

/**
 * Main ZanaFleet Plugin Class
 */
final class ZanaFleet_WooCommerce
{
    private static $instance = null;
    private $client = null;
    private $settings = [];

    /**
     * Get singleton instance
     */
    public static function instance(): self
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->settings = get_option('zanafleet_settings', []);
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks(): void
    {
        // Activation
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);

        // Load text domain
        add_action('plugins_loaded', [$this, 'load_textdomain']);

        // Check WooCommerce
        add_action('admin_notices', [$this, 'check_woocommerce']);

        // Shipping method
        add_filter('woocommerce_shipping_methods', [$this, 'add_shipping_method']);
        add_action('woocommerce_shipping_init', [$this, 'shipping_init']);

        // Frontend
        add_action('woocommerce_after_checkout_form', [$this, 'checkout_delivery_options']);
        add_action('woocommerce_before_cart', [$this, 'cart_delivery_notice']);
        add_action('woocommerce_checkout_update_order_meta', [$this, 'save_delivery_data']);
        add_action('woocommerce_order_status_changed', [$this, 'handle_order_status_change'], 10, 4);

        // Webhooks
        add_action('rest_api_init', [$this, 'register_webhook_endpoint']);
        add_action('woocommerce_api_zanafleet_webhook', [$this, 'handle_webhook']);

        // REST API Proxy for Elementor widgets
        add_action('rest_api_init', [$this, 'register_proxy_routes']);

        // Admin
        if (is_admin()) {
            $this->init_admin();
        }

        // AJAX
        add_action('wp_ajax_zanafleet_get_quote', [$this, 'ajax_get_quote']);
        add_action('wp_ajax_nopriv_zanafleet_get_quote', [$this, 'ajax_get_quote']);
        add_action('wp_ajax_zanafleet_create_delivery', [$this, 'ajax_create_delivery']);
        add_action('wp_ajax_nopriv_zanafleet_create_delivery', [$this, 'ajax_create_delivery']);

        // Elementor widgets (additive - graceful fallback)
        add_action('elementor/init', [$this, 'init_elementor_widgets']);
    }

    /**
     * Initialize admin
     */
    private function init_admin(): void
    {
        require_once ZANAFLEET_PATH . 'includes/Admin/Settings.php';
        require_once ZANAFLEET_PATH . 'includes/Admin/MetaBoxes.php';
    }

    /**
     * Plugin activation
     */
    public function activate(): void
    {
        // Create webhook endpoint
        if (!get_option('zanafleet_webhook_url')) {
            update_option('zanafleet_webhook_url', rest_url('zanafleet/v1/webhook'));
        }

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate(): void
    {
        flush_rewrite_rules();
    }

    /**
     * Load text domain
     */
    public function load_textdomain(): void
    {
        load_plugin_textdomain(
            'zanafleet',
            false,
            dirname(ZANAFLEET_BASENAME) . '/languages'
        );
    }

    /**
     * Check WooCommerce is active
     */
    public function check_woocommerce(): void
    {
        if (!class_exists('WooCommerce')) {
            echo '<div class="notice notice-error"><p>';
            printf(
                __('ZanaFleet requires WooCommerce to be active. Please install and activate WooCommerce.', 'zanafleet')
            );
            echo '</p></div>';
        }
    }

    /**
     * Add shipping method
     */
    public function add_shipping_method($methods)
    {
        require_once ZANAFLEET_PATH . 'includes/ShippingMethod.php';
        $methods['zanafleet'] = 'ZanaFleet_Shipping_Method';
        return $methods;
    }

    /**
     * Initialize shipping
     */
    public function shipping_init(): void
    {
        // Loaded in add_shipping_method
    }

    /**
     * Get API client
     */
    public function get_client()
    {
        if (null === $this->client && $this->is_configured()) {
            $config = new \ZanaFleet\Core\Configuration\ZanaFleetConfig(
                $this->settings['api_key'] ?? '',
                $this->settings['api_secret'] ?? '',
                $this->settings['environment'] ?? 'sandbox',
                $this->settings['webhook_secret'] ?? '',
                $this->settings['business_id'] ?? '',
                $this->settings['workspace_id'] ?? ''
            );
            $this->client = new \ZanaFleet\Core\Client\ZanaFleetClient($config);
        }
        return $this->client;
    }

    /**
     * Check if plugin is configured
     */
    public function is_configured(): bool
    {
        return !empty($this->settings['api_key']) 
            && !empty($this->settings['api_secret'])
            && !empty($this->settings['business_id']);
    }

    /**
     * Get settings
     */
    public function get_settings(): array
    {
        return $this->settings;
    }

    /**
     * Register webhook REST endpoint
     */
    public function register_webhook_endpoint(): void
    {
        register_rest_route('zanafleet/v1', '/webhook', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_webhook'],
            'permission_callback' => '__return_true',
        ]);
    }

    /**
     * Register REST API proxy routes for Elementor widgets
     * ADDITIVE - Does not modify existing webhook or core functionality
     */
    public function register_proxy_routes(): void
    {
        require_once ZANAFLEET_PATH . 'includes/RestApi/ProxyRoute.php';
        $proxy = new \ZanaFleet\RestApi\ProxyRoute();
        $proxy->register_routes();
    }

    /**
     * Initialize Elementor widgets
     * ADDITIVE - Graceful fallback if Elementor not installed
     */
    public function init_elementor_widgets(): void
    {
        // Check Elementor is active
        if (!defined('ELEMENTOR_TESTS')) {
            if (!did_action('elementor/loaded')) {
                return; // Elementor not installed - graceful fallback
            }
        }
        
        require_once ZANAFLEET_PATH . 'includes/Elementor/WidgetRegistrar.php';
        \ZanaFleet\Elementor\WidgetRegistrar::init();
    }

    /**
     * Handle incoming webhook
     */
    public function handle_webhook(): void
    {
        $input = file_get_contents('php://input');
        $signature = $_SERVER['HTTP_X_ZANAFLEET_SIGNATURE'] ?? '';

        // Verify signature
        if ($this->is_configured() && !empty($signature)) {
            $client = $this->get_client();
            if (!$client->verifyWebhookSignature($input, $signature)) {
                wp_send_json_error('Invalid signature', 401);
                exit;
            }
        }

        $data = json_decode($input, true);
        if (!$data) {
            wp_send_json_error('Invalid payload', 400);
            exit;
        }

        $event = \ZanaFleet\Core\Webhooks\WebhookEvent::fromArray($data);

        // Process event based on status
        $this->process_webhook_event($event);

        wp_send_json_success(['received' => true]);
    }

    /**
     * Process webhook event
     */
    private function process_webhook_event($event): void
    {
        $delivery_id = $event->getDeliveryId();
        $status = $event->getStatus();

        // Find order by delivery meta
        $orders = wc_get_orders([
            'meta_key' => '_zanafleet_delivery_id',
            'meta_value' => $delivery_id,
            'limit' => 1,
        ]);

        if (empty($orders)) {
            return;
        }

        $order = $orders[0];

        // Update order based on status
        switch ($status) {
            case 'Assigned':
                $order->update_meta_data('_zanafleet_rider_id', $event->getRiderId());
                $order->update_meta_data('_zanafleet_rider_name', $event->getRiderName());
                $order->update_meta_data('_zanafleet_rider_phone', $event->getRiderPhone());
                $order->save();
                $order->add_order_note(sprintf(
                    __('Rider assigned: %s (%s)', 'zanafleet'),
                    $event->getRiderName(),
                    $event->getRiderPhone()
                ));
                break;

            case 'Delivered':
                $order->update_status('completed');
                $order->add_order_note(__('Delivery completed via ZanaFleet', 'zanafleet'));
                break;

            case 'Failed':
                $order->update_status('failed');
                $order->add_order_note(__('Delivery failed - please contact support', 'zanafleet'));
                break;

            case 'Cancelled':
                $order->update_status('cancelled');
                $order->add_order_note(__('Delivery cancelled via ZanaFleet', 'zanafleet'));
                break;
        }

        // Update tracking URL
        if ($event->getTrackingUrl()) {
            $order->update_meta_data('_zanafleet_tracking_url', $event->getTrackingUrl());
            $order->save();
        }

        // Allow third-party plugins to handle
        do_action('zanafleet_webhook_event', $event, $order);
    }

    /**
     * Checkout delivery options
     */
    public function checkout_delivery_options(): void
    {
        if (!$this->is_configured()) {
            return;
        }

        require_once ZANAFLEET_PATH . 'includes/Frontend/CheckoutDelivery.php';
        new CheckoutDelivery($this);
    }

    /**
     * Cart delivery notice
     */
    public function cart_delivery_notice(): void
    {
        if (!$this->is_configured()) {
            return;
        }
        
        $show_notice = apply_filters('zanafleet_show_cart_notice', true);
        if (!$show_notice) {
            return;
        }

        echo '<div class="woocommerce-info zanafleet-cart-notice">';
        echo '<p>' . __('Delivery options will be available at checkout.', 'zanafleet') . '</p>';
        echo '</div>';
    }

    /**
     * Save delivery data to order
     */
    public function save_delivery_data($order_id): void
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        $delivery_id = $order->get_meta('_zanafleet_delivery_id');
        $quote = $order->get_meta('_zanafleet_delivery_quote');

        if ($delivery_id && $this->settings['auto_dispatch'] ?? false) {
            // Auto-create delivery after payment
            do_action('zanafleet_auto_create_delivery', $order, $delivery_id);
        }
    }

    /**
     * Handle order status changes
     */
    public function handle_order_status_change($order_id, $old_status, $new_status, $order): void
    {
        // Handle payment complete - create delivery if needed
        if ('processing' === $new_status && 'pending' === $old_status) {
            $delivery_id = $order->get_meta('_zanafleet_delivery_id');
            if (!$delivery_id) {
                $quote = $order->get_meta('_zanafleet_delivery_quote');
                if ($quote) {
                    $this->create_delivery_from_order($order);
                }
            }
        }
    }

    /**
     * Create delivery from order
     */
    public function create_delivery_from_order($order): ?string
    {
        $client = $this->get_client();
        if (!$client) {
            return null;
        }

        try {
            $address = new \ZanaFleet\Core\Models\Address(
                $order->get_shipping_address_1() . ' ' . $order->get_shipping_address_2(),
                null,
                $order->get_shipping_address_1(),
                $order->get_shipping_city(),
                $order->get_shipping_state(),
                $order->get_shipping_country(),
                $order->get_postcode(),
                (float) $order->get_meta('_zanafleet_latitude'),
                (float) $order->get_meta('_zanafleet_longitude')
            );

            $business_id = $this->settings['business_id'] ?? '';
            $workspace_id = $this->settings['workspace_id'] ?? '';

            $request = \ZanaFleet\Core\Models\DeliveryRequest::create(
                $business_id,
                $workspace_id,
                $address,
                $address,
                $order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name(),
                $order->get_billing_phone(),
                'woocommerce-' . $order->get_id()
            );

            $delivery = $client->createDelivery($request);

            // Save to order
            $order->update_meta_data('_zanafleet_delivery_id', $delivery->getId());
            $order->update_meta_data('_zanafleet_tracking_url', $delivery->getTrackingUrl());
            $order->save();

            return $delivery->getId();
        } catch (\Exception $e) {
            $order->add_order_note(sprintf(
                __('ZanaFleet Error: %s', 'zanafleet'),
                $e->getMessage()
            ));
            return null;
        }
    }

    /**
     * AJAX: Get quote
     */
    public function ajax_get_quote(): void
    {
        check_ajax_referer('zanafleet_nonce', 'nonce');

        $address = sanitize_text_field($_POST['address'] ?? '');
        $latitude = floatval($_POST['latitude'] ?? 0);
        $longitude = floatval($_POST['longitude'] ?? 0);

        if (empty($address) && (!$latitude || !$longitude)) {
            wp_send_json_error('Address or coordinates required');
        }

        $client = $this->get_client();
        if (!$client) {
            wp_send_json_error('ZanaFleet not configured');
        }

        try {
            $address_obj = new \ZanaFleet\Core\Models\Address(
                $address,
                null, null, null, null, null, null,
                $latitude, $longitude
            );

            $business_id = $this->settings['business_id'] ?? '';
            $workspace_id = $this->settings['workspace_id'] ?? '';

            $request = \ZanaFleet\Core\Models\DeliveryRequest::create(
                $business_id,
                $workspace_id,
                $address_obj,
                $address_obj,
                'Quote Request',
                '0000000000'
            );

            $quote = $client->createQuote($request);

            wp_send_json_success([
                'price' => $quote->getTotalPrice(),
                'currency' => $quote->getCurrency(),
                'estimated_minutes' => $quote->getEstimatedDeliveryMinutes(),
                'quote_id' => $quote->getQuoteId(),
            ]);
        } catch (\Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    /**
     * AJAX: Create delivery
     */
    public function ajax_create_delivery(): void
    {
        check_ajax_referer('zanafleet_nonce', 'nonce');

        $order_id = intval($_POST['order_id'] ?? 0);
        if (!$order_id) {
            wp_send_json_error('Order ID required');
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            wp_send_json_error('Order not found');
        }

        $delivery_id = $this->create_delivery_from_order($order);

        if ($delivery_id) {
            wp_send_json_success(['delivery_id' => $delivery_id]);
        } else {
            wp_send_json_error('Failed to create delivery');
        }
    }

    /**
     * Log message
     */
    public function log($message, $level = 'info'): void
    {
        if (class_exists('WC_Logger')) {
            $logger = wc_get_logger();
            $logger->log($level, $message, [
                'source' => 'zanafleet',
            ]);
        }
    }
}

/**
 * Get main instance
 */
function ZanaFleet(): ZanaFleet_WooCommerce
{
    return ZanaFleet_WooCommerce::instance();
}

// Initialize
ZanaFleet();