/**
 * Source Configuration Routes
 */

import { Router } from 'express';
import { DataAggregator } from '../../signals/aggregator.js';
import { DataSourceType } from '../../signals/types.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { configLimiter } from '../middleware/rateLimiter.js';

export function createSourceRoutes(aggregator: DataAggregator): Router {
  const router = Router();

  /**
   * GET /api/sources
   * Get all data source configurations
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const configurations = aggregator.getAllSourceConfigurations();

      res.json({
        success: true,
        data: {
          sources: configurations,
          total: configurations.length,
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * GET /api/sources/health
   * Check health of all data sources
   * NOTE: This must come before /:type route to avoid matching /health as a type
   */
  router.get(
    '/health',
    asyncHandler(async (req, res) => {
      const health = await aggregator.checkSourcesHealth();
      const statistics = aggregator.getStatistics();

      const healthySources = Object.values(health).filter(h => h).length;
      const totalSources = Object.keys(health).length;

      res.json({
        success: true,
        data: {
          sources: health,
          statistics,
          summary: {
            healthy: healthySources,
            total: totalSources,
            healthPercentage: totalSources > 0
              ? (healthySources / totalSources) * 100
              : 0,
          },
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * POST /api/sources/configure
   * Configure a data source
   */
  router.post(
    '/configure',
    configLimiter,
    validateRequest(schemas.sourceConfiguration),
    asyncHandler(async (req, res) => {
      const configuration = req.body;

      const updated = aggregator.updateSourceConfiguration(
        configuration.type,
        configuration
      );

      if (!updated) {
        throw new AppError(
          `Failed to update source configuration for ${configuration.type}`,
          400,
          'UPDATE_FAILED'
        );
      }

      res.json({
        success: true,
        data: {
          message: 'Source configuration updated successfully',
          type: configuration.type,
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * DELETE /api/sources/cache
   * Clear the aggregator cache
   */
  router.delete(
    '/cache',
    configLimiter,
    asyncHandler(async (req, res) => {
      aggregator.clearCache();

      res.json({
        success: true,
        data: {
          message: 'Cache cleared successfully',
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * GET /api/sources/:type
   * Get specific source configuration
   */
  router.get(
    '/:type',
    asyncHandler(async (req, res) => {
      const { type } = req.params;

      const configuration = aggregator.getSourceConfiguration(
        type as DataSourceType
      );

      if (!configuration) {
        throw new AppError(
          `Source configuration for ${type} not found`,
          404,
          'SOURCE_NOT_FOUND'
        );
      }

      res.json({
        success: true,
        data: configuration,
        timestamp: new Date(),
      });
    })
  );

  /**
   * PATCH /api/sources/:type/toggle
   * Enable or disable a data source
   */
  router.patch(
    '/:type/toggle',
    configLimiter,
    asyncHandler(async (req, res) => {
      const { type } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        throw new AppError(
          'enabled field must be a boolean',
          400,
          'INVALID_INPUT'
        );
      }

      const updated = aggregator.toggleSource(
        type as DataSourceType,
        enabled
      );

      if (!updated) {
        throw new AppError(
          `Failed to toggle source ${type}`,
          400,
          'TOGGLE_FAILED'
        );
      }

      res.json({
        success: true,
        data: {
          message: `Source ${type} ${enabled ? 'enabled' : 'disabled'}`,
          type,
          enabled,
        },
        timestamp: new Date(),
      });
    })
  );

  /**
   * DELETE /api/sources/cache
   * Clear the aggregator cache
   */
  router.delete(
    '/cache',
    configLimiter,
    asyncHandler(async (req, res) => {
      aggregator.clearCache();

      res.json({
        success: true,
        data: {
          message: 'Cache cleared successfully',
        },
        timestamp: new Date(),
      });
    })
  );

  return router;
}
