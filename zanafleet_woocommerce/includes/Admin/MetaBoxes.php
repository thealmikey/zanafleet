<?php

namespace ZanaFleet\Admin;

defined('ABSPATH') || exit;

/**
 * Order Meta Boxes
 */
class MetaBoxes
{
    public function __construct()
    {
        add_action('add_meta_boxes', [$this, 'add_meta_boxes']);
        add_action('woocommerce_after_order_itemmeta', [$this, 'order_item_meta'], 10, 3);
    }

    /**
     * Add meta boxes
     */
    public function add_meta_boxes(): void
    {
        add_meta_box(
            'zanafleet_delivery_details',
            __('ZanaFleet Delivery', 'zanafleet'),
            [$this, 'render_delivery_meta_box'],
            'shop_order',
            'side',
            'default'
        );
    }

    /**
     * Render delivery meta box
     */
    public function render_delivery_meta_box($post): void
    {
        $order = wc_get_order($post->ID);
        if (!$order) {
            return;
        }

        $delivery_id = $order->get_meta('_zanafleet_delivery_id');
        $tracking_url = $order->get_meta('_zanafleet_tracking_url');
        $rider_name = $order->get_meta('_zanafleet_rider_name');
        $rider_phone = $order->get_meta('_zanafleet_rider_phone');
        $status = $order->get_meta('_zanafleet_status');

        echo '<div class="zanafleet-admin-box">';
        
        if ($delivery_id) {
            echo '<p><strong>' . __('Delivery ID:', 'zanafleet') . '</strong> ';
            echo esc_html($delivery_id) . '</p>';

            if ($tracking_url) {
                echo '<p><a href="' . esc_url($tracking_url) . '" target="_blank"';
                echo ' class="button button-secondary">';
                echo __('Track Delivery', 'zanafleet') . '</a></p>';
            }

            if ($rider_name) {
                echo '<p><strong>' . __('Rider:', 'zanafleet') . '</strong> ';
                echo esc_html($rider_name);
                if ($rider_phone) {
                    echo ' (' . esc_html($rider_phone) . ')';
                }
                echo '</p>';
            }

            if ($status) {
                echo '<p><strong>' . __('Status:', 'zanafleet') . '</strong> ';
                echo '<span class="zf-status zf-status-' . esc_attr(strtolower($status)) . '">';
                echo esc_html(ucfirst($status)) . '</span></p>';
            }
        } else {
            echo '<p>' . __('No ZanaFleet delivery created yet.', 'zanafleet') . '</p>';
            
            // Allow manual creation
            echo '<button type="button" class="button" id="zanafleet-create-delivery">';
            echo __('Create Delivery', 'zanafleet') . '</button>';
            
            echo '<script>';
            echo "jQuery('#zanafleet-create-delivery').on('click', function() {";
            echo "var btn = jQuery(this);";
            echo "btn.prop('disabled', true).text('Creating...');";
            echo "jQuery.post(ajaxurl, {";
            echo "action: 'zanafleet_create_delivery',";
            echo "order_id: {$order->get_id()},";
            echo "nonce: '" . wp_create_nonce('zanafleet_nonce') . "'";
            echo "}, function(response) {";
            echo "if(response.success) {";
            echo "location.reload();";
            echo "} else {";
            echo "alert(response.data);";
            echo "btn.prop('disabled', false).text('Create Delivery');";
            echo "}";
            echo "});";
            echo "});";
            echo '</script>';
        }

        echo '</div>';
        
        // Add some basic styling
        echo '<style>';
        echo '.zanafleet-admin-box p { margin: 0 0 8px; }';
        echo '.zf-status { padding: 2px 8px; border-radius: 3px; font-size: 12px; }';
        echo '.zf-status-assigned { background: #e7f7e7; color: #2e7d32; }';
        echo '.zf-status-pickedup, .zf-status-intransit { background: #fff3e0; color: #ef6c00; }';
        echo '.zf-status-delivered { background: #e8f5e9; color: #1b5e20; }';
        echo '.zf-status-failed, .zf-status-cancelled { background: #ffebee; color: #c62828; }';
        echo '</style>';
    }

    /**
     * Order item meta
     */
    public function order_item_meta($item_id, $item, $order): void
    {
        // Could add item-specific delivery info here
    }
}

new MetaBoxes();