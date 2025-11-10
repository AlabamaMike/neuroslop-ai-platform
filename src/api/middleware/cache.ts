/**
 * Caching Middleware
 */

import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS || '300'),
  checkperiod: 60,
});

export const cacheMiddleware = (ttl?: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.method}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date(),
      });
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache the response
    res.json = function (data: any) {
      if (res.statusCode === 200 && data.success !== false) {
        cache.set(key, data.data || data, ttl);
      }
      return originalJson(data);
    } as any;

    next();
  };
};

export const clearCache = (pattern?: string) => {
  if (pattern) {
    const keys = cache.keys();
    const matching = keys.filter(key => key.includes(pattern));
    cache.del(matching);
  } else {
    cache.flushAll();
  }
};

export const getCacheStats = () => {
  return cache.getStats();
};
