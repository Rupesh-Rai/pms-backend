import Redis from 'ioredis';
import { ConnectionOptions } from 'bullmq';

export const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
};

// Export connection options explicitly for BullMQ
export const redisConnection: ConnectionOptions = {
  ...redisConfig,
};

export const redis = new Redis({
  ...redisConfig,
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('Connected to Redis server successfully.');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export class CacheService {
  /**
   * Set JSON object or primitive value in Redis with optional TTL (in seconds)
   */
  public static async set(
    key: string,
    value: any,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (ttlSeconds) {
        await redis.set(key, stringValue, 'EX', ttlSeconds);
      } else {
        await redis.set(key, stringValue);
      }
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error);
    }
  }

  /**
   * Get and automatically parse JSON object or primitive value from Redis
   */
  public static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;

      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove one or multiple specific keys from cache
   */
  public static async del(...keys: string[]): Promise<void> {
    try {
      const validKeys = keys.filter(Boolean);
      if (validKeys.length > 0) {
        await redis.del(...validKeys);
      }
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  /**
   * Non-blocking deletion of keys matching a wildcard pattern (e.g. 'project:10:*')
   */
  public static async clearPattern(pattern: string): Promise<void> {
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          const pipeline = redis.pipeline();
          keys.forEach((key) => pipeline.del(key));
          await pipeline.exec();
        }
      });
    } catch (error) {
      console.error(
        `Cache clearPattern error for pattern "${pattern}":`,
        error
      );
    }
  }
}
