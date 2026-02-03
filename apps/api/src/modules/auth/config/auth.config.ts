import { registerAs } from '@nestjs/config';

/**
 * Auth Module Configuration
 *
 * Registers JWT authentication settings under the 'auth' namespace.
 * Access via ConfigService: configService.get('auth.jwt.secret')
 */
export const authConfig = registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || 'zanafleet',
  },
}));
