import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import {
  TwitterConfig,
  Tweet,
  TwitterSearchParams,
  SearchResult,
  DataSourceType,
  DataSourceError,
  DataSourceErrorType,
  Author,
  EngagementMetrics,
  SentimentType,
  SentimentAnalysis,
} from './types';
import { BaseDataSource } from './base';

/**
 * Twitter/X data source implementation using twitter-api-v2
 */
export class TwitterDataSource extends BaseDataSource<Tweet, TwitterSearchParams, TwitterConfig> {
  private client: TwitterApi | null = null;

  constructor(config: TwitterConfig) {
    super(DataSourceType.TWITTER, config);
  }

  /**
   * Initialize Twitter client with credentials
   */
  async initialize(): Promise<void> {
    try {
      // Initialize with bearer token for read-only operations
      if (this.config.bearerToken) {
        this.client = new TwitterApi(this.config.bearerToken);
      } else {
        // Initialize with OAuth 1.0a
        this.client = new TwitterApi({
          appKey: this.config.apiKey,
          appSecret: this.config.apiSecret,
          accessToken: this.config.accessToken,
          accessSecret: this.config.accessSecret,
        });
      }

      // Test connection
      await this.healthCheck();
    } catch (error) {
      throw new DataSourceError(
        DataSourceErrorType.AUTH_ERROR,
        `Failed to initialize Twitter client: ${(error as Error).message}`
      );
    }
  }

  /**
   * Search for tweets based on parameters
   */
  async search(params: TwitterSearchParams): Promise<SearchResult<Tweet>> {
    this.validateSearchParams(params);

    if (!this.client) {
      throw new DataSourceError(
        DataSourceErrorType.AUTH_ERROR,
        'Twitter client not initialized. Call initialize() first.'
      );
    }

    const startTime = Date.now();

    try {
      const query = this.buildSearchQuery(params);
      const searchOptions: any = {
        query,
        max_results: Math.min(params.limit || 100, 100), // Twitter API max is 100 per request
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'author_id',
          'lang',
          'entities',
          'referenced_tweets',
          'geo',
        ],
        'user.fields': ['name', 'username', 'verified', 'public_metrics', 'created_at'],
        expansions: ['author_id', 'referenced_tweets.id', 'geo.place_id'],
      };

      // Add date filters
      if (params.startDate) {
        searchOptions.start_time = params.startDate.toISOString();
      }
      if (params.endDate) {
        searchOptions.end_time = params.endDate.toISOString();
      }

      const response = await this.executeWithRetry(async () => {
        if (!this.client) {
          throw new Error('Client not initialized');
        }
        return await this.client.v2.search(searchOptions);
      }, 'Search tweets');

      const tweets = await this.processSearchResponse(response, params);

      return {
        data: tweets,
        total: tweets.length,
        hasMore: !!response.meta?.next_token,
        nextCursor: response.meta?.next_token,
        metadata: {
          searchParams: params,
          executionTime: Date.now() - startTime,
          source: DataSourceType.TWITTER,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      if (error instanceof DataSourceError) {
        throw error;
      }

      // Check if it's a rate limit error
      if ((error as any).code === 429 || (error as any).statusCode === 429) {
        const resetTime = (error as any).rateLimit?.reset || Date.now() + 15 * 60 * 1000;
        throw new DataSourceError(
          DataSourceErrorType.RATE_LIMIT,
          'Twitter rate limit exceeded',
          429,
          this.createRateLimitInfo(0, resetTime, (error as any).rateLimit?.limit || 450)
        );
      }

      throw new DataSourceError(
        DataSourceErrorType.API_ERROR,
        `Twitter search failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get tweet by ID
   */
  async getById(id: string): Promise<Tweet | null> {
    if (!this.client) {
      throw new DataSourceError(
        DataSourceErrorType.AUTH_ERROR,
        'Twitter client not initialized'
      );
    }

    try {
      return await this.executeWithRetry(async () => {
        if (!this.client) {
          throw new Error('Client not initialized');
        }

        const response = await this.client.v2.singleTweet(id, {
          'tweet.fields': [
            'created_at',
            'public_metrics',
            'author_id',
            'lang',
            'entities',
            'referenced_tweets',
            'geo',
          ],
          'user.fields': ['name', 'username', 'verified', 'public_metrics', 'created_at'],
          expansions: ['author_id', 'referenced_tweets.id', 'geo.place_id'],
        });

        if (!response.data) {
          return null;
        }

        const users = response.includes?.users || [];
        const author = users.find((u) => u.id === response.data.author_id);

        return this.convertTweetV2ToTweet(response.data, author);
      }, `Get tweet ${id}`);
    } catch (error) {
      if ((error as any).code === 404 || (error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Health check - verify API is accessible
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.executeWithRetry(async () => {
        if (!this.client) {
          throw new Error('Client not initialized');
        }
        // Try to get rate limit status to verify connection
        await this.client.v2.search('test', { max_results: 10 });
        return true;
      }, 'Health check');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build search query from parameters
   */
  private buildSearchQuery(params: TwitterSearchParams): string {
    const queryParts: string[] = [];

    // Add keywords
    if (params.keywords && params.keywords.length > 0) {
      const keywordQuery = params.keywords.map((k) => `"${k}"`).join(' OR ');
      queryParts.push(`(${keywordQuery})`);
    }

    // Add hashtags
    if (params.hashtags && params.hashtags.length > 0) {
      const hashtagQuery = params.hashtags.map((h) => `#${h}`).join(' OR ');
      queryParts.push(`(${hashtagQuery})`);
    }

    // Add account filters
    if (params.accounts && params.accounts.length > 0) {
      const accountQuery = params.accounts.map((a) => `from:${a}`).join(' OR ');
      queryParts.push(`(${accountQuery})`);
    }

    // Add media filter
    if (params.hasMedia) {
      queryParts.push('has:media');
    }

    // Add links filter
    if (params.hasLinks) {
      queryParts.push('has:links');
    }

    // Add language filter
    if (params.language) {
      queryParts.push(`lang:${params.language}`);
    }

    // Add engagement filters
    if (params.minLikes) {
      queryParts.push(`min_faves:${params.minLikes}`);
    }

    if (params.minRetweets) {
      queryParts.push(`min_retweets:${params.minRetweets}`);
    }

    // Exclude retweets by default
    queryParts.push('-is:retweet');

    return queryParts.join(' ');
  }

  /**
   * Process search response and convert to tweets
   */
  private async processSearchResponse(response: any, params: TwitterSearchParams): Promise<Tweet[]> {
    const tweets: Tweet[] = [];
    const users = response.includes?.users || [];
    const referencedTweets = response.includes?.tweets || [];

    for (const tweetData of response.data || []) {
      const author = users.find((u: UserV2) => u.id === tweetData.author_id);
      const tweet = this.convertTweetV2ToTweet(tweetData, author, referencedTweets);

      // Apply additional filters
      if (params.minLikes && tweet.engagement.likes < params.minLikes) {
        continue;
      }

      if (params.minRetweets && tweet.engagement.retweets && tweet.engagement.retweets < params.minRetweets) {
        continue;
      }

      tweets.push(tweet);
    }

    return tweets;
  }

  /**
   * Convert Twitter API v2 tweet to our Tweet format
   */
  private convertTweetV2ToTweet(
    tweetData: TweetV2,
    authorData?: UserV2,
    referencedTweets?: TweetV2[]
  ): Tweet {
    const author: Author = {
      id: tweetData.author_id || 'unknown',
      username: authorData?.username || 'unknown',
      displayName: authorData?.name,
      verified: authorData?.verified || false,
      followerCount: authorData?.public_metrics?.followers_count,
      createdAt: authorData?.created_at ? new Date(authorData.created_at) : undefined,
    };

    const metrics = tweetData.public_metrics || {
      like_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0,
    };

    const engagement: EngagementMetrics = {
      likes: metrics.like_count || 0,
      shares: metrics.retweet_count || 0,
      comments: metrics.reply_count || 0,
      retweets: metrics.retweet_count || 0,
      quotes: metrics.quote_count || 0,
    };

    // Extract hashtags and mentions
    const hashtags =
      tweetData.entities?.hashtags?.map((h: any) => h.tag) || [];
    const mentions =
      tweetData.entities?.mentions?.map((m: any) => m.username) || [];

    // Extract keywords
    const keywords = this.extractKeywords(tweetData.text);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(tweetData.text);

    // Determine tweet type
    const referencedTweetTypes = tweetData.referenced_tweets || [];
    const isRetweet = referencedTweetTypes.some((rt: any) => rt.type === 'retweeted');
    const isReply = referencedTweetTypes.some((rt: any) => rt.type === 'replied_to');
    const isQuote = referencedTweetTypes.some((rt: any) => rt.type === 'quoted');

    const inReplyToId = referencedTweetTypes.find((rt: any) => rt.type === 'replied_to')?.id;
    const quotedTweetId = referencedTweetTypes.find((rt: any) => rt.type === 'quoted')?.id;
    const retweetedTweetId = referencedTweetTypes.find((rt: any) => rt.type === 'retweeted')?.id;

    return {
      id: tweetData.id,
      sourceType: DataSourceType.TWITTER,
      text: tweetData.text,
      author,
      createdAt: new Date(tweetData.created_at || Date.now()),
      url: `https://twitter.com/${author.username}/status/${tweetData.id}`,
      engagement,
      sentiment,
      keywords,
      hashtags,
      mentions,
      isRetweet,
      isReply,
      isQuote,
      inReplyToId,
      quotedTweetId,
      retweetedTweetId,
      language: tweetData.lang,
      metadata: {
        possiblyTruncated: tweetData.text.length >= 280,
        conversationId: tweetData.conversation_id,
      },
    };
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    // Remove URLs
    const cleanText = text.replace(/https?:\/\/\S+/g, '');

    const words = cleanText.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'is',
      'are',
      'was',
      'were',
    ]);

    return words
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .filter((word) => /^[a-z]+$/.test(word))
      .slice(0, 10);
  }

  /**
   * Basic sentiment analysis (placeholder - could be replaced with ML model)
   */
  private analyzeSentiment(text: string): SentimentAnalysis {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'love',
      'best',
      'awesome',
      'bullish',
      'moon',
      'excited',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'worst',
      'hate',
      'awful',
      'horrible',
      'poor',
      'bearish',
      'crash',
      'dump',
    ];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 1;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 1;
    });

    const normalizedScore = Math.max(-1, Math.min(1, score / 10));

    let type: SentimentType;
    if (normalizedScore > 0.2) {
      type = SentimentType.POSITIVE;
    } else if (normalizedScore < -0.2) {
      type = SentimentType.NEGATIVE;
    } else {
      type = SentimentType.NEUTRAL;
    }

    return {
      type,
      score: normalizedScore,
      confidence: 0.6, // Placeholder confidence
    };
  }
}
