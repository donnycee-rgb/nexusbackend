import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
});

export async function connectRedis(): Promise<void> {
  await redis.ping();
}

export default redis;
