<?php

defined('ABSPATH') || exit;

/**
 * ZanaFleet Shipping Method
 * 
 * Adds ZanaFleet as a shipping option in WooCommerce
 */
class ZanaFleet_Shipping_Method extends WC_Shipping_Method
{
    /**
     * Constructor
     */
    public function __construct(int $instance_id = 0)
    {
        $this->id = 'zanafleet';
        $this->instance_id = absint($instance_id);
        $this->method_title = __('ZanaFleet Delivery', 'zanafleet');
        $this->method_description = __('ZanaFleet last-mile delivery integration', 'zanafleet');
        $this->supports = [
            'shipping-zones',
            'instance-settings',
            'instance-settings-modal',
        ];

        $this->init();
    }

    /**
     * Initialize
     */
    public function init(): void
    {
        $this->instance_form_fields = [
            'title' => [
                'title' => __('Method Title', 'woocommerce'),
                'type' => 'text',
                'default' => __('ZanaFleet Delivery', 'zanafleet'),
                'desc_tip' => true,
            ],
            'tax_status' => [
                'title' => __('Tax Status', 'woocommerce'),
                'type' => 'select',
                'class' => 'wc-enhanced-select',
                'default' => 'taxable',
                'options' => [
                    'taxable' => __('Taxable', 'woocommerce'),
                    'none' => __('None', 'woocommerce'),
                ],
            ],
            'cost' => [
                'title' => __('Cost', 'woocommerce'),
                'type' => 'number',
                'class' => 'wc_input_price',
                'desc_tip' => true,
                'description' => __('Enter a cost, or leave empty to use dynamic pricing from API', 'zanafleet'),
            ],
            'free_shipping_min_amount' => [
                'title' => __('Free Shipping Minimum Amount', 'woocommerce'),
                'type' => 'number',
                'class' => 'wc_input_price',
                'desc_tip' => true,
                'description' => __('Minimum order amount for free shipping', 'zanafleet'),
            ],
        ];

        $this->title = $this->get_option('title', __('ZanaFleet Delivery', 'zanafleet'));
    }

    /**
     * Calculate shipping
     */
    public function calculate_shipping($package = []): void
    {
        $settings = get_option('zanafleet_settings', []);
        
        // Check for test mode
        $testMode = !empty($settings['test_mode']);
        $mockQuotes = !empty($settings['mock_quotes']);
        
        // If in test mode with mock quotes, return mock rates
        if ($testMode && $mockQuotes) {
            $this->add_rate([
                'id' => $this->get_rate_id(),
                'label' => $this->title . ' (Test)',
                'cost' => 5.99,
                'meta_data' => [
                    'test_mode' => true,
                    'quote_id' => 'test_quote_001',
                    'estimated_minutes' => 30,
                ],
            ]);
            
            // Add express option in test mode
            $this->add_rate([
                'id' => $this->get_rate_id() . '_express',
                'label' => $this->title . ' Express (Test)',
                'cost' => 12.99,
                'meta_data' => [
                    'test_mode' => true,
                    'quote_id' => 'test_quote_002',
                    'estimated_minutes' => 15,
                ],
            ]);
            return;
        }
        
        // ... existing code ...
        if (empty($this->get_option('cost')) && !empty($package['zanafleet_quote'])) {
            $quote = $package['zanafleet_quote'];
            $rate = [
                'id' => $this->get_rate_id(),
                'label' => $this->title,
                'cost' => $quote['price'],
                'meta_data' => [
                    'quote_id' => $quote['quote_id'] ?? '',
                    'estimated_minutes' => $quote['estimated_minutes'] ?? 0,
                ],
            ];

            // Check for free shipping
            $free_min = $this->get_option('free_shipping_min_amount');
            if ($free_min && $package['cart_subtotal'] >= $free_min) {
                $rate['cost'] = 0;
            }

            $this->add_rate($rate);
            return;
        }

        // Use static cost
        $cost = $this->get_option('cost');
        
        if ('' !== $cost) {
            // Check for free shipping
            $free_min = $this->get_option('free_shipping_min_amount');
            if ($free_min && $package['cart_subtotal'] >= $free_min) {
                $cost = 0;
            }

            $this->add_rate([
                'id' => $this->get_rate_id(),
                'label' => $this->title,
                'cost' => $cost,
            ]);
        }
    }

    /**
     * Check if this method is available for a package
     */
    public function is_available($package): bool
    {
        $settings = get_option('zanafleet_settings', []);
        
        // Check if enabled
        if (empty($settings['enabled'])) {
            return false;
        }

        // Check if shipping to supported area
        if (!empty($settings['supported_countries'])) {
            $countries = explode(',', $settings['supported_countries']);
            if (!in_array($package['destination']['country'], $countries)) {
                return false;
            }
        }

        return apply_filters('woocommerce_shipping_' . $this->id . '_is_available', true, $package, $this);
    }
}