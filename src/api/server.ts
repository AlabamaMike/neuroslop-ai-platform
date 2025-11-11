/**
 * Express API Server
 * Main server setup with all routes and middleware
 */

import express, { Application } from 'express';
import { createServer, Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { SignalDetector } from '../signals/detector.js';
import { DataAggregator, MockDataSource } from '../signals/aggregator.js';
import { DetectionConfig, DataSourceType, SignalType } from '../signals/types.js';
import { SignalWebSocketServer } from './websocket.js';

import { requestLogger, logger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

import { createSignalRoutes } from './routes/signals.js';
import { createSourceRoutes } from './routes/sources.js';
import { createHealthRoutes } from './routes/health.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class APIServer {
  private app: Application;
  private server: Server;
  private wsServer: SignalWebSocketServer | null = null;
  private detector: SignalDetector;
  private aggregator: DataAggregator;
  private port: number;

  constructor(port: number = parseInt(process.env.PORT || '3000')) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);

    // Initialize signal detection system
    this.aggregator = new DataAggregator();
    this.detector = this.initializeDetector();

    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();

    // Initialize mock data sources for testing
    this.initializeMockSources();
  }

  private initializeDetector(): SignalDetector {
    const config: DetectionConfig = {
      confidenceThreshold: parseFloat(
        process.env.SIGNAL_CONFIDENCE_THRESHOLD || '0.6'
      ),
      relevanceThreshold: parseFloat(
        process.env.SIGNAL_RELEVANCE_THRESHOLD || '0.5'
      ),
      minEvidencePoints: 5,
      enableNeurosymbolicReasoning: true,
      signalTypes: [
        SignalType.EMERGING_TREND,
        SignalType.SENTIMENT_SHIFT,
        SignalType.VOLUME_SPIKE,
        SignalType.PATTERN_DETECTED,
        SignalType.ANOMALY,
        SignalType.CORRELATION,
      ],
      maxSignalsPerRun: 50,
    };

    return new SignalDetector(this.aggregator, config);
  }

  private initializeMockSources(): void {
    // Register mock data sources for demonstration
    const sourceTypes: DataSourceType[] = [
      DataSourceType.REDDIT,
      DataSourceType.TWITTER,
      DataSourceType.USPTO,
      DataSourceType.EDGAR,
    ];

    sourceTypes.forEach(type => {
      const mockSource = new MockDataSource(type);
      this.aggregator.registerSource(mockSource, {
        type,
        enabled: true,
        config: {
          mock: true,
        },
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000,
        },
      });
    });

    logger.info('Mock data sources initialized', {
      sources: sourceTypes,
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use('/api', apiLimiter);

    logger.info('Middleware configured');
  }

  private setupRoutes(): void {
    // API documentation
    try {
      const swaggerDocument = YAML.load(
        path.join(__dirname, '../../openapi.yaml')
      );
      this.app.use(
        '/api/docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument)
      );
      logger.info('API documentation available at /api/docs');
    } catch (error) {
      logger.warn('OpenAPI documentation not found');
    }

    // Health check (no rate limiting)
    this.app.use('/api/health', createHealthRoutes(this.detector, this.aggregator));

    // API routes
    this.app.use('/api/signals', createSignalRoutes(this.detector, this.aggregator));
    this.app.use('/api/sources', createSourceRoutes(this.aggregator));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Neurosymbolic AI Market Signals Platform',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          signals: '/api/signals',
          sources: '/api/sources',
          docs: '/api/docs',
          websocket: '/ws',
        },
        timestamp: new Date(),
      });
    });

    logger.info('Routes configured');
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Error handler (must be last)
    this.app.use(errorHandler);

    logger.info('Error handling configured');
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        logger.info(`Server started on port ${this.port}`);

        // Initialize WebSocket server
        this.wsServer = new SignalWebSocketServer(this.server, this.detector);

        // Start periodic trending updates
        this.startTrendingUpdates();

        logger.info('Server fully initialized', {
          port: this.port,
          env: process.env.NODE_ENV || 'development',
        });

        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wsServer) {
        this.wsServer.close();
      }

      this.server.close(() => {
        logger.info('Server stopped');
        resolve();
      });
    });
  }

  /**
   * Start periodic trending signal updates
   */
  private startTrendingUpdates(): void {
    setInterval(() => {
      if (this.wsServer) {
        const trending = this.detector.getTrendingSignals(10);
        this.wsServer.broadcastTrendingUpdate(trending);
      }
    }, 60000); // Every minute
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  public getServer(): Server {
    return this.server;
  }

  /**
   * Get detector instance
   */
  public getDetector(): SignalDetector {
    return this.detector;
  }

  /**
   * Get aggregator instance
   */
  public getAggregator(): DataAggregator {
    return this.aggregator;
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new APIServer();
  server.start().catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
}
