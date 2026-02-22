<?php

namespace ZanaFleet\Admin;

defined('ABSPATH') || exit;

/**
 * ZanaFleet Settings Class
 */
class Settings
{
    private $settings;
    private $webhook_registered = false;

    public function __construct()
    {
        $this->settings = get_option('zanafleet_settings', []);

        add_filter('woocommerce_settings_tabs_array', [$this, 'add_settings_tab'], 50);
        add_action('woocommerce_settings_tabs_zanafleet', [$this, 'settings_tab']);
        add_action('woocommerce_update_options_zanafleet', [$this, 'save_settings']);
        
        // Fixed: Removed broken WC_Admin_Settings::output_sections call
        // WooCommerce 10.x moved this to individual settings pages
    }

    /**
     * Add settings tab
     */
    public function add_settings_tab($tabs): array
    {
        $tabs['zanafleet'] = __('ZanaFleet', 'zanafleet');
        return $tabs;
    }

    /**
     * Get settings sections
     */
    private function get_sections(): array
    {
        return [
            '' => __('General', 'zanafleet'),
            'api' => __('API Configuration', 'zanafleet'),
            'test_mode' => __('Test Mode', 'zanafleet'),
            'webhooks' => __('Webhooks', 'zanafleet'),
            'advanced' => __('Advanced', 'zanafleet'),
        ];
    }

    /**
     * Get settings fields
     */
    private function get_settings_fields(): array
    {
        return [
            '' => [
                [
                    'title' => __('Enable ZanaFleet', 'zanafleet'),
                    'desc' => __('Enable ZanaFleet delivery integration', 'zanafleet'),
                    'id' => 'zanafleet_settings[enabled]',
                    'type' => 'checkbox',
                    'default' => 'no',
                ],
                [
                    'title' => __('Default Vehicle Type', 'zanafleet'),
                    'desc' => __('Default vehicle type for deliveries', 'zanafleet'),
                    'id' => 'zanafleet_settings[default_vehicle]',
                    'type' => 'select',
                    'options' => [
                        'Bike' => __('Bike', 'zanafleet'),
                        'Car' => __('Car', 'zanafleet'),
                        'TukTuk' => __('TukTuk', 'zanafleet'),
                        'Pickup' => __('Pickup', 'zanafleet'),
                    ],
                    'default' => 'Bike',
                ],
                [
                    'title' => __('Auto-dispatch', 'zanafleet'),
                    'desc' => __('Automatically create delivery after payment', 'zanafleet'),
                    'id' => 'zanafleet_settings[auto_dispatch]',
                    'type' => 'checkbox',
                    'default' => 'yes',
                ],
            ],
            'api' => [
                [
                    'title' => __('API Key', 'zanafleet'),
                    'desc' => __('Your ZanaFleet API key', 'zanafleet'),
                    'id' => 'zanafleet_settings[api_key]',
                    'type' => 'password',
                    'class' => 'regular-text',
                ],
                [
                    'title' => __('API Secret', 'zanafleet'),
                    'desc' => __('Your ZanaFleet API secret', 'zanafleet'),
                    'id' => 'zanafleet_settings[api_secret]',
                    'type' => 'password',
                    'class' => 'regular-text',
                ],
                [
                    'title' => __('Environment', 'zanafleet'),
                    'desc' => __('Select sandbox for testing', 'zanafleet'),
                    'id' => 'zanafleet_settings[environment]',
                    'type' => 'select',
                    'options' => [
                        'sandbox' => __('Sandbox (Testing)', 'zanafleet'),
                        'production' => __('Production', 'zanafleet'),
                    ],
                    'default' => 'sandbox',
                ],
                [
                    'title' => __('Business ID', 'zanafleet'),
                    'desc' => __('Your ZanaFleet Business ID', 'zanafleet'),
                    'id' => 'zanafleet_settings[business_id]',
                    'type' => 'text',
                    'class' => 'regular-text',
                ],
                [
                    'title' => __('Workspace ID', 'zanafleet'),
                    'desc' => __('Your ZanaFleet Workspace ID (optional)', 'zanafleet'),
                    'id' => 'zanafleet_settings[workspace_id]',
                    'type' => 'text',
                    'class' => 'regular-text',
                ],
                [
                    'title' => __('Test Connection', 'zanafleet'),
                    'desc' => __('Verify your API credentials', 'zanafleet'),
                    'id' => 'zanafleet_test_connection',
                    'type' => 'button',
                    'desc_tip' => __('Click to test your API connection', 'zanafleet'),
                ],
            ],
            'webhooks' => [
                [
                    'title' => __('Webhook Secret', 'zanafleet'),
                    'desc' => __('Secret for verifying webhook signatures', 'zanafleet'),
                    'id' => 'zanafleet_settings[webhook_secret]',
                    'type' => 'password',
                    'class' => 'regular-text',
                ],
                [
                    'title' => __('Webhook URL', 'zanafleet'),
                    'desc' => '<code>' . rest_url('zanafleet/v1/webhook') . '</code>',
                    'id' => 'zanafleet_webhook_url',
                    'type' => 'hidden',
                    'custom_attributes' => ['readonly' => 'readonly'],
                ],
                [
                    'title' => __('Register Webhook', 'zanafleet'),
                    'desc' => __('Automatically register webhook with ZanaFleet API', 'zanafleet'),
                    'id' => 'zanafleet_settings[register_webhook]',
                    'type' => 'checkbox',
                    'default' => 'yes',
                ],
            ],
            'test_mode' => [
                [
                    'title' => __('Enable Test Mode', 'zanafleet'),
                    'desc' => __('Enable test mode for local development without API credentials', 'zanafleet'),
                    'id' => 'zanafleet_settings[test_mode]',
                    'type' => 'checkbox',
                    'default' => 'no',
                ],
                [
                    'title' => __('Mock Delivery Quotes', 'zanafleet'),
                    'desc' => __('Return mock delivery quotes in test mode', 'zanafleet'),
                    'id' => 'zanafleet_settings[mock_quotes]',
                    'type' => 'checkbox',
                    'default' => 'yes',
                ],
                [
                    'title' => __('Test Business ID', 'zanafleet'),
                    'desc' => __('Business ID to use in test mode', 'zanafleet'),
                    'id' => 'zanafleet_settings[test_business_id]',
                    'type' => 'text',
                    'default' => 'test_business_001',
                ],
                [
                    'title' => __('Test Workspace ID', 'zanafleet'),
                    'desc' => __('Workspace ID to use in test mode', 'zanafleet'),
                    'id' => 'zanafleet_settings[test_workspace_id]',
                    'type' => 'text',
                    'default' => 'test_workspace_001',
                ],
            ],
            'advanced' => [
                [
                    'title' => __('Fallback Shipping', 'zanafleet'),
                    'desc' => __('Show fallback shipping if ZanaFleet is unavailable', 'zanafleet'),
                    'id' => 'zanafleet_settings[fallback_enabled]',
                    'type' => 'checkbox',
                    'default' => 'yes',
                ],
                [
                    'title' => __('Debug Mode', 'zanafleet'),
                    'desc' => __('Enable debug logging', 'zanafleet'),
                    'id' => 'zanafleet_settings[debug_mode]',
                    'type' => 'checkbox',
                    'default' => 'no',
                ],
                [
                    'title' => __('Quote Timeout', 'zanafleet'),
                    'desc' => __('Timeout for getting quotes (seconds)', 'zanafleet'),
                    'id' => 'zanafleet_settings[timeout]',
                    'type' => 'number',
                    'default' => 30,
                    'custom_attributes' => ['min' => 5, 'max' => 300],
                ],
            ],
        ];
    }

    /**
     * Output settings tab
     */
    public function settings_tab(): void
    {
        global $current_section;
        $sections = $this->get_sections();

        echo '<h2>' . __('ZanaFleet Settings', 'zanafleet') . '</h2>';
        
        // Output sections
        echo '<ul class="subsubsub">';
        $array_keys = array_keys($sections);
        foreach ($sections as $id => $label) {
            echo '<li><a href="' . admin_url('admin.php?page=wc-settings&tab=zanafleet&section=' . $id) . '"';
            if ($current_section === $id || (empty($current_section) && $id === '')) {
                echo ' class="current"';
            }
            echo '>' . $label . '</a> ' . (end($array_keys) !== $id ? '|' : '') . ' </li>';
        }
        echo '</ul><br class="clear" />';

        // Output settings
        $fields = $this->get_settings_fields();
        $fields = $fields[$current_section] ?? $fields[''];

        if (!empty($fields)) {
            woocommerce_admin_fields($fields);
        }

        submit_button(__('Save Changes', 'zanafleet'));
    }

    /**
     * Save settings
     */
    public function save_settings(): void
    {
        global $current_section;
        
        $fields = $this->get_settings_fields();
        $fields = $fields[$current_section] ?? $fields[''];

        if (!empty($fields)) {
            woocommerce_update_options($fields);
        }

        // Register webhook if enabled
        $settings = get_option('zanafleet_settings', []);
        if (!empty($settings['register_webhook']) && !empty($settings['api_key'])) {
            $this->register_webhook($settings);
        }
    }

    /**
     * Register webhook with API
     */
    private function register_webhook(array $settings): void
    {
        if ($this->webhook_registered) {
            return;
        }

        try {
            $config = new \ZanaFleet\Core\Configuration\ZanaFleetConfig(
                $settings['api_key'],
                $settings['api_secret'],
                $settings['environment'],
                $settings['webhook_secret'] ?? '',
                $settings['business_id'] ?? '',
                $settings['workspace_id'] ?? ''
            );
            
            $client = new \ZanaFleet\Core\Client\ZanaFleetClient($config);
            
            $webhook_url = rest_url('zanafleet/v1/webhook');
            $client->registerWebhook($webhook_url, [
                'delivery.assigned',
                'delivery.picked_up',
                'delivery.in_transit',
                'delivery.delivered',
                'delivery.failed',
                'delivery.cancelled',
            ]);

            $this->webhook_registered = true;
        } catch (\Exception $e) {
            // Log but don't block
            error_log('ZanaFleet webhook registration failed: ' . $e->getMessage());
        }
    }
}

new Settings();