<?php
/**
 * ZanaFleet Exceptions Unit Tests
 * 
 * Tests for ZanaFleet exception classes
 * 
 * @package ZanaFleet\Tests\Unit\Exceptions
 */

declare(strict_types=1);

namespace ZanaFleet\Tests\Unit\Exceptions;

require_once dirname(__DIR__, 3) . '/bootstrap/bootstrap.php';

use PHPUnit\Framework\TestCase;
use ZanaFleet\Core\Exceptions\ApiException;
use ZanaFleet\Core\Exceptions\AuthenticationException;
use ZanaFleet\Core\Exceptions\DeliveryConflictException;
use ZanaFleet\Core\Exceptions\ZanaFleetException;

/**
 * Test suite for ZanaFleet Exceptions
 */
class ExceptionsTest extends TestCase
{
    /**
     * Test ApiException basic creation
     */
    public function testApiExceptionBasicCreation(): void
    {
        $exception = new ApiException('API Error Message');

        $this->assertInstanceOf(\Exception::class, $exception);
        $this->assertEquals('API Error Message', $exception->getMessage());
        $this->assertEquals(0, $exception->getCode());
    }

    /**
     * Test ApiException with code
     */
    public function testApiExceptionWithCode(): void
    {
        $exception = new ApiException('API Error', 500);

        $this->assertEquals('API Error', $exception->getMessage());
        $this->assertEquals(500, $exception->getCode());
    }

    /**
     * Test ApiException with previous
     */
    public function testApiExceptionWithPrevious(): void
    {
        $previous = new \Exception('Previous error');
        $exception = new ApiException('API Error', 500, $previous);

        $this->assertEquals('Previous error', $exception->getPrevious()->getMessage());
    }

    /**
     * Test AuthenticationException basic creation
     */
    public function testAuthenticationExceptionBasicCreation(): void
    {
        $exception = new AuthenticationException('Auth Error');

        $this->assertInstanceOf(\Exception::class, $exception);
        $this->assertEquals('Auth Error', $exception->getMessage());
    }

    /**
     * Test AuthenticationException with code
     */
    public function testAuthenticationExceptionWithCode(): void
    {
        $exception = new AuthenticationException('Invalid API key', 401);

        $this->assertEquals('Invalid API key', $exception->getMessage());
        $this->assertEquals(401, $exception->getCode());
    }

    /**
     * Test DeliveryConflictException creation
     */
    public function testDeliveryConflictExceptionCreation(): void
    {
        $exception = new DeliveryConflictException('Delivery conflict');

        $this->assertInstanceOf(\Exception::class, $exception);
        $this->assertEquals('Delivery conflict', $exception->getMessage());
    }

    /**
     * Test DeliveryConflictException with code
     */
    public function testDeliveryConflictExceptionWithCode(): void
    {
        $exception = new DeliveryConflictException('Time slot already booked', 409);

        $this->assertEquals('Time slot already booked', $exception->getMessage());
        $this->assertEquals(409, $exception->getCode());
    }

    /**
     * Test ZanaFleetException base class
     */
    public function testZanaFleetExceptionBaseClass(): void
    {
        $exception = new ZanaFleetException('Base exception');

        $this->assertInstanceOf(\Exception::class, $exception);
        $this->assertEquals('Base exception', $exception->getMessage());
    }

    /**
     * Test exception inheritance hierarchy
     */
    public function testExceptionInheritanceHierarchy(): void
    {
        $apiException = new ApiException('Test');
        $authException = new AuthenticationException('Test');
        $conflictException = new DeliveryConflictException('Test');
        $baseException = new ZanaFleetException('Test');

        $this->assertInstanceOf(ZanaFleetException::class, $apiException);
        $this->assertInstanceOf(ZanaFleetException::class, $authException);
        $this->assertInstanceOf(ZanaFleetException::class, $conflictException);
        $this->assertInstanceOf(\Exception::class, $baseException);
    }

    /**
     * Test ApiException can be thrown and caught
     */
    public function testApiExceptionCanBeThrownAndCaught(): void
    {
        try {
            throw new ApiException('Test error', 400);
        } catch (ApiException $e) {
            $this->assertEquals('Test error', $e->getMessage());
            $this->assertEquals(400, $e->getCode());
        }
    }

    /**
     * Test AuthenticationException can be thrown and caught
     */
    public function testAuthenticationExceptionCanBeThrownAndCaught(): void
    {
        try {
            throw new AuthenticationException('Unauthorized', 403);
        } catch (AuthenticationException $e) {
            $this->assertEquals('Unauthorized', $e->getMessage());
            $this->assertEquals(403, $e->getCode());
        }
    }

    /**
     * Test DeliveryConflictException can be thrown and caught
     */
    public function testDeliveryConflictExceptionCanBeThrownAndCaught(): void
    {
        try {
            throw new DeliveryConflictException('Conflict', 409);
        } catch (DeliveryConflictException $e) {
            $this->assertEquals('Conflict', $e->getMessage());
            $this->assertEquals(409, $e->getCode());
        }
    }

    /**
     * Test catching as base exception
     */
    public function testCatchingAsBaseException(): void
    {
        try {
            throw new ApiException('Test', 500);
        } catch (ZanaFleetException $e) {
            $this->assertInstanceOf(ApiException::class, $e);
            $this->assertEquals('Test', $e->getMessage());
        }
    }

    /**
     * Test exception with empty message
     */
    public function testExceptionWithEmptyMessage(): void
    {
        $exception = new ApiException('');

        $this->assertEquals('', $exception->getMessage());
    }

    /**
     * Test exception with special characters in message
     */
    public function testExceptionWithSpecialCharacters(): void
    {
        $message = "Error with 'quotes' and \"double quotes\" and <tags>";
        $exception = new ApiException($message);

        $this->assertEquals($message, $exception->getMessage());
    }

    /**
     * Test exception with unicode characters
     */
    public function testExceptionWithUnicodeCharacters(): void
    {
        $message = 'Error: Nairobi location not found üöä';
        $exception = new ApiException($message);

        $this->assertEquals($message, $exception->getMessage());
    }

    /**
     * Test exception with multiline message
     */
    public function testExceptionWithMultilineMessage(): void
    {
        $message = "Error line 1\nError line 2\nError line 3";
        $exception = new ApiException($message);

        $this->assertEquals($message, $exception->getMessage());
    }

    /**
     * Test all exceptions can be caught by base class
     */
    public function testAllExceptionsCanBeCaughtByBaseClass(): void
    {
        $exceptions = [
            new ApiException('api error'),
            new AuthenticationException('auth error'),
            new DeliveryConflictException('conflict error'),
            new ZanaFleetException('base error'),
        ];

        foreach ($exceptions as $exception) {
            $caught = false;
            try {
                throw $exception;
            } catch (ZanaFleetException $e) {
                $caught = true;
            }
            $this->assertTrue($caught, get_class($exception) . ' should be catchable as ZanaFleetException');
        }
    }

    /**
     * Test various HTTP status codes
     */
    public function testVariousHttpStatusCodes(): void
    {
        $codes = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503];

        foreach ($codes as $code) {
            $exception = new ApiException('Error', $code);
            $this->assertEquals($code, $exception->getCode());
        }
    }

    /**
     * Test exception string representation
     */
    public function testExceptionStringRepresentation(): void
    {
        $exception = new ApiException('Test error', 500);
        $string = (string) $exception;

        $this->assertStringContainsString('Test error', $string);
    }
}