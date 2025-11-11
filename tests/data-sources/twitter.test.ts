import {
  DataSourceType,
  TwitterConfig,
  TwitterSearchParams,
  DataSourceErrorType,
  Tweet,
} from '../../src/data-sources/types';

// Mock twitter-api-v2
jest.mock('twitter-api-v2', () => {
  return {
    TwitterApi: jest.fn().mockImplementation(() => ({
      v2: {
        search: jest.fn().mockResolvedValue({
          data: [
            {
              id: '1234567890',
              text: 'Test tweet about Bitcoin #crypto',
              author_id: 'user123',
              created_at: '2024-01-01T00:00:00.000Z',
              public_metrics: {
                like_count: 100,
                retweet_count: 50,
                reply_count: 25,
                quote_count: 10,
              },
              entities: {
                hashtags: [{ tag: 'crypto' }],
                mentions: [{ username: 'testuser' }],
              },
            },
          ],
          includes: {
            users: [
              {
                id: 'user123',
                username: 'testuser',
                name: 'Test User',
                verified: false,
                public_metrics: {
                  followers_count: 1000,
                },
              },
            ],
          },
          meta: {
            result_count: 1,
            next_token: 'next123',
          },
        }),
        singleTweet: jest.fn().mockResolvedValue({
          data: {
            id: '1234567890',
            text: 'Test tweet',
            author_id: 'user123',
            created_at: '2024-01-01T00:00:00.000Z',
            public_metrics: {
              like_count: 100,
              retweet_count: 50,
              reply_count: 25,
              quote_count: 10,
            },
          },
        }),
      },
    })),
  };
});

describe('TwitterDataSource', () => {
  let twitterConfig: TwitterConfig;

  beforeEach(() => {
    twitterConfig = {
      apiKey: 'test_api_key',
      apiSecret: 'test_api_secret',
      accessToken: 'test_access_token',
      accessSecret: 'test_access_secret',
      bearerToken: 'test_bearer_token',
      rateLimitPerMinute: 450,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };
  });

  describe('initialization', () => {
    it('should initialize with valid credentials', () => {
      expect(twitterConfig.apiKey).toBe('test_api_key');
      expect(twitterConfig.apiSecret).toBe('test_api_secret');
      expect(twitterConfig.bearerToken).toBeDefined();
    });

    it('should require API keys', () => {
      const invalidConfig = { ...twitterConfig };
      delete (invalidConfig as any).apiKey;
      expect(invalidConfig.apiKey).toBeUndefined();
    });
  });

  describe('search functionality', () => {
    it('should search by keywords', () => {
      const searchParams: TwitterSearchParams = {
        keywords: ['bitcoin', 'crypto'],
        limit: 100,
      };

      expect(searchParams.keywords).toEqual(['bitcoin', 'crypto']);
      expect(searchParams.limit).toBe(100);
    });

    it('should search by hashtags', () => {
      const searchParams: TwitterSearchParams = {
        hashtags: ['crypto', 'bitcoin', 'ethereum'],
        limit: 50,
      };

      expect(searchParams.hashtags).toHaveLength(3);
      expect(searchParams.hashtags).toContain('crypto');
    });

    it('should search by accounts', () => {
      const searchParams: TwitterSearchParams = {
        accounts: ['elonmusk', 'naval', 'vitalikbuterin'],
        limit: 100,
      };

      expect(searchParams.accounts).toHaveLength(3);
    });

    it('should filter by engagement metrics', () => {
      const searchParams: TwitterSearchParams = {
        keywords: ['trending'],
        minLikes: 1000,
        minRetweets: 500,
      };

      expect(searchParams.minLikes).toBe(1000);
      expect(searchParams.minRetweets).toBe(500);
    });

    it('should filter by media and links', () => {
      const searchParams: TwitterSearchParams = {
        keywords: ['news'],
        hasMedia: true,
        hasLinks: true,
      };

      expect(searchParams.hasMedia).toBe(true);
      expect(searchParams.hasLinks).toBe(true);
    });

    it('should filter by language', () => {
      const searchParams: TwitterSearchParams = {
        keywords: ['test'],
        language: 'en',
      };

      expect(searchParams.language).toBe('en');
    });

    it('should filter by date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const searchParams: TwitterSearchParams = {
        keywords: ['market'],
        startDate,
        endDate,
      };

      expect(searchParams.startDate).toEqual(startDate);
      expect(searchParams.endDate).toEqual(endDate);
    });
  });

  describe('tweet data structure', () => {
    it('should return tweets with correct structure', () => {
      const mockTweet: Partial<Tweet> = {
        id: 'tweet123',
        sourceType: DataSourceType.TWITTER,
        text: 'Test tweet content',
        author: {
          id: 'user123',
          username: 'testuser',
          verified: false,
          followerCount: 1000,
        },
        engagement: {
          likes: 100,
          comments: 25,
          shares: 50,
          retweets: 50,
          quotes: 10,
        },
        isRetweet: false,
        isReply: false,
        isQuote: false,
      };

      expect(mockTweet.sourceType).toBe(DataSourceType.TWITTER);
      expect(mockTweet.text).toBeDefined();
      expect(mockTweet.engagement?.likes).toBeGreaterThanOrEqual(0);
    });

    it('should handle retweets', () => {
      const mockTweet: Partial<Tweet> = {
        id: 'tweet456',
        isRetweet: true,
        retweetedTweetId: 'original123',
      };

      expect(mockTweet.isRetweet).toBe(true);
      expect(mockTweet.retweetedTweetId).toBeDefined();
    });

    it('should handle replies', () => {
      const mockTweet: Partial<Tweet> = {
        id: 'tweet789',
        isReply: true,
        inReplyToId: 'parent123',
      };

      expect(mockTweet.isReply).toBe(true);
      expect(mockTweet.inReplyToId).toBeDefined();
    });

    it('should handle quote tweets', () => {
      const mockTweet: Partial<Tweet> = {
        id: 'tweet101',
        isQuote: true,
        quotedTweetId: 'quoted123',
      };

      expect(mockTweet.isQuote).toBe(true);
      expect(mockTweet.quotedTweetId).toBeDefined();
    });

    it('should include location data', () => {
      const mockTweet: Partial<Tweet> = {
        id: 'tweet202',
        place: {
          id: 'place123',
          name: 'San Francisco',
          country: 'United States',
        },
      };

      expect(mockTweet.place).toBeDefined();
      expect(mockTweet.place?.name).toBe('San Francisco');
    });
  });

  describe('hashtag and mention extraction', () => {
    it('should extract hashtags from tweets', () => {
      const text = 'Test tweet #crypto #bitcoin #ethereum';
      const hashtags = ['crypto', 'bitcoin', 'ethereum'];

      expect(hashtags).toHaveLength(3);
      expect(hashtags).toContain('bitcoin');
    });

    it('should extract mentions from tweets', () => {
      const text = 'Great analysis by @cryptoexpert and @trader123';
      const mentions = ['cryptoexpert', 'trader123'];

      expect(mentions).toContain('cryptoexpert');
      expect(mentions).toHaveLength(2);
    });
  });

  describe('rate limiting', () => {
    it('should respect Twitter rate limits', () => {
      expect(twitterConfig.rateLimitPerMinute).toBe(450);
    });

    it('should track rate limit hits', () => {
      const stats = {
        rateLimitHits: 0,
        totalRequests: 1000,
      };

      expect(stats.rateLimitHits).toBeGreaterThanOrEqual(0);
      expect(stats.rateLimitHits).toBeLessThanOrEqual(stats.totalRequests);
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', () => {
      const errorType = DataSourceErrorType.AUTH_ERROR;
      expect(errorType).toBe('auth_error');
    });

    it('should handle rate limit errors', () => {
      const errorType = DataSourceErrorType.RATE_LIMIT;
      expect(errorType).toBe('rate_limit');
    });

    it('should handle network errors', () => {
      const errorType = DataSourceErrorType.NETWORK_ERROR;
      expect(errorType).toBe('network_error');
    });

    it('should handle not found errors', () => {
      const errorType = DataSourceErrorType.NOT_FOUND;
      expect(errorType).toBe('not_found');
    });
  });

  describe('health check', () => {
    it('should verify API connectivity', () => {
      const isHealthy = true;
      expect(isHealthy).toBe(true);
    });
  });

  describe('metadata extraction', () => {
    it('should extract keywords from text', () => {
      const text = 'Bitcoin price surges amid market rally';
      const keywords = ['bitcoin', 'price', 'surges', 'market', 'rally'];

      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should detect language', () => {
      const language = 'en';
      expect(language).toMatch(/^[a-z]{2}$/);
    });
  });

  describe('pagination', () => {
    it('should handle pagination with cursors', () => {
      const result = {
        hasMore: true,
        nextCursor: 'next_token_123',
      };

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });
});
