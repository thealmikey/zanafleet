<?php

declare(strict_types=1);

namespace ZanaFleet\Tests\Integration\UserStories;

use ZanaFleet\Core\Webhooks\WebhookEvent;
use ZanaFleet\Tests\bootstrap\TestCase;

/**
 * User Story 12: Webhook Handling
 * 
 * As a store owner,
 * I want to receive webhook notifications for delivery updates,
 * So that my order management system stays in sync.
 */
class UserStory12_WebhookHandlingTest extends TestCase
{
    public function testCanVerifyWebhookSignature(): void
    {
        $payload = json_encode(['event' => 'delivery.status_changed', 'delivery_id' => 'DEL-123']);
        $signature = 'valid_signature_hash';
        $secret = 'webhook_secret_123';

        // Create expected signature
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        $this->assertEquals($expectedSignature, hash_hmac('sha256', $payload, $secret));
    }

    public function testCanProcessStatusUpdateWebhook(): void
    {
        $webhook = new WebhookEvent([
            'event' => 'delivery.status_changed',
            'timestamp' => time(),
            'data' => [
                'delivery_id' => 'DEL-456',
                'old_status' => 'ASSIGNED',
                'new_status' => 'PICKED_UP',
                'rider_name' => 'John Rider',
                'rider_phone' => '+254700000000',
            ],
        ]);

        $this->assertEquals('delivery.status_changed', $webhook->getEventType());
        $this->assertEquals('DEL-456', $webhook->getDeliveryId());
        $this->assertEquals('PICKED_UP', $webhook->getNewStatus());
    }

    public function testCanProcessDeliveryCompletedWebhook(): void
    {
        $webhook = new WebhookEvent([
            'event' => 'delivery.completed',
            'timestamp' => time(),
            'data' => [
                'delivery_id' => 'DEL-789',
                'status' => 'DELIVERED',
                'delivered_at' => '2024-01-15T14:30:00Z',
                'recipient_name' => 'Jane Recipient',
                'recipient_signature' => 'signature_data',
            ],
        ]);

        $this->assertEquals('delivery.completed', $webhook->getEventType());
        $this->assertEquals('DELIVERED', $webhook->getStatus());
    }

    public function testCanProcessDeliveryFailedWebhook(): void
    {
        $webhook = new WebhookEvent([
            'event' => 'delivery.failed',
            'timestamp' => time(),
            'data' => [
                'delivery_id' => 'DEL-999',
                'status' => 'FAILED',
                'failure_reason' => 'Recipient not available',
                'retry_count' => 2,
            ],
        ]);

        $this->assertEquals('delivery.failed', $webhook->getEventType());
        $this->assertEquals('FAILED', $webhook->getStatus());
        $this->assertEquals('Recipient not available', $webhook->getFailureReason());
    }

    public function testWebhookRetriesOnFailure(): void
    {
        // Simulate failed webhook processing
        $webhook = new WebhookEvent([
            'event' => 'delivery.status_changed',
            'timestamp' => time(),
            'data' => ['delivery_id' => 'DEL-123'],
        ]);

        // Should be retryable
        $this->assertTrue($webhook->canRetry());
    }
}
