<?php
/**
 * ZanaFleet Elementor Widget Registrar
 * 
 * Registers widgets with Elementor
 * Gracefully handles Elementor not being installed
 */

namespace ZanaFleet\Elementor;

defined('ABSPATH') || exit;

class WidgetRegistrar
{
    /**
     * Initialize widget registration
     */
    public static function init(): void
    {
        // Hook into Elementor
        add_action('elementor/widgets/register', [__CLASS__, 'register_widgets']);
        
        // Register widget categories
        add_action('elementor/elements/categories_registered', [__CLASS__, 'register_categories']);
    }

    /**
     * Register widgets with Elementor
     */
    public static function register_widgets($widgets_manager): void
    {
        // Check Elementor is loaded
        if (!did_action('elementor/loaded')) {
            return;
        }

        // Load widget files
        require_once __DIR__ . '/DeliveryTrackerWidget.php';

        // Register widgets
        $widgets_manager->register(new DeliveryTrackerWidget());
        
        // Note: More widgets can be added here
        // require_once __DIR__ . '/QuoteCalculatorWidget.php';
        // $widgets_manager->register(new QuoteCalculatorWidget());
    }

    /**
     * Register custom widget category
     */
    public static function register_categories($elements_manager): void
    {
        $elements_manager->add_category(
            'zanafleet',
            [
                'title' => __('ZanaFleet', 'zanafleet'),
                'icon' => 'eicon-delivery',
            ]
        );
    }
}

// Initialize when plugin loads
if (!is_admin()) {
    // Frontend - load if Elementor is active
    add_action('wp', function() {
        if (did_action('elementor/loaded')) {
            WidgetRegistrar::init();
        }
    });
} else {
    // Admin - load early
    add_action('elementor/init', [WidgetRegistrar::class, 'init']);
}
