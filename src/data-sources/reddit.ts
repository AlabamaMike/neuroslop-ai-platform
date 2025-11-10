import Snoowrap, { Submission, Comment } from 'snoowrap';
import {
  RedditConfig,
  RedditPost,
  RedditComment,
  RedditSearchParams,
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
 * Reddit data source implementation using snoowrap
 */
export class RedditDataSource extends BaseDataSource<
  RedditPost | RedditComment,
  RedditSearchParams,
  RedditConfig
> {
  private client: Snoowrap | null = null;

  constructor(config: RedditConfig) {
    super(DataSourceType.REDDIT, config);
  }

  /**
   * Initialize Reddit client with credentials
   */
  async initialize(): Promise<void> {
    try {
      this.client = new Snoowrap({
        userAgent: this.config.userAgent,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        username: this.config.username,
        password: this.config.password,
      });

      // Configure snoowrap options
      this.client.config({
        requestDelay: 1000, // 1 second between requests
        warnings: false,
        continueAfterRatelimitError: true,
      });

      // Test connection
      await this.healthCheck();
    } catch (error) {
      throw new DataSourceError(
        DataSourceErrorType.AUTH_ERROR,
        `Failed to initialize Reddit client: ${(error as Error).message}`
      );
    }
  }

  /**
   * Search for Reddit posts and optionally comments
   */
  async search(params: RedditSearchParams): Promise<SearchResult<RedditPost | RedditComment>> {
    this.validateSearchParams(params);

    if (!this.client) {
      throw new DataSourceError(
        DataSourceErrorType.AUTH_ERROR,
        'Reddit client not initialized. Call initialize() first.'
      );
    }

    const startTime = Date.now();
    const results: Array<RedditPost | RedditComment> = [];

    try {
      // Search by subreddit if specified
      if (params.subreddits && params.subreddits.length > 0) {
        for (const subredditName of params.subreddits) {
          const subredditResults = await this.searchSubreddit(subredditName, params);
          results.push(...subredditResults);
        }
      } else if (params.keywords && params.keywords.length > 0) {
        // Global search by keywords
        const searchResults = await this.searchByKeywords(params);
        results.push(...searchResults);
      } else {
        throw new DataSourceError(
          DataSourceErrorType.INVALID_PARAMS,
          'Either subreddits or keywords must be specified'
        );
      }

      // Filter by date range if specified
      let filteredResults = this.filterByDateRange(results, params.startDate, params.endDate);

      // Filter by minimum score if specified
      if (params.minScore) {
        filteredResults = filteredResults.filter(
          (item) => item.engagement.score && item.engagement.score >= (params.minScore || 0)
        );
      }

      // Filter by flair if specified
      if (params.flairs && params.flairs.length > 0) {
        filteredResults = filteredResults.filter(
          (item) =>
            'flair' in item && item.flair && params.flairs?.includes(item.flair)
        );
      }

      // Apply limit
      const limit = params.limit || 100;
      const limitedResults = filteredResults.slice(0, limit);

      // Fetch comments if requested
      if (params.includeComments) {
        const commentsResults: RedditComment[] = [];
        for (const result of limitedResults.filter((r): r is RedditPost => 'title' in r)) {
          const comments = await this.getPostComments(result.id, 10);
          commentsResults.push(...comments);
        }
        limitedResults.push(...commentsResults);
      }

      return {
        data: limitedResults,
        total: limitedResults.length,
        hasMore: filteredResults.length > limit,
        metadata: {
          searchParams: params,
          executionTime: Date.now() - startTime,
          source: DataSourceType.REDDIT,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      if (error instanceof DataSourceError) {
        throw error;
      }

      throw new DataSourceError(
        DataSourceErrorType.API_ERROR,
        `Reddit search failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Search within a specific subreddit
   */
  private async searchSubreddit(
    subredditName: string,
    params: RedditSearchParams
  ): Promise<RedditPost[]> {
    return this.executeWithRetry(async () => {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const subreddit = this.client.getSubreddit(subredditName);
      let submissions: Submission[];

      if (params.sortBy === 'date') {
        submissions = await subreddit.getNew({ limit: params.limit || 100 });
      } else if (params.sortBy === 'popularity') {
        submissions = await subreddit.getHot({ limit: params.limit || 100 });
      } else {
        // Default to relevance (hot)
        submissions = await subreddit.getHot({ limit: params.limit || 100 });
      }

      return Promise.all(submissions.map((s) => this.convertSubmissionToPost(s)));
    }, `Search subreddit ${subredditName}`);
  }

  /**
   * Search globally by keywords
   */
  private async searchByKeywords(params: RedditSearchParams): Promise<RedditPost[]> {
    return this.executeWithRetry(async () => {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const query = params.keywords?.join(' OR ') || '';
      const searchOptions: any = {
        query,
        limit: params.limit || 100,
        sort: params.sortBy || 'relevance',
      };

      if (params.startDate) {
        searchOptions.time = 'all';
      }

      const submissions = await this.client.search(searchOptions);
      return Promise.all(submissions.map((s) => this.convertSubmissionToPost(s)));
    }, 'Search by keywords');
  }

  /**
   * Get post by ID
   */
  async getById(id: string): Promise<RedditPost | null> {
    if (!this.client) {
      throw new DataSourceError(
        DataSourceErrorType.AUTH_ERROR,
        'Reddit client not initialized'
      );
    }

    try {
      return await this.executeWithRetry(async () => {
        if (!this.client) {
          throw new Error('Client not initialized');
        }

        const submission = await this.client.getSubmission(id).fetch();
        return this.convertSubmissionToPost(submission);
      }, `Get post ${id}`);
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  private async getPostComments(postId: string, limit: number = 100): Promise<RedditComment[]> {
    return this.executeWithRetry(async () => {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const submission = await this.client.getSubmission(postId).fetch();
      const comments = await submission.comments.fetchAll({ limit });

      const flatComments: RedditComment[] = [];
      const processComment = (comment: Comment, depth: number = 0) => {
        if (comment.body) {
          flatComments.push(this.convertCommentToRedditComment(comment, postId, depth));
        }
        if (comment.replies && Array.isArray(comment.replies)) {
          comment.replies.forEach((reply: Comment) => processComment(reply, depth + 1));
        }
      };

      comments.forEach((comment) => processComment(comment as Comment));
      return flatComments.slice(0, limit);
    }, `Get comments for post ${postId}`);
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
        // Try to fetch a popular subreddit to test connectivity
        await this.client.getSubreddit('test').fetch();
        return true;
      }, 'Health check');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert snoowrap Submission to RedditPost
   */
  private async convertSubmissionToPost(submission: Submission): Promise<RedditPost> {
    const author: Author = {
      id: submission.author.id || 'unknown',
      username: submission.author.name,
    };

    const engagement: EngagementMetrics = {
      likes: submission.ups || 0,
      comments: submission.num_comments || 0,
      shares: 0,
      score: submission.score || 0,
    };

    const text = submission.selftext || submission.title;
    const keywords = this.extractKeywords(text);
    const mentions = this.extractMentions(text);
    const sentiment = this.analyzeSentiment(text);

    return {
      id: submission.id,
      sourceType: DataSourceType.REDDIT,
      title: submission.title,
      text,
      subreddit: submission.subreddit.display_name,
      author,
      createdAt: new Date(submission.created_utc * 1000),
      url: `https://reddit.com${submission.permalink}`,
      engagement,
      sentiment,
      keywords,
      hashtags: [],
      mentions,
      flair: submission.link_flair_text || undefined,
      isStickied: submission.stickied || false,
      isNSFW: submission.over_18 || false,
      domain: submission.domain,
      upvoteRatio: submission.upvote_ratio,
      metadata: {
        gilded: submission.gilded || 0,
        locked: submission.locked || false,
        archived: submission.archived || false,
      },
    };
  }

  /**
   * Convert snoowrap Comment to RedditComment
   */
  private convertCommentToRedditComment(
    comment: Comment,
    postId: string,
    depth: number
  ): RedditComment {
    const author: Author = {
      id: comment.author.id || 'unknown',
      username: comment.author.name,
    };

    const engagement: EngagementMetrics = {
      likes: comment.ups || 0,
      comments: 0,
      shares: 0,
      score: comment.score || 0,
    };

    const keywords = this.extractKeywords(comment.body);
    const mentions = this.extractMentions(comment.body);
    const sentiment = this.analyzeSentiment(comment.body);

    return {
      id: comment.id,
      sourceType: DataSourceType.REDDIT,
      text: comment.body,
      postId,
      parentId: comment.parent_id !== comment.link_id ? comment.parent_id : undefined,
      depth,
      author,
      createdAt: new Date(comment.created_utc * 1000),
      url: `https://reddit.com${comment.permalink}`,
      engagement,
      sentiment,
      keywords,
      hashtags: [],
      mentions,
      isSubmitter: comment.is_submitter || false,
      gilded: comment.gilded || 0,
      metadata: {
        locked: comment.locked || false,
        archived: comment.archived || false,
        controversiality: comment.controversiality || 0,
      },
    };
  }

  /**
   * Filter results by date range
   */
  private filterByDateRange<T extends { createdAt: Date }>(
    items: T[],
    startDate?: Date,
    endDate?: Date
  ): T[] {
    return items.filter((item) => {
      if (startDate && item.createdAt < startDate) {
        return false;
      }
      if (endDate && item.createdAt > endDate) {
        return false;
      }
      return true;
    });
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    return words
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .filter((word) => /^[a-z]+$/.test(word))
      .slice(0, 10);
  }

  /**
   * Extract user mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /u\/([a-zA-Z0-9_-]+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)];
  }

  /**
   * Basic sentiment analysis (placeholder - could be replaced with ML model)
   */
  private analyzeSentiment(text: string): SentimentAnalysis {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'poor'];

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
