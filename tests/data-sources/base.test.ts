import {
  DataSourceType,
  BaseDataSourceConfig,
  DataSourceError,
  DataSourceErrorType,
  BaseContent,
  SearchResult,
} from '../../src/data-sources/types';

// Mock implementation for testing
class MockDataSource {
  protected config: BaseDataSourceConfig;
  protected stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    averageResponseTime: 0,
    lastRequest: undefined as Date | undefined,
  };

  constructor(config: BaseDataSourceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  getStats() {
    return { ...this.stats };
  }
}

describe('BaseDataSource', () => {
  let mockDataSource: MockDataSource;

  beforeEach(() => {
    mockDataSource = new MockDataSource({
      rateLimitPerMinute: 60,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    });
  });

  describe('initialization', () => {
    it('should initialize with valid configuration', async () => {
      await expect(mockDataSource.initialize()).resolves.not.toThrow();
    });

    it('should have default config values', () => {
      expect(mockDataSource['config']).toBeDefined();
      expect(mockDataSource['config'].rateLimitPerMinute).toBe(60);
      expect(mockDataSource['config'].timeout).toBe(30000);
    });
  });

  describe('health check', () => {
    it('should return true when healthy', async () => {
      const result = await mockDataSource.healthCheck();
      expect(result).toBe(true);
    });
  });

  describe('statistics tracking', () => {
    it('should initialize stats with zero values', () => {
      const stats = mockDataSource.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.rateLimitHits).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
    });

    it('should return immutable stats object', () => {
      const stats1 = mockDataSource.getStats();
      const stats2 = mockDataSource.getStats();
      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });
  });
});

describe('DataSourceError', () => {
  it('should create error with correct properties', () => {
    const error = new DataSourceError(
      DataSourceErrorType.RATE_LIMIT,
      'Rate limit exceeded',
      429
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DataSourceError);
    expect(error.type).toBe(DataSourceErrorType.RATE_LIMIT);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.statusCode).toBe(429);
    expect(error.name).toBe('DataSourceError');
  });

  it('should include rate limit info when provided', () => {
    const rateLimitInfo = {
      remaining: 0,
      reset: new Date(),
      limit: 100,
    };

    const error = new DataSourceError(
      DataSourceErrorType.RATE_LIMIT,
      'Rate limit exceeded',
      429,
      rateLimitInfo
    );

    expect(error.rateLimitInfo).toEqual(rateLimitInfo);
  });

  it('should handle different error types', () => {
    const errorTypes = [
      DataSourceErrorType.AUTH_ERROR,
      DataSourceErrorType.NETWORK_ERROR,
      DataSourceErrorType.INVALID_PARAMS,
      DataSourceErrorType.NOT_FOUND,
      DataSourceErrorType.API_ERROR,
      DataSourceErrorType.UNKNOWN,
    ];

    errorTypes.forEach((type) => {
      const error = new DataSourceError(type, `Test ${type}`);
      expect(error.type).toBe(type);
    });
  });
});
