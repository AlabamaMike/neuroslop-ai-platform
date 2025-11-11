/**
 * Neuroslop AI Platform
 *
 * A neurosymbolic AI platform for collecting and analyzing market signals
 * from various social media sources with advanced signal detection and API capabilities.
 */

// Export all data source functionality
export * from './data-sources';

// Export signal types (excluding conflicting types)
export {
  SignalType,
  SignalStrength,
  type Signal,
  type DataPoint,
  type SignalEvidence,
  type NeurosymbolicReasoning,
  type SignalScore,
  type TrendingSignal,
  type SignalEvolution,
  type SignalSnapshot,
  type AggregationConfig,
  type DetectionConfig,
  type SourceConfiguration,
  type SearchQuery,
  type HealthStatus,
  type WebSocketMessage,
  type APIError
} from './signals/types.js';

// Note: DataSourceType and SearchResult are exported from './data-sources'
// to avoid conflicts with signal types

// Signal Detection
export { SignalDetector } from './signals/detector.js';
export { DataAggregator, MockDataSource, type DataSource } from './signals/aggregator.js';
export { SignalScorer, DEFAULT_WEIGHTS, type ScoringWeights } from './signals/scoring.js';

// API Server
export { APIServer } from './api/server.js';
export { SignalWebSocketServer } from './api/websocket.js';

// Middleware
export { AppError, errorHandler, asyncHandler } from './api/middleware/errorHandler.js';
export { validateRequest, schemas } from './api/middleware/validation.js';
export { cacheMiddleware, clearCache, getCacheStats } from './api/middleware/cache.js';
export { apiLimiter, searchLimiter, configLimiter } from './api/middleware/rateLimiter.js';
export { requestLogger, logger } from './api/middleware/logger.js';

// Routes
export { createSignalRoutes } from './api/routes/signals.js';
export { createSourceRoutes } from './api/routes/sources.js';
export { createHealthRoutes } from './api/routes/health.js';

// Version info
export const VERSION = '1.0.0';
export const PLATFORM_NAME = 'Neuroslop AI Platform';
