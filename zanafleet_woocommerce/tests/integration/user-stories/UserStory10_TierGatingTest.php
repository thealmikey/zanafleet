<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Licensing\TierGate;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 10: Tier-Based Feature Access
 * 
 * As a store owner,
 * I want features to be gated by my license tier,
 * So that I can upgrade to access more features.
 */
class UserStory10_TierGatingTest extends TestCase
{
    public function testFreeTierHasLimitedFeatures(): void
    {
        $tierGate = new TierGate(['license_type' => 'free']);

        $this->assertTrue($tierGate->canAccess('basic_shipping'));
        $this->assertFalse($tierGate->canAccess('bulk_processing'));
        $this->assertFalse($tierGate->canAccess('advanced_tracking'));
        $this->assertFalse($tierGate->canAccess('priority_support'));
        $this->assertFalse($tierGate->canAccess('custom_branding'));
    }

    public function testBasicTierHasMoreFeatures(): void
    {
        $tierGate = new TierGate(['license_type' => 'basic']);

        $this->assertTrue($tierGate->canAccess('basic_shipping'));
        $this->assertTrue($tierGate->canAccess('bulk_processing', ['limit' => 50]));
        $this->assertTrue($tierGate->canAccess('advanced_tracking'));
        $this->assertFalse($tierGate->canAccess('priority_support'));
        $this->assertFalse($tierGate->canAccess('custom_branding'));
    }

    public function testProTierHasAllFeatures(): void
    {
        $tierGate = new TierGate(['license_type' => 'pro']);

        $this->assertTrue($tierGate->canAccess('basic_shipping'));
        $this->assertTrue($tierGate->canAccess('bulk_processing', ['limit' => 500]));
        $this->assertTrue($tierGate->canAccess('advanced_tracking'));
        $this->assertTrue($tierGate->canAccess('priority_support'));
        $this->assertTrue($tierGate->canAccess('custom_branding'));
    }

    public function testTierGateEnforcesBulkLimits(): void
    {
        $tierGate = new TierGate(['license_type' => 'basic']);

        // Basic should allow up to 50
        $this->assertTrue($tierGate->canAccess('bulk_processing', ['limit' => 30]));
        $this->assertTrue($tierGate->canAccess('bulk_processing', ['limit' => 50]));
        
        // Should reject over 50
        $this->assertFalse($tierGate->canAccess('bulk_processing', ['limit' => 51]));
    }

    public function testFeatureAccessIsCached(): void
    {
        $tierGate = new TierGate(['license_type' => 'pro']);

        // First call
        $result1 = $tierGate->canAccess('advanced_tracking');
        
        // Second call should be cached
        $result2 = $tierGate->canAccess('advanced_tracking');

        $this->assertEquals($result1, $result2);
    }

    public function testInvalidLicenseFallsBackToFree(): void
    {
        $tierGate = new TierGate(['license_type' => 'invalid']);

        // Should fall back to free tier
        $this->assertTrue($tierGate->canAccess('basic_shipping'));
        $this->assertFalse($tierGate->canAccess('bulk_processing'));
    }
}
