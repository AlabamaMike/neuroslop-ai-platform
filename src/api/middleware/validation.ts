/**
 * Request Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler.js';

export const validateRequest = (schema: {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string> = {};

    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        error.details.forEach(detail => {
          errors[detail.path.join('.')] = detail.message;
        });
      }
    }

    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        error.details.forEach(detail => {
          errors[`query.${detail.path.join('.')}`] = detail.message;
        });
      }
    }

    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        error.details.forEach(detail => {
          errors[`params.${detail.path.join('.')}`] = detail.message;
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        { errors }
      );
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  signalSearch: {
    body: Joi.object({
      keywords: Joi.array().items(Joi.string()).min(1).optional(),
      entities: Joi.array().items(Joi.string()).optional(),
      signalTypes: Joi.array().items(
        Joi.string().valid(
          'emerging_trend',
          'sentiment_shift',
          'volume_spike',
          'pattern_detected',
          'anomaly',
          'correlation'
        )
      ).optional(),
      minConfidence: Joi.number().min(0).max(1).optional(),
      minRelevance: Joi.number().min(0).max(1).optional(),
      dateRange: Joi.object({
        start: Joi.date().iso().optional(),
        end: Joi.date().iso().optional(),
      }).optional(),
      limit: Joi.number().min(1).max(100).default(10),
      offset: Joi.number().min(0).default(0),
    }),
  },

  signalId: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },

  trendingSignals: {
    query: Joi.object({
      limit: Joi.number().min(1).max(50).default(10),
      hours: Joi.number().min(1).max(168).default(24),
    }),
  },

  sourceConfiguration: {
    body: Joi.object({
      type: Joi.string()
        .valid('reddit', 'twitter', 'uspto', 'edgar', 'news', 'social_media', 'blockchain', 'market_data')
        .required(),
      enabled: Joi.boolean().required(),
      config: Joi.object().required(),
      credentials: Joi.object().optional(),
      rateLimit: Joi.object({
        maxRequests: Joi.number().min(1).required(),
        windowMs: Joi.number().min(1000).required(),
      }).optional(),
    }),
  },
};
