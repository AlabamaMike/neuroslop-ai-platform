/**
 * Data Aggregator
 * Aggregates data from multiple sources for signal detection
 */

import {
  DataPoint,
  DataSourceType,
  AggregationConfig,
  SourceConfiguration,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

export interface DataSource {
  type: DataSourceType;
  fetch(config: any): Promise<DataPoint[]>;
  isAvailable(): Promise<boolean>;
}

export class DataAggregator {
  private sources: Map<DataSourceType, DataSource>;
  private configurations: Map<DataSourceType, SourceConfiguration>;
  private cache: Map<string, { data: DataPoint[]; timestamp: Date }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.sources = new Map();
    this.configurations = new Map();
    this.cache = new Map();
  }

  /**
   * Register a data source
   */
  public registerSource(source: DataSource, config: SourceConfiguration): void {
    this.sources.set(source.type, source);
    this.configurations.set(source.type, config);
  }

  /**
   * Aggregate data from configured sources
   */
  public async aggregate(config: AggregationConfig): Promise<DataPoint[]> {
    const cacheKey = this.getCacheKey(config);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTTL) {
      return cached.data;
    }

    const dataPoints: DataPoint[] = [];
    const fetchPromises: Promise<DataPoint[]>[] = [];

    // Fetch from each configured source
    for (const sourceType of config.sources) {
      const source = this.sources.get(sourceType);
      const sourceConfig = this.configurations.get(sourceType);

      if (!source || !sourceConfig || !sourceConfig.enabled) {
        continue;
      }

      // Check if source is available
      try {
        const available = await source.isAvailable();
        if (!available) {
          continue;
        }
      } catch (error) {
        console.error(`Source ${sourceType} availability check failed:`, error);
        continue;
      }

      // Build fetch config
      const fetchConfig = {
        ...sourceConfig.config,
        timeWindow: config.timeWindow,
        keywords: config.keywords,
        entities: config.entities,
      };

      // Add rate limiting if configured
      if (sourceConfig.rateLimit) {
        fetchPromises.push(
          this.rateLimitedFetch(source, fetchConfig, sourceConfig.rateLimit)
        );
      } else {
        fetchPromises.push(source.fetch(fetchConfig));
      }
    }

    // Fetch all data in parallel
    const results = await Promise.allSettled(fetchPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        dataPoints.push(...result.value);
      } else {
        console.error(`Source fetch failed:`, result.reason);
      }
    });

    // Filter by time window
    const filtered = dataPoints.filter(dp => {
      const timestamp = new Date(dp.timestamp);
      return timestamp >= config.timeWindow.start &&
             timestamp <= config.timeWindow.end;
    });

    // Check minimum data points requirement
    if (filtered.length < config.minDataPoints) {
      console.warn(
        `Insufficient data points: ${filtered.length} < ${config.minDataPoints}`
      );
    }

    // Cache the results
    this.cache.set(cacheKey, {
      data: filtered,
      timestamp: new Date(),
    });

    return filtered;
  }

  /**
   * Fetch data with rate limiting
   */
  private async rateLimitedFetch(
    source: DataSource,
    config: any,
    rateLimit: { maxRequests: number; windowMs: number }
  ): Promise<DataPoint[]> {
    // Simple rate limiting implementation
    // In production, use a more sophisticated rate limiter
    const delay = rateLimit.windowMs / rateLimit.maxRequests;

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const data = await source.fetch(config);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * Get cache key for configuration
   */
  private getCacheKey(config: AggregationConfig): string {
    return JSON.stringify({
      sources: config.sources.sort(),
      timeWindow: config.timeWindow,
      keywords: config.keywords?.sort(),
      entities: config.entities?.sort(),
    });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get source configuration
   */
  public getSourceConfiguration(type: DataSourceType): SourceConfiguration | undefined {
    return this.configurations.get(type);
  }

  /**
   * Update source configuration
   */
  public updateSourceConfiguration(
    type: DataSourceType,
    config: Partial<SourceConfiguration>
  ): boolean {
    const existing = this.configurations.get(type);
    if (!existing) {
      return false;
    }

    this.configurations.set(type, {
      ...existing,
      ...config,
    });

    return true;
  }

  /**
   * Get all source configurations
   */
  public getAllSourceConfigurations(): SourceConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Enable/disable a source
   */
  public toggleSource(type: DataSourceType, enabled: boolean): boolean {
    const config = this.configurations.get(type);
    if (!config) {
      return false;
    }

    config.enabled = enabled;
    this.configurations.set(type, config);
    return true;
  }

  /**
   * Check health of all sources
   */
  public async checkSourcesHealth(): Promise<Record<DataSourceType, boolean>> {
    const health: Record<string, boolean> = {};

    const checks = Array.from(this.sources.entries()).map(
      async ([type, source]) => {
        try {
          const available = await source.isAvailable();
          health[type] = available;
        } catch (error) {
          health[type] = false;
        }
      }
    );

    await Promise.all(checks);

    return health as Record<DataSourceType, boolean>;
  }

  /**
   * Get aggregation statistics
   */
  public getStatistics(): {
    totalSources: number;
    enabledSources: number;
    cacheSize: number;
    cachedItems: number;
  } {
    const configs = Array.from(this.configurations.values());

    return {
      totalSources: configs.length,
      enabledSources: configs.filter(c => c.enabled).length,
      cacheSize: this.cache.size,
      cachedItems: Array.from(this.cache.values()).reduce(
        (sum, item) => sum + item.data.length,
        0
      ),
    };
  }
}

/**
 * Mock Data Source for testing
 */
export class MockDataSource implements DataSource {
  public type: DataSourceType;

  constructor(type: DataSourceType) {
    this.type = type;
  }

  async fetch(config: any): Promise<DataPoint[]> {
    // Generate mock data points
    const count = Math.floor(Math.random() * 10) + 5;
    const dataPoints: DataPoint[] = [];

    for (let i = 0; i < count; i++) {
      dataPoints.push({
        id: uuidv4(),
        sourceType: this.type,
        sourceId: `mock-${i}`,
        content: `Mock content from ${this.type} source`,
        metadata: {
          mockData: true,
          index: i,
        },
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        entities: ['entity1', 'entity2'],
        sentiment: Math.random() * 2 - 1, // -1 to 1
        relevanceScore: Math.random(),
      });
    }

    return dataPoints;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
