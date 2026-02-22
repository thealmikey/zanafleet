<?php
/**
 * ZanaFleet License Tier Gate
 * 
 * Wraps feature execution in license checks
 * PRESERVES DATA on downgrade - no data corruption
 */

namespace ZanaFleet\Licensing;

defined('ABSPATH') || exit;

class TierGate
{
    // License tiers
    public const FREE = 'free';
    public const BASIC = 'basic';
    public const PRO = 'pro';

    /**
     * Get current tier from settings
     */
    public static function get_tier(): string
    {
        $settings = get_option('zanafleet_settings', []);
        return $settings['license_tier'] ?? self::FREE;
    }

    /**
     * Get tier display name
     */
    public static function get_tier_display(): string
    {
        $tier = self::get_tier();
        
        $names = [
            self::FREE => __('Free', 'zanafleet'),
            self::BASIC => __('Basic', 'zanafleet'),
            self::PRO => __('Pro', 'zanafleet'),
        ];
        
        return $names[$tier] ?? $names[self::FREE];
    }

    /**
     * Check if feature is available for current tier
     */
    public static function can(string $feature): bool
    {
        $tier = self::get_tier();
        
        $tier_features = [
            self::FREE => [
                // Core features - always available
                'basic_tracking',
                'standard_quotes',
                'email_notifications',
                'checkout_shipping',
                'order_creation',
            ],
            self::BASIC => [
                // Free features
                'basic_tracking',
                'standard_quotes',
                'email_notifications',
                'checkout_shipping',
                'order_creation',
                // Basic tier features
                'sms_notifications',
                'priority_support',
                'bulk_orders_10',
                'advanced_tracking',
                'delivery_history',
            ],
            self::PRO => [
                // All Free + Basic
                'basic_tracking',
                'standard_quotes',
                'email_notifications',
                'checkout_shipping',
                'order_creation',
                'sms_notifications',
                'priority_support',
                'bulk_orders_10',
                'advanced_tracking',
                'delivery_history',
                // Pro tier features
                'bulk_orders_unlimited',
                'advanced_analytics',
                'custom_branding',
                'api_access',
                'webhook_management',
                'white_label',
                'dedicated_support',
                'custom_reports',
                'priority_processing',
            ],
        ];

        return in_array($feature, $tier_features[$tier] ?? [], true);
    }

    /**
     * Get all features for a tier
     */
    public static function get_tier_features(string $tier): array
    {
        $tier_features = [
            self::FREE => [
                'basic_tracking' => __('Basic delivery tracking', 'zanafleet'),
                'standard_quotes' => __('Standard delivery quotes', 'zanafleet'),
                'email_notifications' => __('Email notifications', 'zanafleet'),
                'checkout_shipping' => __('Checkout shipping integration', 'zanafleet'),
                'order_creation' => __('Automatic order creation', 'zanafleet'),
            ],
            self::BASIC => [
                'sms_notifications' => __('SMS notifications', 'zanafleet'),
                'priority_support' => __('Priority support', 'zanafleet'),
                'bulk_orders_10' => __('Bulk orders (up to 10)', 'zanafleet'),
                'advanced_tracking' => __('Advanced tracking updates', 'zanafleet'),
                'delivery_history' => __('Delivery history (30 days)', 'zanafleet'),
            ],
            self::PRO => [
                'bulk_orders_unlimited' => __('Unlimited bulk orders', 'zanafleet'),
                'advanced_analytics' => __('Advanced analytics', 'zanafleet'),
                'custom_branding' => __('Custom branding', 'zanafleet'),
                'api_access' => __('API access', 'zanafleet'),
                'webhook_management' => __('Webhook management', 'zanafleet'),
                'white_label' => __('White label option', 'zanafleet'),
                'dedicated_support' => __('Dedicated support', 'zanafleet'),
                'custom_reports' => __('Custom reports', 'zanafleet'),
                'priority_processing' => __('Priority order processing', 'zanafleet'),
            ],
        ];

        $features = [];
        
        // Include all lower tier features
        $tiers_order = [self::FREE, self::BASIC, self::PRO];
        $include_tiers = array_slice($tiers_order, 0, array_search($tier, $tiers_order) + 1);
        
        foreach ($include_tiers as $t) {
            $features = array_merge($features, $tier_features[$t] ?? []);
        }

        return $features;
    }

    /**
     * Execute callback if feature is allowed
     * Returns fallback if not allowed
     */
    public static function execute_if_allowed(
        string $feature, 
        callable $callback, 
        $fallback = null
    ) {
        if (self::can($feature)) {
            return call_user_func($callback);
        }

        if (is_callable($fallback)) {
            return call_user_func($fallback);
        }

        return [
            'error' => 'feature_not_available',
            'feature' => $feature,
            'current_tier' => self::get_tier(),
            'current_tier_display' => self::get_tier_display(),
        ];
    }

    /**
     * Filter UI items based on tier
     * Removes Pro features from UI for lower tiers
     * PRESERVES DATA - only affects display
     */
    public static function filter_ui(array $items): array
    {
        $tier = self::get_tier();
        
        if ($tier === self::PRO) {
            return $items;
        }

        return array_filter($items, function($item) {
            $feature = $item['feature'] ?? '';
            if (empty($feature)) {
                return true; // Keep items without feature requirement
            }
            return self::can($feature);
        });
    }

    /**
     * Get upgrade prompt for feature
     */
    public static function get_upgrade_prompt(string $feature): array
    {
        $tier = self::get_tier();
        
        $upgrades = [
            self::FREE => [
                'required_tier' => self::BASIC,
                'upgrade_url' => 'https://zanafleet.com/upgrade/basic',
                'message' => __('Upgrade to Basic for this feature', 'zanafleet'),
            ],
            self::BASIC => [
                'required_tier' => self::PRO,
                'upgrade_url' => 'https://zanafleet.com/upgrade/pro',
                'message' => __('Upgrade to Pro for this feature', 'zanafleet'),
            ],
        ];

        return $upgrades[$tier] ?? [
            'required_tier' => self::PRO,
            'upgrade_url' => 'https://zanafleet.com/upgrade',
            'message' => __('Upgrade for this feature', 'zanafleet'),
        ];
    }

    /**
     * Check if tier allows bulk processing limit
     */
    public static function get_bulk_limit(): int
    {
        $tier = self::get_tier();
        
        $limits = [
            self::FREE => 0,
            self::BASIC => 10,
            self::PRO => -1, // unlimited
        ];

        return $limits[$tier] ?? 0;
    }

    /**
     * Check if current tier allows API access
     */
    public static function can_access_api(): bool
    {
        return self::can('api_access');
    }

    /**
     * Check if current tier allows webhooks
     */
    public static function can_manage_webhooks(): bool
    {
        return self::can('webhook_management');
    }

    /**
     * Add tier info to API responses
     */
    public static function add_tier_info(array $response): array
    {
        $response['_license'] = [
            'tier' => self::get_tier(),
            'tier_display' => self::get_tier_display(),
            'features' => self::get_tier_features(self::get_tier()),
        ];
        
        return $response;
    }
}
