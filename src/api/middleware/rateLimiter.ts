/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      timestamp: new Date(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests, please try again later',
      timestamp: new Date(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const configLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: {
      code: 'CONFIG_RATE_LIMIT_EXCEEDED',
      message: 'Too many configuration requests, please try again later',
      timestamp: new Date(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
