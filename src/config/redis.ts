import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Retrying Redis connection... Attempt: ${times}, delay: ${delay}ms`);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis.');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});
