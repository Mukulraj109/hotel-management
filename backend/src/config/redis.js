import { createClient } from 'redis';
import logger from '../utils/logger.js';

let redisClient;
let lastRedisErrorLogAt = 0;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      const now = Date.now();
      // Throttle repetitive connection/auth error logs during reconnect storms.
      if (now - lastRedisErrorLogAt > 10000) {
        lastRedisErrorLogAt = now;
        logger.error('Redis Client Error', {
          error: err?.message || 'Unknown Redis error',
          code: err?.code || null
        });
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();
    
  } catch (error) {
    logger.error('Redis connection failed in production, continuing with degraded mode:', error.message);
    logger.warn('Redis connection failed, continuing with degraded functionality:', error.message);
    logger.warn('Features requiring Redis (caching, distributed locking, refresh tokens) will be unavailable');
    redisClient = null;
  }
};

export const getRedisClient = () => redisClient;

export const isRedisConnected = () => redisClient && redisClient.isReady;

export const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.disconnect();
  }
};
