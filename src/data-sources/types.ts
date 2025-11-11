/**
 * Unified data types for all data sources
 */

// Common types
export enum DataSourceType {
  REDDIT = 'reddit',
  TWITTER = 'twitter',
  USPTO = 'uspto',
  EDGAR = 'edgar',
}

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed',
}

export interface Author {
  id: string;
  username: string;
  displayName?: string;
  verified?: boolean;
  followerCount?: number;
  createdAt?: Date;
}

export interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  views?: number;
  score?: number;
  replies?: number;
  retweets?: number;
  quotes?: number;
}

export interface SentimentAnalysis {
  type: SentimentType;
  score: number; // -1 to 1 range
  confidence: number; // 0 to 1 range
}

// Base content interface
export interface BaseContent {
  id: string;
  sourceType: DataSourceType;
  text: string;
  author: Author;
  createdAt: Date;
  url: string;
  engagement: EngagementMetrics;
  sentiment?: SentimentAnalysis;
  keywords?: string[];
  hashtags?: string[];
  mentions?: string[];
  metadata: Record<string, any>;
}

// Reddit-specific types
export interface RedditPost extends BaseContent {
  subreddit: string;
  title: string;
  flair?: string;
  isStickied: boolean;
  isNSFW: boolean;
  domain?: string;
  upvoteRatio?: number;
}

export interface RedditComment extends BaseContent {
  postId: string;
  parentId?: string;
  depth: number;
  isSubmitter: boolean;
  gilded: number;
}

// Twitter-specific types
export interface Tweet extends BaseContent {
  isRetweet: boolean;
  isReply: boolean;
  isQuote: boolean;
  inReplyToId?: string;
  quotedTweetId?: string;
  retweetedTweetId?: string;
  language?: string;
  place?: {
    id: string;
    name: string;
    country?: string;
  };
}

// Search parameters
export interface BaseSearchParams {
  keywords?: string[];
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
  startDate?: Date;
  endDate?: Date;
}

export interface RedditSearchParams extends BaseSearchParams {
  subreddits?: string[];
  includeComments?: boolean;
  minScore?: number;
  flairs?: string[];
}

export interface TwitterSearchParams extends BaseSearchParams {
  hashtags?: string[];
  accounts?: string[];
  language?: string;
  hasMedia?: boolean;
  hasLinks?: boolean;
  minLikes?: number;
  minRetweets?: number;
}

// Result types
export interface SearchResult<T extends BaseContent> {
  data: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
  metadata: {
    searchParams: BaseSearchParams;
    executionTime: number;
    source: DataSourceType;
    timestamp: Date;
  };
}

// Rate limiting
export interface RateLimitInfo {
  remaining: number;
  reset: Date;
  limit: number;
}

// Error types
export enum DataSourceErrorType {
  RATE_LIMIT = 'rate_limit',
  AUTH_ERROR = 'auth_error',
  NETWORK_ERROR = 'network_error',
  INVALID_PARAMS = 'invalid_params',
  NOT_FOUND = 'not_found',
  API_ERROR = 'api_error',
  UNKNOWN = 'unknown',
}

export class DataSourceError extends Error {
  constructor(
    public type: DataSourceErrorType,
    message: string,
    public statusCode?: number,
    public rateLimitInfo?: RateLimitInfo
  ) {
    super(message);
    this.name = 'DataSourceError';
    Object.setPrototypeOf(this, DataSourceError.prototype);
  }
}

// Configuration types
export interface BaseDataSourceConfig {
  rateLimitPerMinute?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface RedditConfig extends BaseDataSourceConfig {
  clientId: string;
  clientSecret: string;
  userAgent: string;
  username?: string;
  password?: string;
}

export interface TwitterConfig extends BaseDataSourceConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
  bearerToken?: string;
}

export interface USPTOConfig extends BaseDataSourceConfig {
  baseUrl?: string;
  apiKey?: string;
  userAgent?: string;
}

export interface EDGARConfig extends BaseDataSourceConfig {
  baseUrl?: string;
  userAgent: string; // Required by SEC
  email?: string; // Recommended by SEC
}

// Statistics and analytics
export interface TrendAnalysis {
  keyword: string;
  mentions: number;
  sentiment: SentimentAnalysis;
  growthRate: number;
  peakTime?: Date;
  sources: DataSourceType[];
}

export interface DataSourceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageResponseTime: number;
  lastRequest?: Date;
}
