import {
  BaseContent,
  BaseDataSourceConfig,
  BaseSearchParams,
  DataSourceError,
  DataSourceErrorType,
  DataSourceStats,
  DataSourceType,
  RateLimitInfo,
  SearchResult,
} from './types';

/**
 * Abstract base class for all data sources
 * Provides common functionality for rate limiting, error handling, and statistics
 */
export abstract class BaseDataSource<
  TContent extends BaseContent,
  TSearchParams extends BaseSearchParams,
  TConfig extends BaseDataSourceConfig
> {
  protected config: TConfig;
  protected stats: DataSourceStats;
  protected sourceType: DataSourceType;
  protected rateLimitQueue: Array<number> = [];
  protected lastRequestTime: number = 0;

  constructor(sourceType: DataSourceType, config: TConfig) {
    this.sourceType = sourceType;
    this.config = {
      rateLimitPerMinute: 60,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    } as TConfig;

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Initialize the data source connection
   */
  abstract initialize(): Promise<void>;

  /**
   * Search for content based on parameters
   */
  abstract search(params: TSearchParams): Promise<SearchResult<TContent>>;

  /**
   * Get content by ID
   */
  abstract getById(id: string): Promise<TContent | null>;

  /**
   * Check if the data source is healthy and accessible
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Get current statistics
   */
  getStats(): DataSourceStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Rate limiting implementation
   * Ensures we don't exceed the configured rate limit per minute
   */
  protected async enforceRateLimit(): Promise<void> {
    if (!this.config.rateLimitPerMinute) {
      return;
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove requests older than 1 minute
    this.rateLimitQueue = this.rateLimitQueue.filter((time) => time > oneMinuteAgo);

    // Check if we've hit the rate limit
    if (this.rateLimitQueue.length >= this.config.rateLimitPerMinute) {
      const oldestRequest = this.rateLimitQueue[0];
      const waitTime = 60000 - (now - oldestRequest);

      if (waitTime > 0) {
        this.stats.rateLimitHits++;
        await this.sleep(waitTime);
      }
    }

    // Add current request to queue
    this.rateLimitQueue.push(now);
    this.lastRequestTime = now;
  }

  /**
   * Execute a request with retry logic and error handling
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        await this.enforceRateLimit();

        this.stats.totalRequests++;
        const result = await this.withTimeout(operation(), this.config.timeout || 30000);

        // Update stats on success
        const responseTime = Date.now() - startTime;
        this.updateAverageResponseTime(responseTime);
        this.stats.successfulRequests++;
        this.stats.lastRequest = new Date();

        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof DataSourceError) {
          if (
            error.type === DataSourceErrorType.AUTH_ERROR ||
            error.type === DataSourceErrorType.INVALID_PARAMS
          ) {
            this.stats.failedRequests++;
            throw error;
          }

          // Handle rate limit errors
          if (error.type === DataSourceErrorType.RATE_LIMIT && error.rateLimitInfo) {
            const waitTime = error.rateLimitInfo.reset.getTime() - Date.now();
            if (waitTime > 0 && attempt < (this.config.retryAttempts || 3)) {
              await this.sleep(Math.min(waitTime, 60000)); // Wait max 1 minute
              continue;
            }
          }
        }

        // Exponential backoff for retries
        if (attempt < (this.config.retryAttempts || 3)) {
          const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.stats.failedRequests++;
    throw new DataSourceError(
      DataSourceErrorType.API_ERROR,
      `${context} failed after ${this.config.retryAttempts} retries: ${lastError?.message}`,
      undefined,
      undefined
    );
  }

  /**
   * Wrap a promise with a timeout
   */
  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new DataSourceError(
                DataSourceErrorType.NETWORK_ERROR,
                `Operation timed out after ${timeoutMs}ms`
              )
            ),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update average response time
   */
  protected updateAverageResponseTime(newResponseTime: number): void {
    const totalRequests = this.stats.successfulRequests;
    const currentAverage = this.stats.averageResponseTime;

    this.stats.averageResponseTime =
      (currentAverage * (totalRequests - 1) + newResponseTime) / totalRequests;
  }

  /**
   * Validate search parameters
   */
  protected validateSearchParams(params: TSearchParams): void {
    if (params.limit && params.limit < 1) {
      throw new DataSourceError(
        DataSourceErrorType.INVALID_PARAMS,
        'Limit must be greater than 0'
      );
    }

    if (params.startDate && params.endDate && params.startDate > params.endDate) {
      throw new DataSourceError(
        DataSourceErrorType.INVALID_PARAMS,
        'Start date must be before end date'
      );
    }

    if (params.keywords && params.keywords.length === 0) {
      throw new DataSourceError(
        DataSourceErrorType.INVALID_PARAMS,
        'Keywords array cannot be empty'
      );
    }
  }

  /**
   * Create a rate limit info object
   */
  protected createRateLimitInfo(
    remaining: number,
    reset: number | Date,
    limit: number
  ): RateLimitInfo {
    return {
      remaining,
      reset: reset instanceof Date ? reset : new Date(reset * 1000),
      limit,
    };
  }
}
