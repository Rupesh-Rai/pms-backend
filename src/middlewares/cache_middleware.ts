// src/middlewares/cache_middleware.ts
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '@/utils/redis';

export const cacheMiddleware = (
  keyPrefix: string,
  ttlSeconds: number = 300
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Build unique cache key using endpoint path or route parameters
    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await CacheService.get(cacheKey);

      if (cachedData) {
        // Cache Hit: Return response directly from Redis
        res.status(200).json({
          statusCode: 200,
          status: 'success',
          source: 'cache',
          data: cachedData,
        });
        return;
      }

      // Cache Miss: Intercept res.json to store query result in Redis before sending response
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.data) {
          CacheService.set(cacheKey, body.data, ttlSeconds).catch((err) =>
            console.error(`Failed to write cache for key ${cacheKey}:`, err)
          );
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error, proceeding to DB query:', error);
      next();
    }
  };
};
