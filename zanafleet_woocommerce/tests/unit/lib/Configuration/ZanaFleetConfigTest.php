<?php
/**
 * ZanaFleetConfig Unit Tests
 * 
 * Tests for the ZanaFleet API Configuration model
 * 
 * @package ZanaFleet\Tests\Unit\Configuration
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Configuration;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\Core\Configuration\ZanaFleetConfig;

/**
 * Test suite for ZanaFleetConfig
 */
class ZanaFleetConfigTest extends TestCase
{
    /**
     * Test constructor with valid data
     */
    public function testCanCreateConfigWithValidData(): void
    {
        $config = new ZanaFleetConfig(
            'test_api_key',
            'test_api_secret',
            'sandbox',
            'webhook_secret',
            'biz_123',
            'ws_456',
            30,
            3,
            1000
        );

        $this->assertEquals('test_api_key', $config->getApiKey());
        $this->assertEquals('test_api_secret', $config->getApiSecret());
        $this->assertEquals('sandbox', $config->getEnvironment());
        $this->assertEquals('webhook_secret', $config->getWebhookSecret());
        $this->assertEquals('biz_123', $config->getBusinessId());
        $this->assertEquals('ws_456', $config->getWorkspaceId());
        $this->assertEquals(30, $config->getTimeout());
        $this->assertEquals(3, $config->getRetryAttempts());
        $this->assertEquals(1000, $config->getRetryDelayMs());
    }

    /**
     * Test fromArray with full data
     */
    public function testFromArrayWithFullData(): void
    {
        $data = [
            'api_key' => 'array_api_key',
            'api_secret' => 'array_api_secret',
            'environment' => 'production',
            'webhook_secret' => 'array_webhook',
            'business_id' => 'biz_from_array',
            'workspace_id' => 'ws_from_array',
            'timeout' => 60,
            'retry_attempts' => 5,
            'retry_delay_ms' => 2000,
        ];

        $config = ZanaFleetConfig::fromArray($data);

        $this->assertEquals('array_api_key', $config->getApiKey());
        $this->assertEquals('array_api_secret', $config->getApiSecret());
        $this->assertEquals('production', $config->getEnvironment());
        $this->assertEquals('array_webhook', $config->getWebhookSecret());
        $this->assertEquals('biz_from_array', $config->getBusinessId());
        $this->assertEquals('ws_from_array', $config->getWorkspaceId());
        $this->assertEquals(60, $config->getTimeout());
        $this->assertEquals(5, $config->getRetryAttempts());
        $this->assertEquals(2000, $config->getRetryDelayMs());
    }

    /**
     * Test fromArray with minimal data
     */
    public function testFromArrayWithMinimalData(): void
    {
        $data = [
            'api_key' => 'min_api_key',
            'api_secret' => 'min_api_secret',
        ];

        $config = ZanaFleetConfig::fromArray($data);

        $this->assertEquals('min_api_key', $config->getApiKey());
        $this->assertEquals('min_api_secret', $config->getApiSecret());
        $this->assertEquals('sandbox', $config->getEnvironment()); // default
        $this->assertEquals('', $config->getWebhookSecret()); // default
        $this->assertNull($config->getBusinessId()); // default
        $this->assertNull($config->getWorkspaceId()); // default
        $this->assertEquals(30, $config->getTimeout()); // default
        $this->assertEquals(3, $config->getRetryAttempts()); // default
        $this->assertEquals(1000, $config->getRetryDelayMs()); // default
    }

    /**
     * Test fromArray with empty array
     */
    public function testFromArrayWithEmptyArray(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('API Key is required');
        
        ZanaFleetConfig::fromArray([]);
    }

    /**
     * Test fromArray with missing api_key
     */
    public function testFromArrayWithMissingApiKey(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('API Key is required');
        
        ZanaFleetConfig::fromArray(['api_secret' => 'secret']);
    }

    /**
     * Test fromArray with missing api_secret
     */
    public function testFromArrayWithMissingApiSecret(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('API Secret is required');
        
        ZanaFleetConfig::fromArray(['api_key' => 'key']);
    }

    /**
     * Test getBaseUrl for sandbox
     */
    public function testGetBaseUrlForSandbox(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox');
        
        $this->assertEquals('https://sandbox.api.zanafleet.com', $config->getBaseUrl());
    }

    /**
     * Test getBaseUrl for production
     */
    public function testGetBaseUrlForProduction(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'production');
        
        $this->assertEquals('https://api.zanafleet.com', $config->getBaseUrl());
    }

    /**
     * Test getBaseUrl for unknown environment defaults to sandbox
     */
    public function testGetBaseUrlForUnknownEnvironment(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'unknown');
        
        $this->assertEquals('https://sandbox.api.zanafleet.com', $config->getBaseUrl());
    }

    /**
     * Test isSandbox returns true for sandbox
     */
    public function testIsSandboxReturnsTrueForSandbox(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox');
        
        $this->assertTrue($config->isSandbox());
    }

    /**
     * Test isSandbox returns false for production
     */
    public function testIsSandboxReturnsFalseForProduction(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'production');
        
        $this->assertFalse($config->isSandbox());
    }

    /**
     * Test getHeaders contains required keys
     */
    public function testGetHeadersContainsRequiredKeys(): void
    {
        $config = new ZanaFleetConfig('my_api_key', 'my_api_secret');
        
        $headers = $config->getHeaders();
        
        $this->assertArrayHasKey('Authorization', $headers);
        $this->assertArrayHasKey('Content-Type', $headers);
        $this->assertArrayHasKey('X-Client-Version', $headers);
        $this->assertArrayHasKey('X-Platform', $headers);
    }

    /**
     * Test getHeaders Authorization format
     */
    public function testGetHeadersAuthorizationFormat(): void
    {
        $config = new ZanaFleetConfig('test_key', 'test_secret');
        
        $headers = $config->getHeaders();
        
        $this->assertStringStartsWith('Bearer ', $headers['Authorization']);
        $this->assertStringContainsString('test_key', $headers['Authorization']);
        $this->assertStringContainsString('test_secret', $headers['Authorization']);
    }

    /**
     * Test getHeaders Content-Type
     */
    public function testGetHeadersContentType(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $headers = $config->getHeaders();
        
        $this->assertEquals('application/json', $headers['Content-Type']);
    }

    /**
     * Test getHeaders X-Client-Version
     */
    public function testGetHeadersClientVersion(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $headers = $config->getHeaders();
        
        $this->assertEquals('1.0.0', $headers['X-Client-Version']);
    }

    /**
     * Test getHeaders X-Platform
     */
    public function testGetHeadersPlatform(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $headers = $config->getHeaders();
        
        $this->assertEquals('PHP-SDK', $headers['X-Platform']);
    }

    /**
     * Test constructor requires api_key
     */
    public function testConstructorRequiresApiKey(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('API Key is required');
        
        new ZanaFleetConfig('', 'some_secret');
    }

    /**
     * Test constructor requires api_secret
     */
    public function testConstructorRequiresApiSecret(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('API Secret is required');
        
        new ZanaFleetConfig('some_key', '');
    }

    /**
     * Test constructor with whitespace api_key fails
     */
    public function testConstructorWithWhitespaceApiKeyFails(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        
        new ZanaFleetConfig('   ', 'some_secret');
    }

    /**
     * Test constructor with whitespace api_secret fails
     */
    public function testConstructorWithWhitespaceApiSecretFails(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        
        new ZanaFleetConfig('some_key', '   ');
    }

    /**
     * Test default timeout value
     */
    public function testDefaultTimeoutValue(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $this->assertEquals(30, $config->getTimeout());
    }

    /**
     * Test custom timeout value
     */
    public function testCustomTimeoutValue(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox', null, null, null, 120);
        
        $this->assertEquals(120, $config->getTimeout());
    }

    /**
     * Test timeout is cast to integer
     */
    public function testTimeoutIsCastToInteger(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox', null, null, null, '60');
        
        $this->assertIsInt($config->getTimeout());
        $this->assertEquals(60, $config->getTimeout());
    }

    /**
     * Test default retry attempts
     */
    public function testDefaultRetryAttempts(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $this->assertEquals(3, $config->getRetryAttempts());
    }

    /**
     * Test custom retry attempts
     */
    public function testCustomRetryAttempts(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox', null, null, null, 30, 10);
        
        $this->assertEquals(10, $config->getRetryAttempts());
    }

    /**
     * Test retry attempts is cast to integer
     */
    public function testRetryAttemptsIsCastToInteger(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox', null, null, null, 30, '5');
        
        $this->assertIsInt($config->getRetryAttempts());
        $this->assertEquals(5, $config->getRetryAttempts());
    }

    /**
     * Test default retry delay
     */
    public function testDefaultRetryDelayMs(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $this->assertEquals(1000, $config->getRetryDelayMs());
    }

    /**
     * Test custom retry delay
     */
    public function testCustomRetryDelayMs(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox', null, null, null, 30, 3, 5000);
        
        $this->assertEquals(5000, $config->getRetryDelayMs());
    }

    /**
     * Test retry delay is cast to integer
     */
    public function testRetryDelayMsIsCastToInteger(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox', null, null, null, 30, 3, '500');
        
        $this->assertIsInt($config->getRetryDelayMs());
        $this->assertEquals(500, $config->getRetryDelayMs());
    }

    /**
     * Test environment validation
     */
    public function testEnvironmentValues(): void
    {
        $environments = ['sandbox', 'production', 'staging', 'development', 'test'];
        
        foreach ($environments as $env) {
            $config = new ZanaFleetConfig('key', 'secret', $env);
            $this->assertEquals($env, $config->getEnvironment());
        }
    }

    /**
     * Test business_id can be null
     */
    public function testBusinessIdCanBeNull(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $this->assertNull($config->getBusinessId());
    }

    /**
     * Test workspace_id can be null
     */
    public function testWorkspaceIdCanBeNull(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $this->assertNull($config->getWorkspaceId());
    }

    /**
     * Test webhook_secret can be empty
     */
    public function testWebhookSecretCanBeEmpty(): void
    {
        $config = new ZanaFleetConfig('key', 'secret');
        
        $this->assertEquals('', $config->getWebhookSecret());
    }

    /**
     * Test webhook_secret is set when provided
     */
    public function testWebhookSecretIsSetWhenProvided(): void
    {
        $config = new ZanaFleetConfig('key', 'secret', 'sandbox', 'my_webhook_secret');
        
        $this->assertEquals('my_webhook_secret', $config->getWebhookSecret());
    }

    /**
     * Test fromArray with string timeout
     */
    public function testFromArrayWithStringTimeout(): void
    {
        $config = ZanaFleetConfig::fromArray([
            'api_key' => 'key',
            'api_secret' => 'secret',
            'timeout' => '45',
        ]);
        
        $this->assertEquals(45, $config->getTimeout());
    }

    /**
     * Test fromArray with string retry values
     */
    public function testFromArrayWithStringRetryValues(): void
    {
        $config = ZanaFleetConfig::fromArray([
            'api_key' => 'key',
            'api_secret' => 'secret',
            'retry_attempts' => '7',
            'retry_delay_ms' => '2500',
        ]);
        
        $this->assertEquals(7, $config->getRetryAttempts());
        $this->assertEquals(2500, $config->getRetryDelayMs());
    }
}