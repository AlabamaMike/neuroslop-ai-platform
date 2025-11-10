/**
 * Health Check Routes
 */

import { Router } from 'express';
import { SignalDetector } from '../../signals/detector.js';
import { DataAggregator } from '../../signals/aggregator.js';
import { HealthStatus } from '../../signals/types.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getCacheStats } from '../middleware/cache.js';

export function createHealthRoutes(
  detector: SignalDetector,
  aggregator: DataAggregator
): Router {
  const router = Router();

  const startTime = Date.now();
  const requestTimes: number[] = [];

  // Track response times
  router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      requestTimes.push(duration);
      // Keep only last 100 requests
      if (requestTimes.length > 100) {
        requestTimes.shift();
      }
    });
    next();
  });

  /**
   * GET /api/health
   * Get health status of the system
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const activeSignals = detector.getActiveSignals();

      // Calculate 24h signals
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const signals24h = activeSignals.filter(
        signal => signal.createdAt >= twentyFourHoursAgo
      );

      // Calculate average confidence
      const avgConfidence = activeSignals.length > 0
        ? activeSignals.reduce((sum, s) => sum + s.confidence, 0) /
          activeSignals.length
        : 0;

      // Calculate average response time
      const avgResponseTime = requestTimes.length > 0
        ? requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length
        : 0;

      // Check cache
      const cacheStats = getCacheStats();

      // Check sources
      const sourcesHealth = await aggregator.checkSourcesHealth();
      const healthySources = Object.values(sourcesHealth).filter(h => h).length;
      const totalSources = Object.keys(sourcesHealth).length;

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthySources === totalSources && avgResponseTime < 1000) {
        status = 'healthy';
      } else if (healthySources > totalSources / 2 && avgResponseTime < 3000) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      const health: HealthStatus = {
        status,
        timestamp: new Date(),
        services: {
          api: true,
          websocket: true, // Will be updated when WebSocket is implemented
          cache: cacheStats.keys > 0,
          signalDetector: activeSignals.length > 0,
        },
        metrics: {
          activeSignals: activeSignals.length,
          signalsDetected24h: signals24h.length,
          avgConfidence: parseFloat(avgConfidence.toFixed(3)),
          avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
          errorRate: 0, // Could be tracked with a proper error counter
        },
      };

      res.json({
        success: true,
        data: health,
        uptime: Date.now() - startTime,
        timestamp: new Date(),
      });
    })
  );

  /**
   * GET /api/health/ping
   * Simple ping endpoint
   */
  router.get('/ping', (req, res) => {
    res.json({
      success: true,
      data: 'pong',
      timestamp: new Date(),
    });
  });

  /**
   * GET /api/health/stats
   * Get detailed system statistics
   */
  router.get(
    '/stats',
    asyncHandler(async (req, res) => {
      const activeSignals = detector.getActiveSignals();
      const cacheStats = getCacheStats();
      const aggregatorStats = aggregator.getStatistics();

      // Signal type distribution
      const signalTypeDistribution: Record<string, number> = {};
      activeSignals.forEach(signal => {
        signalTypeDistribution[signal.type] =
          (signalTypeDistribution[signal.type] || 0) + 1;
      });

      // Strength distribution
      const strengthDistribution: Record<string, number> = {};
      activeSignals.forEach(signal => {
        strengthDistribution[signal.strength] =
          (strengthDistribution[signal.strength] || 0) + 1;
      });

      res.json({
        success: true,
        data: {
          signals: {
            total: activeSignals.length,
            typeDistribution: signalTypeDistribution,
            strengthDistribution,
          },
          cache: cacheStats,
          aggregator: aggregatorStats,
          system: {
            uptime: Date.now() - startTime,
            avgResponseTime: requestTimes.length > 0
              ? requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length
              : 0,
            requestCount: requestTimes.length,
          },
        },
        timestamp: new Date(),
      });
    })
  );

  return router;
}
