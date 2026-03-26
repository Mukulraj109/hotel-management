import { validateEnvironment } from '../../utils/validateEnv.js';

describe('validateEnvironment', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'x'.repeat(40);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes in non-production with required baseline vars', () => {
    process.env.NODE_ENV = 'test';
    expect(() => validateEnvironment()).not.toThrow();
  });

  it('fails in production when strict vars are missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;
    expect(() => validateEnvironment()).toThrow(/Missing required environment variables/);
  });

  it('passes in production when strict vars are present', () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
    process.env.HEALTH_CHECK_TOKEN = 'health-token';
    process.env.BOOKINGCOM_WEBHOOK_SECRET = 'secret-1';
    process.env.EXPEDIA_WEBHOOK_SECRET = 'secret-2';
    process.env.AIRBNB_WEBHOOK_SECRET = 'secret-3';
    process.env.AGODA_WEBHOOK_SECRET = 'secret-4';

    expect(() => validateEnvironment()).not.toThrow();
  });
});
