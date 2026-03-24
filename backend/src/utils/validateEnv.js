import logger from './logger.js';

/**
 * Validate required environment variables on startup.
 * Fails fast with a clear error if critical configuration is missing.
 */
export function validateEnvironment() {
  const required = [
    'MONGO_URI',
    'JWT_SECRET',
  ];

  const recommended = [
    'REDIS_URL',
    'STRIPE_SECRET_KEY',
    'SMTP_HOST',
    'ALLOWED_ORIGINS',
  ];

  const missing = required.filter(v => !process.env[v]);
  const missingRecommended = recommended.filter(v => !process.env[v]);

  if (missing.length > 0) {
    const error = `FATAL: Missing required environment variables: ${missing.join(', ')}. ` +
      'The server cannot start without these. Check your .env file.';
    logger.error(error);
    throw new Error(error);
  }

  if (missingRecommended.length > 0) {
    logger.warn(
      `Missing recommended environment variables: ${missingRecommended.join(', ')}. ` +
      'Some features may not work correctly.'
    );
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET is shorter than 32 characters. Consider using a stronger secret.');
  }

  logger.info('Environment validation passed');
}
