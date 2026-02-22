<?php
/**
 * ZanaFleet Elementor Widget Base
 * 
 * Base class for Elementor widgets
 * Provides graceful fallback if Elementor is not active
 */

namespace ZanaFleet\Elementor;

use ZanaFleet\Licensing\TierGate;

defined('ABSPATH') || exit;

/**
 * Base widget class with common functionality
 */
abstract class WidgetBase
{
    /**
     * Check if Elementor is active
     */
    public static function is_elementor_active(): bool
    {
        return did_action('elementor/loaded');
    }

    /**
     * Render fallback when Elementor is not available
     */
    protected function render_fallback(string $message = ''): void
    {
        ?>
        <div class="zanafleet-elementor-fallback">
            <p>
                <?php if ($message): ?>
                    <?php echo esc_html($message); ?>
                <?php else: ?>
                    <?php esc_html_e('ZanaFleet widgets require Elementor. Please install and activate Elementor.', 'zanafleet'); ?>
                <?php endif; ?>
            </p>
        </div>
        <?php
    }

    /**
     * Render upgrade prompt for tier-gated features
     */
    protected function render_upgrade_prompt(string $feature): void
    {
        $prompt = TierGate::get_upgrade_prompt($feature);
        ?>
        <div class="zanafleet-upgrade-prompt">
            <div class="zanafleet-upgrade-icon">🔒</div>
            <p><?php echo esc_html($prompt['message']); ?></p>
            <a href="<?php echo esc_url($prompt['upgrade_url']); ?>" class="button button-primary" target="_blank">
                <?php esc_html_e('Upgrade Now', 'zanafleet'); ?>
            </a>
        </div>
        <?php
    }

    /**
     * Fetch data from REST API
     */
    protected function fetch_from_api(string $endpoint, array $params = []): ?array
    {
        $url = rest_url('zanafleet/v1/' . $endpoint);
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        $response = wp_remote_get($url, [
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json',
            ],
        ]);

        if (is_wp_error($response)) {
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data;
    }

    /**
     * Check if API is configured
     */
    protected function is_api_configured(): bool
    {
        $settings = get_option('zanafleet_settings', []);
        return !empty($settings['api_key']);
    }

    /**
     * Render error message
     */
    protected function render_error(string $message): void
    {
        ?>
        <div class="zanafleet-error">
            <p><?php echo esc_html($message); ?></p>
        </div>
        <?php
    }

    /**
     * Render loading state
     */
    protected function render_loading(): void
    {
        ?>
        <div class="zanafleet-loading">
            <span class="spinner is-active"></span>
            <p><?php esc_html_e('Loading...', 'zanafleet'); ?></p>
        </div>
        <?php
    }
}
