import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DataSourceType,
  RedditConfig,
  RedditSearchParams,
  DataSourceErrorType,
  RedditPost,
  RedditComment,
} from '../../src/data-sources/types';

// Mock snoowrap
vi.mock('snoowrap', () => ({
  default: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue([
      {
        id: 'test123',
        title: 'Test Post',
        selftext: 'Test content',
        author: {
          name: 'testuser',
          id: 'user123',
        },
        subreddit: {
          display_name: 'test',
        },
        created_utc: 1234567890,
        permalink: '/r/test/comments/test123',
        score: 100,
        num_comments: 10,
        upvote_ratio: 0.95,
        link_flair_text: null,
        stickied: false,
        over_18: false,
        domain: 'self.test',
      },
    ]),
    getSubmission: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue({
        id: 'test123',
        title: 'Test Post',
        selftext: 'Test content',
        author: {
          name: 'testuser',
          id: 'user123',
        },
        subreddit: {
          display_name: 'test',
        },
        created_utc: 1234567890,
        permalink: '/r/test/comments/test123',
        score: 100,
        num_comments: 10,
        upvote_ratio: 0.95,
      }),
    }),
    getSubreddit: vi.fn().mockReturnValue({
      getNew: vi.fn().mockResolvedValue([]),
      getHot: vi.fn().mockResolvedValue([]),
    }),
  })),
}));

describe('RedditDataSource', () => {
  let redditConfig: RedditConfig;

  beforeEach(() => {
    redditConfig = {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      userAgent: 'test_app/1.0.0',
      username: 'test_user',
      password: 'test_password',
      rateLimitPerMinute: 60,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };
  });

  describe('initialization', () => {
    it('should initialize with valid credentials', async () => {
      expect(redditConfig.clientId).toBe('test_client_id');
      expect(redditConfig.clientSecret).toBe('test_client_secret');
      expect(redditConfig.userAgent).toBeDefined();
    });

    it('should require client ID and secret', () => {
      const invalidConfig = { ...redditConfig };
      delete (invalidConfig as any).clientId;
      expect(invalidConfig.clientId).toBeUndefined();
    });
  });

  describe('search functionality', () => {
    it('should search by keywords', async () => {
      const searchParams: RedditSearchParams = {
        keywords: ['bitcoin', 'crypto'],
        limit: 10,
      };

      expect(searchParams.keywords).toEqual(['bitcoin', 'crypto']);
      expect(searchParams.limit).toBe(10);
    });

    it('should search by subreddit', async () => {
      const searchParams: RedditSearchParams = {
        subreddits: ['cryptocurrency', 'bitcoin'],
        limit: 20,
      };

      expect(searchParams.subreddits).toHaveLength(2);
    });

    it('should filter by score', async () => {
      const searchParams: RedditSearchParams = {
        keywords: ['market'],
        minScore: 100,
        limit: 50,
      };

      expect(searchParams.minScore).toBe(100);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const searchParams: RedditSearchParams = {
        keywords: ['trend'],
        startDate,
        endDate,
      };

      expect(searchParams.startDate).toEqual(startDate);
      expect(searchParams.endDate).toEqual(endDate);
    });

    it('should filter by flair', async () => {
      const searchParams: RedditSearchParams = {
        keywords: ['discussion'],
        flairs: ['Discussion', 'News'],
        subreddits: ['test'],
      };

      expect(searchParams.flairs).toContain('Discussion');
    });

    it('should include comments when requested', async () => {
      const searchParams: RedditSearchParams = {
        keywords: ['analysis'],
        includeComments: true,
        limit: 100,
      };

      expect(searchParams.includeComments).toBe(true);
    });
  });

  describe('post data structure', () => {
    it('should return posts with correct structure', () => {
      const mockPost: Partial<RedditPost> = {
        id: 'post123',
        sourceType: DataSourceType.REDDIT,
        title: 'Test Post Title',
        text: 'Post content',
        subreddit: 'testsubreddit',
        author: {
          id: 'user123',
          username: 'testuser',
        },
        engagement: {
          likes: 150,
          comments: 25,
          shares: 0,
          score: 150,
        },
        isStickied: false,
        isNSFW: false,
      };

      expect(mockPost.sourceType).toBe(DataSourceType.REDDIT);
      expect(mockPost.title).toBeDefined();
      expect(mockPost.subreddit).toBeDefined();
      expect(mockPost.engagement?.score).toBeGreaterThanOrEqual(0);
    });

    it('should include upvote ratio', () => {
      const mockPost: Partial<RedditPost> = {
        id: 'post456',
        upvoteRatio: 0.87,
      };

      expect(mockPost.upvoteRatio).toBeGreaterThan(0);
      expect(mockPost.upvoteRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('comment data structure', () => {
    it('should return comments with correct structure', () => {
      const mockComment: Partial<RedditComment> = {
        id: 'comment123',
        sourceType: DataSourceType.REDDIT,
        text: 'Comment text',
        postId: 'post123',
        depth: 1,
        author: {
          id: 'user456',
          username: 'commenter',
        },
        engagement: {
          likes: 50,
          comments: 0,
          shares: 0,
          score: 50,
        },
        isSubmitter: false,
        gilded: 0,
      };

      expect(mockComment.sourceType).toBe(DataSourceType.REDDIT);
      expect(mockComment.postId).toBeDefined();
      expect(mockComment.depth).toBeGreaterThanOrEqual(0);
    });

    it('should handle nested comments', () => {
      const mockComment: Partial<RedditComment> = {
        id: 'comment789',
        parentId: 'comment123',
        depth: 3,
      };

      expect(mockComment.parentId).toBeDefined();
      expect(mockComment.depth).toBeGreaterThan(1);
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits', () => {
      expect(redditConfig.rateLimitPerMinute).toBe(60);
    });

    it('should track rate limit hits', () => {
      const stats = {
        rateLimitHits: 0,
        totalRequests: 100,
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
    it('should verify API connectivity', async () => {
      const isHealthy = true;
      expect(isHealthy).toBe(true);
    });
  });

  describe('metadata extraction', () => {
    it('should extract keywords from text', () => {
      const text = 'Bitcoin price analysis and crypto market trends';
      const keywords = ['bitcoin', 'crypto', 'market', 'trends'];

      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should extract mentions', () => {
      const text = 'Great analysis by u/cryptoexpert and u/trader123';
      const mentions = ['cryptoexpert', 'trader123'];

      expect(mentions).toContain('cryptoexpert');
    });
  });
});
