import { WebhookSignatureService } from '../../services/webhook-signature.service';

describe('WebhookSignatureService', () => {
  let service: WebhookSignatureService;

  beforeEach(() => {
    service = new WebhookSignatureService();
  });

  describe('generateSignature', () => {
    it('should generate a valid HMAC-SHA256 signature', () => {
      const payload = { event: 'test', data: { id: '123' } };
      const secret = 'test-secret-key';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should generate the same signature for the same payload and secret', () => {
      const payload = { event: 'test', data: { id: '123' } };
      const secret = 'test-secret-key';

      const signature1 = service.generateSignature(payload, secret);
      const signature2 = service.generateSignature(payload, secret);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = { event: 'test' };
      const secret1 = 'secret1';
      const secret2 = 'secret2';

      const signature1 = service.generateSignature(payload, secret1);
      const signature2 = service.generateSignature(payload, secret2);

      expect(signature1).not.toBe(signature2);
    });

    it('should handle string payloads', () => {
      const payload = 'test string payload';
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should handle JSON string payloads', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const payload = { event: 'test' };
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);
      const isValid = service.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = { event: 'test' };
      const secret = 'test-secret';

      const isValid = service.verifySignature(payload, 'sha256=invalid', secret);

      expect(isValid).toBe(false);
    });

    it('should return false for tampered payload', () => {
      const payload = { event: 'test' };
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);
      const tamperedPayload = { event: 'tampered' };

      const isValid = service.verifySignature(tamperedPayload, signature, secret);

      expect(isValid).toBe(false);
    });

    it('should return false for different secret', () => {
      const payload = { event: 'test' };
      const signature = service.generateSignature(payload, 'secret1');
      const isValid = service.verifySignature(payload, signature, 'secret2');

      expect(isValid).toBe(false);
    });
  });

  describe('generateTimestamp', () => {
    it('should return Unix timestamp in seconds', () => {
      const timestamp = service.generateTimestamp();

      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should be close to current time', () => {
      const before = Math.floor(Date.now() / 1000);
      const timestamp = service.generateTimestamp();
      const after = Math.floor(Date.now() / 1000);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('generateHeaders', () => {
    it('should generate all required headers', () => {
      const payload = { event: 'test' };
      const secret = 'test-secret';

      const headers = service.generateHeaders(payload, secret);

      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).toHaveProperty('X-Webhook-Signature');
      expect(headers).toHaveProperty('X-Webhook-Timestamp');
      expect(headers['X-Webhook-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should generate valid timestamp header', () => {
      const payload = { event: 'test' };
      const secret = 'test-secret';

      const headers = service.generateHeaders(payload, secret);
      const timestamp = parseInt(headers['X-Webhook-Timestamp'], 10);

      expect(timestamp).toBeGreaterThan(0);
      expect(Number.isInteger(timestamp)).toBe(true);
    });
  });
});
