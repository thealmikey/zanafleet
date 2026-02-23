<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Elementor\DeliveryTrackerWidget;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 20: Elementor Widgets
 * 
 * As a store owner,
 * I want to use Elementor widgets for delivery tracking,
 * So that I can customize the tracking page.
 */
class UserStory20_ElementorWidgetsTest extends TestCase
{
    public function testDeliveryTrackerWidgetRenders(): void
    {
        $widget = new DeliveryTrackerWidget();
        
        $output = $widget->render([
            'delivery_id' => 'DEL-12345',
            'show_timeline' => true,
            'show_map' => true,
        ]);

        $this->assertStringContainsString('DEL-12345', $output);
    }

    public function testWidgetRespectsAPIResponse(): void
    {
        $widget = new DeliveryTrackerWidget();
        
        // Mock API response
        $deliveryData = [
            'id' => 'DEL-WIDGET-001',
            'status' => 'IN_TRANSIT',
            'estimated_delivery' => '2024-01-15T14:00:00Z',
            'timeline' => [
                ['status' => 'CREATED', 'timestamp' => '2024-01-14T10:00:00Z'],
                ['status' => 'ASSIGNED', 'timestamp' => '2024-01-14T11:00:00Z'],
                ['status' => 'PICKED_UP', 'timestamp' => '2024-01-15T09:00:00Z'],
            ],
        ];

        $output = $widget->render($deliveryData);

        $this->assertStringContainsString('IN_TRANSIT', $output);
    }

    public function testWidgetShowsErrorOnInvalidDelivery(): void
    {
        $widget = new DeliveryTrackerWidget();
        
        $output = $widget->render([
            'delivery_id' => 'INVALID-ID',
            'show_timeline' => true,
        ]);

        $this->assertStringContainsString('error', strtolower($output));
    }

    public function testWidgetCanBeCustomized(): void
    {
        $widget = new DeliveryTrackerWidget();
        
        $settings = [
            'primary_color' => '#FF5722',
            'show_status_icon' => true,
            'timeline_style' => 'vertical',
            'map_provider' => 'google',
        ];

        $widget->setSettings($settings);

        $this->assertEquals('#FF5722', $widget->getSetting('primary_color'));
    }

    public function testWidgetIsResponsive(): void
    {
        $widget = new DeliveryTrackerWidget();
        
        $output = $widget->render([
            'delivery_id' => 'DEL-RESP-001',
            'mobile_layout' => true,
        ]);

        // Should have responsive classes
        $this->assertStringContainsString('zanafleet-widget', $output);
    }
}
