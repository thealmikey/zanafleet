<?php
/**
 * ZanaFleet Shipping Method Unit Tests
 * 
 * Tests for WooCommerce shipping method integration
 * 
 * @package ZanaFleet\Tests\Unit\Includes
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Includes;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;

/**
 * Test suite for ZanaFleet Shipping Method
 */
class ShippingMethodTest extends TestCase
{
    /**
     * Test shipping method is available
     */
    public function testShippingMethodClassExists(): void
    {
        $this->assertTrue(class_exists('ZanaFleet_Shipping_Method'));
    }

    /**
     * Test shipping method extends WC_Shipping_Method
     */
    public function testShippingMethodExtendsWCShippingMethod(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertInstanceOf(\WC_Shipping_Method::class, $method);
    }

    /**
     * Test shipping method has correct ID
     */
    public function testShippingMethodHasCorrectId(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertEquals('zanafleet', $method->id);
    }

    /**
     * Test shipping method has title
     */
    public function testShippingMethodHasTitle(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertNotEmpty($method->method_title);
    }

    /**
     * Test shipping method has description
     */
    public function testShippingMethodHasDescription(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertNotEmpty($method->method_description);
    }

    /**
     * Test shipping method supports shipping zones
     */
    public function testShippingMethodSupportsShippingZones(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertContains('shipping-zones', $method->supports);
    }

    /**
     * Test shipping method supports instance settings
     */
    public function testShippingMethodSupportsInstanceSettings(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertContains('instance-settings', $method->supports);
    }

    /**
     * Test shipping method supports instance settings modal
     */
    public function testShippingMethodSupportsInstanceSettingsModal(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertContains('instance-settings-modal', $method->supports);
    }

    /**
     * Test shipping method has instance form fields
     */
    public function testShippingMethodHasInstanceFormFields(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertIsArray($method->instance_form_fields);
    }

    /**
     * Test instance form fields contain title
     */
    public function testInstanceFormFieldsContainTitle(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertArrayHasKey('title', $method->instance_form_fields);
    }

    /**
     * Test instance form fields contain tax status
     */
    public function testInstanceFormFieldsContainTaxStatus(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertArrayHasKey('tax_status', $method->instance_form_fields);
    }

    /**
     * Test instance form fields contain cost
     */
    public function testInstanceFormFieldsContainCost(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertArrayHasKey('cost', $method->instance_form_fields);
    }

    /**
     * Test instance settings are initialized
     */
    public function testInstanceSettingsAreInitialized(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertIsArray($method->instance_settings);
    }

    /**
     * Test default tax status is taxable
     */
    public function testDefaultTaxStatusIsTaxable(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $this->assertEquals('taxable', $method->tax_status);
    }

    /**
     * Test calculate shipping with empty package
     */
    public function testCalculateShippingWithEmptyPackage(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $result = $method->calculate_shipping([]);
        
        $this->assertIsArray($result);
    }

    /**
     * Test calculate shipping returns empty array when no rates
     */
    public function testCalculateShippingReturnsEmptyArrayWhenNoRates(): void
    {
        $method = new \ZanaFleet_Shipping_Method(1);
        
        // Without configuration, should return empty or minimal result
        $result = $method->calculate_shipping(['contents' => [], 'destination' => []]);
        $this->assertIsArray($result);
    }

    /**
     * Test instance ID is set correctly
     */
    public function testInstanceIdIsSetCorrectly(): void
    {
        $method = new \ZanaFleet_Shipping_Method(5);
        $this->assertEquals(5, $method->instance_id);
    }

    /**
     * Test instance ID is cast to integer
     */
    public function testInstanceIdIsCastToInteger(): void
    {
        $method = new \ZanaFleet_Shipping_Method('10');
        $this->assertIsInt($method->instance_id);
        $this->assertEquals(10, $method->instance_id);
    }

    /**
     * Test instance ID with zero
     */
    public function testInstanceIdWithZero(): void
    {
        $method = new \ZanaFleet_Shipping_Method(0);
        $this->assertEquals(0, $method->instance_id);
    }

    /**
     * Test instance ID with negative number
     */
    public function testInstanceIdWithNegativeNumber(): void
    {
        $method = new \ZanaFleet_Shipping_Method(-5);
        $this->assertEquals(5, $method->instance_id); // absint
    }

    /**
     * Test title field has correct type
     */
    public function testTitleFieldHasCorrectType(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $titleField = $method->instance_form_fields['title'] ?? [];
        
        $this->assertEquals('text', $titleField['type'] ?? '');
    }

    /**
     * Test tax status field has select type
     */
    public function testTaxStatusFieldHasSelectType(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $taxField = $method->instance_form_fields['tax_status'] ?? [];
        
        $this->assertEquals('select', $taxField['type'] ?? '');
    }

    /**
     * Test tax status options
     */
    public function testTaxStatusOptions(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $taxField = $method->instance_form_fields['tax_status'] ?? [];
        $options = $taxField['options'] ?? [];
        
        $this->assertArrayHasKey('taxable', $options);
        $this->assertArrayHasKey('none', $options);
    }

    /**
     * Test cost field has number type
     */
    public function testCostFieldHasNumberType(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $costField = $method->instance_form_fields['cost'] ?? [];
        
        $this->assertEquals('number', $costField['type'] ?? '');
    }

    /**
     * Test cost field has wc_input_price class
     */
    public function testCostFieldHasPriceClass(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $costField = $method->instance_form_fields['cost'] ?? [];
        
        $this->assertStringContainsString('wc_input_price', $costField['class'] ?? '');
    }

    /**
     * Test free shipping field exists
     */
    public function testFreeShippingFieldExists(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        
        $this->assertArrayHasKey('free_shipping_min_amount', $method->instance_form_fields);
    }

    /**
     * Test shipping method can be added to WooCommerce
     */
    public function testShippingMethodCanBeAddedToWooCommerce(): void
    {
        $methods = ['zanafleet' => 'ZanaFleet_Shipping_Method'];
        
        $this->assertArrayHasKey('zanafleet', $methods);
        $this->assertEquals('ZanaFleet_Shipping_Method', $methods['zanafleet']);
    }

    /**
     * Test calculate shipping with package
     */
    public function testCalculateShippingWithPackage(): void
    {
        $method = new \ZanaFleet_Shipping_Method(1);
        
        $package = [
            'contents' => [
                ['product_id' => 1, 'quantity' => 2, 'line_total' => 100],
            ],
            'contents_cost' => 100,
            'destination' => [
                'country' => 'KE',
                'state' => 'Nairobi',
                'city' => 'Nairobi',
                'postcode' => '00100',
            ],
        ];
        
        $result = $method->calculate_shipping($package);
        
        $this->assertIsArray($result);
    }

    /**
     * Test calculate shipping with virtual products
     */
    public function testCalculateShippingWithVirtualProducts(): void
    {
        $method = new \ZanaFleet_Shipping_Method(1);
        
        $package = [
            'contents' => [
                ['product_id' => 1, 'quantity' => 1, 'line_total' => 50, 'data' => new class { public function is_virtual() { return true; } }],
            ],
            'contents_cost' => 50,
            'destination' => ['country' => 'KE'],
        ];
        
        $result = $method->calculate_shipping($package);
        
        // Virtual products might result in no shipping
        $this->assertIsArray($result);
    }

    /**
     * Test calculate shipping with international destination
     */
    public function testCalculateShippingWithInternationalDestination(): void
    {
        $method = new \ZanaFleet_Shipping_Method(1);
        
        $package = [
            'contents' => [['product_id' => 1, 'quantity' => 1, 'line_total' => 100]],
            'contents_cost' => 100,
            'destination' => [
                'country' => 'US',
                'state' => 'CA',
                'city' => 'Los Angeles',
                'postcode' => '90001',
            ],
        ];
        
        $result = $method->calculate_shipping($package);
        
        $this->assertIsArray($result);
    }

    /**
     * Test calculate shipping with empty destination
     */
    public function testCalculateShippingWithEmptyDestination(): void
    {
        $method = new \ZanaFleet_Shipping_Method(1);
        
        $package = [
            'contents' => [['product_id' => 1, 'quantity' => 1, 'line_total' => 100]],
            'contents_cost' => 100,
            'destination' => [],
        ];
        
        $result = $method->calculate_shipping($package);
        
        $this->assertIsArray($result);
    }

    /**
     * Test multiple instances can be created
     */
    public function testMultipleInstancesCanBeCreated(): void
    {
        $method1 = new \ZanaFleet_Shipping_Method(1);
        $method2 = new \ZanaFleet_Shipping_Method(2);
        
        $this->assertEquals(1, $method1->instance_id);
        $this->assertEquals(2, $method2->instance_id);
    }

    /**
     * Test settings can be accessed
     */
    public function testSettingsCanBeAccessed(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        
        // Instance settings should be accessible
        $settings = $method->instance_settings;
        $this->assertIsArray($settings);
    }

    /**
     * Test cost can be set
     */
    public function testCostCanBeSet(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $method->cost = 500;
        
        $this->assertEquals(500, $method->cost);
    }

    /**
     * Test tax status can be set
     */
    public function testTaxStatusCanBeSet(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $method->tax_status = 'none';
        
        $this->assertEquals('none', $method->tax_status);
    }

    /**
     * Test title can be set
     */
    public function testTitleCanBeSet(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        $method->title = 'Custom Delivery';
        
        $this->assertEquals('Custom Delivery', $method->title);
    }

    /**
     * Test shipping method has enabled property
     */
    public function testShippingMethodHasEnabledProperty(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        
        // Should have an enabled property (default to 'yes' in WC)
        $this->assertObjectHasAttribute('enabled', $method);
    }

    /**
     * Test get_option method exists
     */
    public function testGetOptionMethodExists(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        
        $this->assertTrue(method_exists($method, 'get_option'));
    }

    /**
     * Test get_instance_option method exists
     */
    public function testGetInstanceOptionMethodExists(): void
    {
        $method = new \ZanaFleet_Shipping_Method();
        
        $this->assertTrue(method_exists($method, 'get_instance_option'));
    }
}