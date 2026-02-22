<?php
/**
 * TierGate License Tier Gating Unit Tests
 * 
 * Tests for ZanaFleet License Tier Gate including:
 * - Tier constants and validation
 * - Feature permission checks for Free/Basic/Pro
 * - Edge cases: invalid tiers, missing settings
 * - execute_if_allowed with callbacks and fallbacks
 * - UI filtering based on tier
 * - Upgrade prompts
 * - Bulk limits per tier
 * - API and webhook permissions
 * 
 * @package ZanaFleet\Tests\Unit\Licensing
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Licensing;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\Licensing\TierGate;

/**
 * Mock WordPress functions for testing
 */
if (!function_exists('get_option')) {
    function get_option($option, $default = false) {
        return \ZanaFleet\Tests\MockWP::get_option($option, $default);
    }
}

if (!function_exists('__')) {
    function __($text, $domain = 'default') {
        return $text;
    }
}

/**
 * MockWP - WordPress function mocks for testing
 */
class MockWP
{
    private static array $options = [];
    
    public static function set_option($option, $value): void
    {
        self::$options[$option] = $value;
    }
    
    public static function get_option($option, $default = false)
    {
        return self::$options[$option] ?? $default;
    }
    
    public static function reset(): void
    {
        self::$options = [];
    }
}

/**
 * Test suite for TierGate license tier gating
 * @covers TierGate
 */
class TierGateTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        MockWP::reset();
    }
    
    // =========================================================================
    // TIER CONSTANTS TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function tierConstantsAreDefined(): void
    {
        $this->assertEquals('free', TierGate::FREE);
        $this->assertEquals('basic', TierGate::BASIC);
        $this->assertEquals('pro', TierGate::PRO);
    }
    
    /**
     * @test
     */
    public function tierConstantsAreStrings(): void
    {
        $this->assertIsString(TierGate::FREE);
        $this->assertIsString(TierGate::BASIC);
        $this->assertIsString(TierGate::PRO);
    }
    
    /**
     * @test
     */
    public function tierConstantsAreDistinct(): void
    {
        $this->assertNotEquals(TierGate::FREE, TierGate::BASIC);
        $this->assertNotEquals(TierGate::BASIC, TierGate::PRO);
        $this->assertNotEquals(TierGate::FREE, TierGate::PRO);
    }
    
    // =========================================================================
    // GET_TIER() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getTierReturnsFreeWhenNoSettings(): void
    {
        MockWP::reset();
        $this->assertEquals('free', TierGate::get_tier());
    }
    
    /**
     * @test
     */
    public function getTierReturnsFreeWhenEmptySettings(): void
    {
        MockWP::set_option('zanafleet_settings', []);
        $this->assertEquals('free', TierGate::get_tier());
    }
    
    /**
     * @test
     */
    public function getTierReturnsFreeWhenNoLicenseKey(): void
    {
        MockWP::set_option('zanafleet_settings', ['api_key' => 'test_key']);
        $this->assertEquals('free', TierGate::get_tier());
    }
    
    /**
     * @test
     */
    public function getTierReturnsFreeTier(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertEquals('free', TierGate::get_tier());
    }
    
    /**
     * @test
     */
    public function getTierReturnsBasicTier(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertEquals('basic', TierGate::get_tier());
    }
    
    /**
     * @test
     */
    public function getTierReturnsProTier(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertEquals('pro', TierGate::get_tier());
    }
    
    /**
     * @test
     */
    public function getTierHandlesInvalidTierGracefully(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'invalid_tier']);
        $this->assertEquals('free', TierGate::get_tier());
    }
    
    /**
     * @test
     */
    public function getTierHandlesNumericTier(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 1]);
        $this->assertEquals('free', TierGate::get_tier());
    }
    
    // =========================================================================
    // GET_TIER_DISPLAY() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getTierDisplayReturnsFreeForFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertEquals('Free', TierGate::get_tier_display());
    }
    
    /**
     * @test
     */
    public function getTierDisplayReturnsBasicForBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertEquals('Basic', TierGate::get_tier_display());
    }
    
    /**
     * @test
     */
    public function getTierDisplayReturnsProForPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertEquals('Pro', TierGate::get_tier_display());
    }
    
    /**
     * @test
     */
    public function getTierDisplayDefaultsToFreeForInvalid(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'invalid']);
        $this->assertEquals('Free', TierGate::get_tier_display());
    }
    
    // =========================================================================
    // CAN() TESTS - FREE TIER FEATURES
    // =========================================================================
    
    /**
     * @test
     */
    public function canBasicTrackingOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertTrue(TierGate::can('basic_tracking'));
    }
    
    /**
     * @test
     */
    public function canStandardQuotesOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertTrue(TierGate::can('standard_quotes'));
    }
    
    /**
     * @test
     */
    public function canEmailNotificationsOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertTrue(TierGate::can('email_notifications'));
    }
    
    /**
     * @test
     */
    public function canCheckoutShippingOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertTrue(TierGate::can('checkout_shipping'));
    }
    
    /**
     * @test
     */
    public function canOrderCreationOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertTrue(TierGate::can('order_creation'));
    }
    
    // =========================================================================
    // CAN() TESTS - BASIC TIER FEATURES
    // =========================================================================
    
    /**
     * @test
     */
    public function canSmsNotificationsOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertTrue(TierGate::can('sms_notifications'));
    }
    
    /**
     * @test
     */
    public function canPrioritySupportOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertTrue(TierGate::can('priority_support'));
    }
    
    /**
     * @test
     */
    public function canBulkOrders10OnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertTrue(TierGate::can('bulk_orders_10'));
    }
    
    /**
     * @test
     */
    public function canAdvancedTrackingOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertTrue(TierGate::can('advanced_tracking'));
    }
    
    /**
     * @test
     */
    public function canDeliveryHistoryOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertTrue(TierGate::can('delivery_history'));
    }
    
    // =========================================================================
    // CAN() TESTS - PRO TIER FEATURES
    // =========================================================================
    
    /**
     * @test
     */
    public function canBulkOrdersUnlimitedOnPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can('bulk_orders_unlimited'));
    }
    
    /**
     * @test
     */
    public function canAdvancedAnalyticsOnPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can('advanced_analytics'));
    }
    
    /**
     * @test
     */
    public function canCustomBrandingOnPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can('custom_branding'));
    }
    
    /**
     * @test
     */
    public function canApiAccessOnPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can('api_access'));
    }
    
    /**
     * @test
     */
    public function canWebhookManagementOnPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can('webhook_management'));
    }
    
    /**
     * @test
     */
    public function canWhiteLabelOnPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can('white_label'));
    }
    
    // =========================================================================
    // CAN() TESTS - EDGE CASES
    // =========================================================================
    
    /**
     * @test
     */
    public function cannotSmsOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertFalse(TierGate::can('sms_notifications'));
    }
    
    /**
     * @test
     */
    public function cannotApiAccessOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertFalse(TierGate::can('api_access'));
    }
    
    /**
     * @test
     */
    public function cannotApiAccessOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertFalse(TierGate::can('api_access'));
    }
    
    /**
     * @test
     */
    public function cannotWebhookManagementOnFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertFalse(TierGate::can('webhook_management'));
    }
    
    /**
     * @test
     */
    public function cannotWebhookManagementOnBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertFalse(TierGate::can('webhook_management'));
    }
    
    /**
     * @test
     */
    public function canReturnsFalseForUnknownFeature(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertFalse(TierGate::can('nonexistent_feature_xyz'));
    }
    
    /**
     * @test
     */
    public function canReturnsFalseForEmptyFeature(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertFalse(TierGate::can(''));
    }
    
    // =========================================================================
    // GET_TIER_FEATURES() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getTierFeaturesReturnsArray(): void
    {
        $features = TierGate::get_tier_features('free');
        $this->assertIsArray($features);
    }
    
    /**
     * @test
     */
    public function getTierFeaturesFreeHas5Features(): void
    {
        $features = TierGate::get_tier_features('free');
        $this->assertCount(5, $features);
    }
    
    /**
     * @test
     */
    public function getTierFeaturesBasicIncludesFreeFeatures(): void
    {
        $features = TierGate::get_tier_features('basic');
        $this->assertArrayHasKey('basic_tracking', $features);
        $this->assertArrayHasKey('standard_quotes', $features);
        $this->assertArrayHasKey('email_notifications', $features);
    }
    
    /**
     * @test
     */
    public function getTierFeaturesProIncludesAllFeatures(): void
    {
        $features = TierGate::get_tier_features('pro');
        $this->assertArrayHasKey('basic_tracking', $features);
        $this->assertArrayHasKey('sms_notifications', $features);
        $this->assertArrayHasKey('api_access', $features);
    }
    
    /**
     * @test
     */
    public function getTierFeaturesInvalidDefaultsToFree(): void
    {
        $features = TierGate::get_tier_features('invalid');
        $this->assertCount(5, $features);
    }
    
    // =========================================================================
    // EXECUTE_IF_ALLOWED() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function executeIfAllowedCallsCallbackWhenAllowed(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $called = false;
        
        $result = TierGate::execute_if_allowed(
            'api_access',
            function() use (&$called) {
                $called = true;
                return 'success';
            }
        );
        
        $this->assertTrue($called);
        $this->assertEquals('success', $result);
    }
    
    /**
     * @test
     */
    public function executeIfAllowedReturnsErrorWhenNotAllowed(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $result = TierGate::execute_if_allowed(
            'api_access',
            function() {
                return 'success';
            }
        );
        
        $this->assertIsArray($result);
        $this->assertEquals('feature_not_available', $result['error']);
    }
    
    /**
     * @test
     */
    public function executeIfAllowedUsesFallbackWhenNotAllowed(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $result = TierGate::execute_if_allowed(
            'api_access',
            function() { return 'success'; },
            function() { return 'fallback_called'; }
        );
        
        $this->assertEquals('fallback_called', $result);
    }
    
    /**
     * @test
     */
    public function executeIfAllowedPassesArgumentsToCallback(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $result = TierGate::execute_if_allowed(
            'api_access',
            function($arg1, $arg2) {
                return $arg1 . $arg2;
            },
            null,
            ['Hello', 'World']
        );
        
        $this->assertEquals('HelloWorld', $result);
    }
    
    // =========================================================================
    // FILTER_UI() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function filterUiReturnsAllItemsForPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $items = [
            ['id' => 1, 'feature' => 'basic_tracking'],
            ['id' => 2, 'feature' => 'api_access'],
            ['id' => 3],
        ];
        
        $result = TierGate::filter_ui($items);
        
        $this->assertCount(3, $result);
    }
    
    /**
     * @test
     */
    public function filterUiRemovesProFeaturesForFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $items = [
            ['id' => 1, 'feature' => 'basic_tracking'],
            ['id' => 2, 'feature' => 'api_access'],
            ['id' => 3, 'feature' => 'sms_notifications'],
        ];
        
        $result = TierGate::filter_ui($items);
        
        $this->assertCount(1, $result);
        $this->assertEquals(1, $result[0]['id']);
    }
    
    /**
     * @test
     */
    public function filterUiKeepsItemsWithoutFeature(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $items = [
            ['id' => 1],
            ['id' => 2, 'feature' => 'basic_tracking'],
        ];
        
        $result = TierGate::filter_ui($items);
        
        $this->assertCount(2, $result);
    }
    
    /**
     * @test
     */
    public function filterUiHandlesEmptyArray(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $result = TierGate::filter_ui([]);
        
        $this->assertCount(0, $result);
    }
    
    // =========================================================================
    // GET_UPGRADE_PROMPT() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getUpgradePromptForFreeReturnsBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $prompt = TierGate::get_upgrade_prompt('sms_notifications');
        
        $this->assertEquals('basic', $prompt['required_tier']);
        $this->assertStringContainsString('basic', $prompt['upgrade_url']);
    }
    
    /**
     * @test
     */
    public function getUpgradePromptForBasicReturnsPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        
        $prompt = TierGate::get_upgrade_prompt('api_access');
        
        $this->assertEquals('pro', $prompt['required_tier']);
        $this->assertStringContainsString('pro', $prompt['upgrade_url']);
    }
    
    /**
     * @test
     */
    public function getUpgradePromptForProReturnsDefault(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $prompt = TierGate::get_upgrade_prompt('api_access');
        
        $this->assertEquals('pro', $prompt['required_tier']);
    }
    
    // =========================================================================
    // GET_BULK_LIMIT() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function getBulkLimitReturns0ForFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertEquals(0, TierGate::get_bulk_limit());
    }
    
    /**
     * @test
     */
    public function getBulkLimitReturns10ForBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertEquals(10, TierGate::get_bulk_limit());
    }
    
    /**
     * @test
     */
    public function getBulkLimitReturnsUnlimitedForPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertEquals(-1, TierGate::get_bulk_limit());
    }
    
    /**
     * @test
     */
    public function getBulkLimitDefaultsTo0ForInvalid(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'invalid']);
        $this->assertEquals(0, TierGate::get_bulk_limit());
    }
    
    // =========================================================================
    // CAN_ACCESS_API() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function canAccessApiReturnsFalseForFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertFalse(TierGate::can_access_api());
    }
    
    /**
     * @test
     */
    public function canAccessApiReturnsFalseForBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertFalse(TierGate::can_access_api());
    }
    
    /**
     * @test
     */
    public function canAccessApiReturnsTrueForPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can_access_api());
    }
    
    // =========================================================================
    // CAN_MANAGE_WEBHOOKS() TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function canManageWebhooksReturnsFalseForFree(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        $this->assertFalse(TierGate::can_manage_webhooks());
    }
    
    /**
     * @test
     */
    public function canManageWebhooksReturnsFalseForBasic(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'basic']);
        $this->assertFalse(TierGate::can_manage_webhooks());
    }
    
    /**
     * @test
     */
    public function canManageWebhooksReturnsTrueForPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        $this->assertTrue(TierGate::can_manage_webhooks());
    }
    
    // =========================================================================
    // EDGE CASE TESTS
    // =========================================================================
    
    /**
     * @test
     */
    public function tierFeaturesAreSortedByHierarchy(): void
    {
        $freeFeatures = TierGate::get_tier_features('free');
        $basicFeatures = TierGate::get_tier_features('basic');
        $proFeatures = TierGate::get_tier_features('pro');
        
        $this->assertLessThan(count($basicFeatures), count($freeFeatures));
        $this->assertLessThan(count($proFeatures), count($basicFeatures));
    }
    
    /**
     * @test
     */
    public function allProFeaturesAreAccessibleOnPro(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'pro']);
        
        $proFeatures = [
            'bulk_orders_unlimited',
            'advanced_analytics',
            'custom_branding',
            'api_access',
            'webhook_management',
            'white_label',
            'dedicated_support',
            'custom_reports',
            'priority_processing',
        ];
        
        foreach ($proFeatures as $feature) {
            $this->assertTrue(
                TierGate::can($feature),
                "Feature '$feature' should be available on Pro tier"
            );
        }
    }
    
    /**
     * @test
     */
    public function freeTierHasAllCoreDeliveryFeatures(): void
    {
        MockWP::set_option('zanafleet_settings', ['license_tier' => 'free']);
        
        $coreFeatures = [
            'basic_tracking',
            'standard_quotes',
            'email_notifications',
            'checkout_shipping',
            'order_creation',
        ];
        
        foreach ($coreFeatures as $feature) {
            $this->assertTrue(
                TierGate::can($feature),
                "Core feature '$feature' should always be available"
            );
        }
    }
}