<?php

namespace ZanaFleet\Frontend;

defined('ABSPATH') || exit;

/**
 * Checkout Delivery Options
 */
class CheckoutDelivery
{
    private $plugin;

    public function __construct($plugin)
    {
        $this->plugin = $plugin;
        $this->init_hooks();
    }

    private function init_hooks(): void
    {
        add_action('woocommerce_after_checkout_form', [$this, 'render_delivery_options'], 10);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('woocommerce_checkout_process', [$this, 'validate_delivery']);
        add_action('woocommerce_checkout_update_order_meta', [$this, 'save_delivery_data']);
    }

    /**
     * Enqueue scripts
     */
    public function enqueue_scripts(): void
    {
        if (!is_checkout()) {
            return;
        }

        wp_enqueue_style(
            'zanafleet-checkout',
            ZANAFLEET_URL . 'assets/css/checkout.css',
            [],
            ZANAFLEET_VERSION
        );

        wp_enqueue_script(
            'zanafleet-checkout',
            ZANAFLEET_URL . 'assets/js/checkout.js',
            ['jquery', 'wc-checkout'],
            ZANAFLEET_VERSION,
            true
        );

        wp_localize_script('zanafleet-checkout', 'zanafleetData', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('zanafleet_nonce'),
            'i18n' => [
                'calculating' => __('Calculating delivery...', 'zanafleet'),
                'error' => __('Unable to calculate delivery', 'zanafleet'),
                'noAddress' => __('Please enter a valid address', 'zanafleet'),
            ],
        ]);
    }

    /**
     * Render delivery options
     */
    public function render_delivery_options(): void
    {
        $settings = $this->plugin->get_settings();
        
        if (empty($settings['enabled'])) {
            return;
        }

        echo '<div id="zanafleet-delivery-options" class="zanafleet-checkout-section">';
        echo '<h3>' . esc_html__('Delivery Options', 'zanafleet') . '</h3>';
        
        // Vehicle type selection
        echo '<div class="zanafleet-field">';
        echo '<label for="zanafleet_vehicle_type">' . esc_html__('Vehicle Type', 'zanafleet') . '</label>';
        echo '<select name="zanafleet_vehicle_type" id="zanafleet_vehicle_type">';
        
        $vehicle_types = [
            'Bike' => __('Bike - Small packages', 'zanafleet'),
            'Car' => __('Car - Medium packages', 'zanafleet'),
            'TukTuk' => __('TukTuk - Large packages', 'zanafleet'),
            'Pickup' => __('Pickup - Extra large', 'zanafleet'),
        ];

        $default = $settings['default_vehicle'] ?? 'Bike';
        
        foreach ($vehicle_types as $value => $label) {
            echo '<option value="' . esc_attr($value) . '"';
            selected($value, $default);
            echo '>' . esc_html($label) . '</option>';
        }
        
        echo '</select>';
        echo '</div>';

        // Special instructions
        echo '<div class="zanafleet-field">';
        echo '<label for="zanafleet_instructions">' . esc_html__('Delivery Instructions (optional)', 'zanafleet') . '</label>';
        echo '<textarea name="zanafleet_instructions" id="zanafleet_instructions" rows="3"';
        echo ' placeholder="' . esc_attr__('Gate code, building entrance, etc.', 'zanafleet') . '"></textarea>';
        echo '</div>';

        // Quote display
        echo '<div id="zanafleet-quote-display" class="zanafleet-quote" style="display:none;">';
        echo '<div class="zanafleet-quote-price"></div>';
        echo '<div class="zanafleet-quote-time"></div>';
        echo '</div>';

        // Loading state
        echo '<div id="zanafleet-quote-loading" class="zanafleet-loading" style="display:none;">';
        echo '<span class="spinner"></span> ' . esc_html__('Getting delivery quote...', 'zanafleet');
        echo '</div>';

        // Error state
        echo '<div id="zanafleet-quote-error" class="zanafleet-error" style="display:none;"></div>';

        echo '</div>';
    }

    /**
     * Validate delivery at checkout
     */
    public function validate_delivery(): void
    {
        // Could add validation here if needed
    }

    /**
     * Save delivery data to order
     */
    public function save_delivery_data($order_id): void
    {
        $order = wc_get_order($order_id);
        
        if (isset($_POST['zanafleet_vehicle_type'])) {
            $order->update_meta_data(
                '_zanafleet_vehicle_type',
                sanitize_text_field($_POST['zanafleet_vehicle_type'])
            );
        }

        if (isset($_POST['zanafleet_instructions'])) {
            $order->update_meta_data(
                '_zanafleet_instructions',
                sanitize_textarea_field($_POST['zanafleet_instructions'])
            );
        }

        if (isset($_POST['zanafleet_quote_id'])) {
            $order->update_meta_data(
                '_zanafleet_delivery_quote',
                [
                    'quote_id' => sanitize_text_field($_POST['zanafleet_quote_id']),
                    'price' => floatval($_POST['zanafleet_quote_price'] ?? 0),
                ]
            );
        }

        $order->save();
    }
}