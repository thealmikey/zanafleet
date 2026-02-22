<?php
/**
 * ZanaFleet Delivery Tracker Widget
 * 
 * Elementor widget for tracking deliveries
 * Consumes REST API endpoints (NOT direct SaaS)
 */

namespace ZanaFleet\Elementor;

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;

defined('ABSPATH') || exit;

/**
 * Delivery Tracker Widget
 * 
 * Displays delivery status timeline
 * Requires: Elementor Pro (for full features), works with free version
 */
class DeliveryTrackerWidget extends Widget_Base
{
    use WidgetBase;

    /**
     * Get widget name
     */
    public function get_name(): string
    {
        return 'zanafleet_tracker';
    }

    /**
     * Get widget title
     */
    public function get_title(): string
    {
        return __('ZanaFleet Tracker', 'zanafleet');
    }

    /**
     * Get widget icon
     */
    public function get_icon(): string
    {
        return 'eicon-delivery';
    }

    /**
     * Get widget categories
     */
    public function get_categories(): array
    {
        return ['woocommerce', 'general'];
    }

    /**
     * Get widget keywords
     */
    public function get_keywords(): array
    {
        return ['delivery', 'tracking', 'shipment', 'zanafleet'];
    }

    /**
     * Register widget controls
     */
    protected function register_controls(): void
    {
        // Content Section
        $this->start_controls_section(
            'section_content',
            [
                'label' => __('Content', 'zanafleet'),
                'tab' => Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'order_id_source',
            [
                'label' => __('Order ID Source', 'zanafleet'),
                'type' => Controls_Manager::SELECT,
                'default' => 'current',
                'options' => [
                    'current' => __('Current Order', 'zanafleet'),
                    'custom' => __('Custom Input', 'zanafleet'),
                    'url' => __('URL Parameter', 'zanafleet'),
                ],
            ]
        );

        $this->add_control(
            'custom_order_id',
            [
                'label' => __('Custom Order ID', 'zanafleet'),
                'type' => Controls_Manager::TEXT,
                'condition' => [
                    'order_id_source' => 'custom',
                ],
            ]
        );

        $this->add_control(
            'url_param_name',
            [
                'label' => __('URL Parameter Name', 'zanafleet'),
                'type' => Controls_Manager::TEXT,
                'default' => 'order_id',
                'condition' => [
                    'order_id_source' => 'url',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Section
        $this->start_controls_section(
            'section_style',
            [
                'label' => __('Style', 'zanafleet'),
                'tab' => Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'primary_color',
            [
                'label' => __('Primary Color', 'zanafleet'),
                'type' => Controls_Manager::COLOR,
                'default' => '#4F46E5',
            ]
        );

        $this->add_group_control(
            Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('Title Typography', 'zanafleet'),
                'selector' => '{{WRAPPER}} .zanafleet-tracker-title',
            ]
        );

        $this->end_controls_section();
    }

    /**
     * Render widget output
     */
    protected function render(): void
    {
        // Check Elementor
        if (!self::is_elementor_active()) {
            $this->render_fallback();
            return;
        }

        // Check API configured
        if (!$this->is_api_configured()) {
            $this->render_error(__('ZanaFleet is not configured. Please add your API credentials.', 'zanafleet'));
            return;
        }

        $settings = $this->get_settings_for_display();
        $order_id = $this->get_order_id($settings);

        if (!$order_id) {
            $this->render_error(__('No order ID found.', 'zanafleet'));
            return;
        }

        // Fetch delivery data from REST API (NOT direct SaaS)
        $data = $this->fetch_from_api('deliveries/external/' . $order_id);

        if (empty($data['data'])) {
            $this->render_no_delivery();
            return;
        }

        $delivery = $data['data'];
        $this->render_tracker($delivery, $settings);
    }

    /**
     * Get order ID based on source
     */
    private function get_order_id(array $settings): ?string
    {
        $source = $settings['order_id_source'] ?? 'current';

        switch ($source) {
            case 'current':
                if (is_singular('shop_order')) {
                    return (string) get_the_ID();
                }
                return null;

            case 'custom':
                return $settings['custom_order_id'] ?? null;

            case 'url':
                $param = $settings['url_param_name'] ?? 'order_id';
                return isset($_GET[$param]) ? sanitize_text_field($_GET[$param]) : null;

            default:
                return null;
        }
    }

    /**
     * Render no delivery message
     */
    private function render_no_delivery(): void
    {
        ?>
        <div class="zanafleet-tracker-empty">
            <p><?php esc_html_e('No delivery found for this order.', 'zanafleet'); ?></p>
        </div>
        <?php
    }

    /**
     * Render delivery tracker
     */
    private function render_tracker(array $delivery, array $settings): void
    {
        $status = $delivery['status'] ?? 'unknown';
        $status_label = $this->get_status_label($status);
        $primary_color = $settings['primary_color'] ?? '#4F46E5';

        ?>
        <div class="zanafleet-tracker" style="--primary-color: <?php echo esc_attr($primary_color); ?>">
            <h3 class="zanafleet-tracker-title">
                <?php esc_html_e('Delivery Status', 'zanafleet'); ?>
            </h3>
            
            <div class="zanafleet-tracker-status">
                <span class="zanafleet-status-badge zanafleet-status-<?php echo esc_attr($status); ?>">
                    <?php echo esc_html($status_label); ?>
                </span>
            </div>

            <?php if (!empty($delivery['timeline'])): ?>
            <div class="zanafleet-tracker-timeline">
                <?php foreach ($delivery['timeline'] as $event): ?>
                <div class="zanafleet-timeline-item zanafleet-timeline-<?php echo esc_attr($event['status']); ?>">
                    <div class="zanafleet-timeline-marker"></div>
                    <div class="zanafleet-timeline-content">
                        <div class="zanafleet-timeline-title"><?php echo esc_html($event['label']); ?></div>
                        <div class="zanafleet-timeline-time"><?php echo esc_html($event['time'] ?? ''); ?></div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <?php if (!empty($delivery['eta'])): ?>
            <div class="zanafleet-tracker-eta">
                <strong><?php esc_html_e('Estimated Delivery:', 'zanafleet'); ?></strong>
                <?php echo esc_html($delivery['eta']); ?>
            </div>
            <?php endif; ?>
        </div>

        <style>
            .zanafleet-tracker {
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #fff;
            }
            .zanafleet-tracker-title {
                margin: 0 0 16px;
                font-size: 18px;
            }
            .zanafleet-status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
            }
            .zanafleet-status-pending { background: #fef3c7; color: #92400e; }
            .zanafleet-status-assigned { background: #dbeafe; color: #1e40af; }
            .zanafleet-status-picked_up { background: #d1fae5; color: #065f46; }
            .zanafleet-status-in_transit { background: #e0e7ff; color: #3730a3; }
            .zanafleet-status-delivered { background: #d1fae5; color: #065f46; }
            .zanafleet-status-failed { background: #fee2e2; color: #991b1b; }
        </style>
        <?php
    }

    /**
     * Get human-readable status label
     */
    private function get_status_label(string $status): string
    {
        $labels = [
            'pending' => __('Pending', 'zanafleet'),
            'assigned' => __('Assigned', 'zanafleet'),
            'picked_up' => __('Picked Up', 'zanafleet'),
            'in_transit' => __('In Transit', 'zanafleet'),
            'delivered' => __('Delivered', 'zanafleet'),
            'failed' => __('Delivery Failed', 'zanafleet'),
            'cancelled' => __('Cancelled', 'zanafleet'),
        ];

        return $labels[$status] ?? ucfirst($status);
    }
}
