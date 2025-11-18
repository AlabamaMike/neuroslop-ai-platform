/**
 * Signal Routes
 */

import { Router } from 'express';
import { SignalDetector } from '../../signals/detector.js';
import { DataAggregator } from '../../signals/aggregator.js';
import { SearchQuery, SignalType } from '../../signals/types.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';
import { searchLimiter } from '../middleware/rateLimiter.js';

export function createSignalRoutes(
  detector: SignalDetector,
  aggregator: DataAggregator
): Router {
  const router = Router();

  /**
   * POST /api/signals/search
   * Search for signals by keywords, entities, and other criteria
   */
  router.post(
    '/search',
    searchLimiter,
    validateRequest(schemas.signalSearch),
    asyncHandler(async (req, res) => {
      const query: SearchQuery = req.body;

      // Get active signals
      let signals = detector.getActiveSignals();

      // Apply filters
      if (query.keywords && query.keywords.length > 0) {
        signals = signals.filter(signal =>
          query.keywords!.some(keyword =>
            signal.keywords.some(k =>
              k.toLowerCase().includes(keyword.toLowerCase())
            )
          )
        );
      }

      if (query.entities && query.entities.length > 0) {
        signals = signals.filter(signal =>
          query.entities!.some(entity =>
            signal.entities.includes(entity)
          )
        );
      }

      if (query.signalTypes && query.signalTypes.length > 0) {
        signals = signals.filter(signal =>
          query.signalTypes!.includes(signal.type)
        );
      }

      if (query.minConfidence !== undefined) {
        signals = signals.filter(signal =>
          signal.confidence >= query.minConfidence!
        );
      }

      if (query.minRelevance !== undefined) {
        signals = signals.filter(signal =>
          signal.relevance >= query.minRelevance!
        );
      }

      if (query.dateRange) {
        if (query.dateRange.start) {
          signals = signals.filter(signal =>
            signal.createdAt >= query.dateRange!.start
          );
        }
        if (query.dateRange.end) {
          signals = signals.filter(signal =>
            signal.createdAt <= query.dateRange!.end
          );
        }
      }

      // Pagination
      const total = signals.length;
      const offset = query.offset || 0;
      const limit = query.limit || 10;
      const page = Math.floor(offset / limit) + 1;
      const paginatedSignals = signals.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          signals: paginatedSignals,
          total,
          page,
          pageSize: limit,
          hasMore: offset + limit < total,
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * GET /api/signals/trending
   * Get trending signals
   * NOTE: This must come before /:id route to avoid matching /trending as an ID
   */
  router.get(
    '/trending',
    validateRequest(schemas.trendingSignals),
    cacheMiddleware(120), // Cache for 2 minutes
    asyncHandler(async (req, res) => {
      const limit = parseInt(req.query.limit as string) || 10;
      const hours = parseInt(req.query.hours as string) || 24;

      const trendingSignals = detector.getTrendingSignals(limit);

      // Filter by time window
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const filtered = trendingSignals.filter(ts =>
        ts.signal.createdAt >= cutoffTime
      );

      res.json({
        success: true,
        data: {
          trending: filtered,
          timeWindow: {
            hours,
            since: cutoffTime,
          },
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * GET /api/signals/:id
   * Get detailed information about a specific signal
   */
  router.get(
    '/:id',
    validateRequest(schemas.signalId),
    cacheMiddleware(60), // Cache for 1 minute
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const signal = detector.getSignal(id);

      if (!signal) {
        throw new AppError(
          `Signal with id ${id} not found`,
          404,
          'SIGNAL_NOT_FOUND'
        );
      }

      // Get evolution data if available
      const evolution = detector.getSignalEvolution(id);

      res.json({
        success: true,
        data: {
          signal,
          evolution,
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * POST /api/signals/detect
   * Manually trigger signal detection (admin endpoint)
   */
  router.post(
    '/detect',
    asyncHandler(async (req, res) => {
      const {
        sources = ['reddit', 'twitter'],
        keywords = [],
        entities = [],
        hours = 24,
      } = req.body;

      const timeWindow = {
        start: new Date(Date.now() - hours * 60 * 60 * 1000),
        end: new Date(),
      };

      // Aggregate data
      const dataPoints = await aggregator.aggregate({
        sources,
        timeWindow,
        minDataPoints: 5,
        keywords: keywords.length > 0 ? keywords : undefined,
        entities: entities.length > 0 ? entities : undefined,
      });

      // Detect signals
      const signals = await detector.detectSignals(dataPoints);

      // Clear cache to reflect new signals
      clearCache('signals');

      res.json({
        success: true,
        data: {
          detected: signals.length,
          signals: signals.slice(0, 10), // Return first 10
          dataPoints: dataPoints.length,
        },
        timestamp: new Date(),
      });
    })
  );

  return router;
}
