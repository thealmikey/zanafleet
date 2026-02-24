import { registerAs } from '@nestjs/config';

/**
 * Auth Module Configuration
 *
 * Registers JWT authentication settings under the 'auth' namespace.
 * Access via ConfigService: configService.get('auth.jwt.secret')
 */
export const authConfig = registerAs('auth', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // Fail fast in production if JWT_SECRET is not set
  if (!jwtSecret && isProduction) {
    throw new Error(
      'JWT_SECRET environment variable is required in production. ' +
        'Please set a secure secret (32+ characters recommended).'
    );
  }

  // Development fallback with warning
  if (!jwtSecret) {
    console.warn(
      '⚠️  JWT_SECRET not set. Using insecure development fallback. ' +
        'Do NOT use this in production!'
    );
  }

  const DEV_FALLBACK_SECRET = 'INSECURE_DEV_SECRET_CHANGE_IN_PRODUCTION';

  return {
    jwt: {
      secret: jwtSecret || DEV_FALLBACK_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: process.env.JWT_ISSUER || 'zanafleet',
    },
  };
});
