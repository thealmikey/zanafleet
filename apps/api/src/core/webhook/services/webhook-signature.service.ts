import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * WebhookSignatureService
 *
 * Handles HMAC-SHA256 signature generation for webhook payloads.
 * Used to verify webhook authenticity on the receiving end.
 */
@Injectable()
export class WebhookSignatureService {
  private readonly logger = new Logger(WebhookSignatureService.name);

  /**
   * Generate HMAC-SHA256 signature for a webhook payload
   * @param payload - The payload to sign (string or object)
   * @param secret - The secret key for signing
   * @returns The signature in format: sha256=<hex-encoded-hmac>
   */
  generateSignature(payload: string | Record<string, unknown>, secret: string): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString, 'utf8');
    const signature = hmac.digest('hex');
    return `sha256=${signature}`;
  }

  /**
   * Verify a webhook signature
   * @param payload - The payload to verify
   * @param signature - The signature to verify against
   * @param secret - The secret key used for signing
   * @returns True if signature is valid, false otherwise
   */
  verifySignature(
    payload: string | Record<string, unknown>,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret);
      return this.constantTimeCompare(signature, expectedSignature);
    } catch (error) {
      this.logger.error(`Signature verification failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Generate a timestamp header value
   * @returns Unix timestamp in seconds
   */
  generateTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Generate all required webhook headers
   * @param payload - The payload to sign
   * @param secret - The secret key for signing
   * @returns Object containing all required headers
   */
  generateHeaders(
    payload: string | Record<string, unknown>,
    secret: string
  ): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': this.generateSignature(payload, secret),
      'X-Webhook-Timestamp': this.generateTimestamp().toString(),
    };
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
