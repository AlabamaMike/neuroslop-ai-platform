/**
 * Example usage of the Neuroslop AI Platform data sources
 */

import { RedditDataSource, TwitterDataSource, DataSourceType } from '../index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example: Reddit data collection
 */
async function redditExample() {
  console.log('\n=== Reddit Example ===\n');

  const reddit = new RedditDataSource({
    clientId: process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    userAgent: process.env.REDDIT_USER_AGENT!,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    rateLimitPerMinute: 60,
    timeout: 30000,
    retryAttempts: 3,
  });

  try {
    // Initialize the client
    await reddit.initialize();
    console.log('Reddit client initialized successfully');

    // Search for posts about crypto in specific subreddits
    const searchResult = await reddit.search({
      keywords: ['bitcoin', 'cryptocurrency'],
      subreddits: ['cryptocurrency', 'bitcoin'],
      limit: 10,
      minScore: 100,
      includeComments: false,
      sortBy: 'popularity',
    });

    console.log(`Found ${searchResult.total} posts`);
    console.log(`Search took ${searchResult.metadata.executionTime}ms`);

    // Display results
    searchResult.data.forEach((post) => {
      if ('title' in post) {
        console.log(`\n- ${post.title}`);
        console.log(`  Subreddit: r/${post.subreddit}`);
        console.log(`  Score: ${post.engagement.score}`);
        console.log(`  Comments: ${post.engagement.comments}`);
        console.log(`  Sentiment: ${post.sentiment?.type} (${post.sentiment?.score.toFixed(2)})`);
        console.log(`  URL: ${post.url}`);
      }
    });

    // Get statistics
    const stats = reddit.getStats();
    console.log('\nReddit Stats:', stats);
  } catch (error) {
    console.error('Reddit error:', error);
  }
}

/**
 * Example: Twitter data collection
 */
async function twitterExample() {
  console.log('\n=== Twitter Example ===\n');

  const twitter = new TwitterDataSource({
    apiKey: process.env.TWITTER_API_KEY!,
    apiSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
    rateLimitPerMinute: 450,
    timeout: 30000,
    retryAttempts: 3,
  });

  try {
    // Initialize the client
    await twitter.initialize();
    console.log('Twitter client initialized successfully');

    // Search for tweets about crypto
    const searchResult = await twitter.search({
      keywords: ['bitcoin', 'crypto'],
      hashtags: ['BTC', 'cryptocurrency'],
      limit: 10,
      minLikes: 100,
      language: 'en',
      sortBy: 'popularity',
    });

    console.log(`Found ${searchResult.total} tweets`);
    console.log(`Search took ${searchResult.metadata.executionTime}ms`);

    // Display results
    searchResult.data.forEach((tweet) => {
      console.log(`\n- ${tweet.text.substring(0, 100)}...`);
      console.log(`  Author: @${tweet.author.username}`);
      console.log(`  Likes: ${tweet.engagement.likes}`);
      console.log(`  Retweets: ${tweet.engagement.retweets}`);
      console.log(`  Sentiment: ${tweet.sentiment?.type} (${tweet.sentiment?.score.toFixed(2)})`);
      console.log(`  URL: ${tweet.url}`);
    });

    // Get statistics
    const stats = twitter.getStats();
    console.log('\nTwitter Stats:', stats);
  } catch (error) {
    console.error('Twitter error:', error);
  }
}

/**
 * Example: Combined multi-source analysis
 */
async function combinedExample() {
  console.log('\n=== Combined Multi-Source Analysis ===\n');

  // Initialize both sources
  const reddit = new RedditDataSource({
    clientId: process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    userAgent: process.env.REDDIT_USER_AGENT!,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
  });

  const twitter = new TwitterDataSource({
    apiKey: process.env.TWITTER_API_KEY!,
    apiSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
  });

  try {
    // Initialize both clients
    await Promise.all([reddit.initialize(), twitter.initialize()]);

    // Search both platforms for the same topic
    const keyword = 'bitcoin';
    const [redditResults, twitterResults] = await Promise.all([
      reddit.search({ keywords: [keyword], limit: 20 }),
      twitter.search({ keywords: [keyword], limit: 20 }),
    ]);

    // Aggregate sentiment analysis
    const allContent = [...redditResults.data, ...twitterResults.data];
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    };

    allContent.forEach((item) => {
      if (item.sentiment) {
        sentimentCounts[item.sentiment.type]++;
      }
    });

    console.log(`\nAnalyzed ${allContent.length} items about "${keyword}":`);
    console.log(`- Reddit: ${redditResults.total} posts`);
    console.log(`- Twitter: ${twitterResults.total} tweets`);
    console.log('\nSentiment Distribution:');
    console.log(`- Positive: ${sentimentCounts.positive} (${((sentimentCounts.positive / allContent.length) * 100).toFixed(1)}%)`);
    console.log(`- Negative: ${sentimentCounts.negative} (${((sentimentCounts.negative / allContent.length) * 100).toFixed(1)}%)`);
    console.log(`- Neutral: ${sentimentCounts.neutral} (${((sentimentCounts.neutral / allContent.length) * 100).toFixed(1)}%)`);
    console.log(`- Mixed: ${sentimentCounts.mixed} (${((sentimentCounts.mixed / allContent.length) * 100).toFixed(1)}%)`);

    // Calculate average engagement
    const avgRedditScore =
      redditResults.data.reduce((sum, item) => sum + (item.engagement.score || 0), 0) /
      redditResults.data.length;
    const avgTwitterLikes =
      twitterResults.data.reduce((sum, item) => sum + item.engagement.likes, 0) /
      twitterResults.data.length;

    console.log(`\nAverage Engagement:`);
    console.log(`- Reddit Score: ${avgRedditScore.toFixed(2)}`);
    console.log(`- Twitter Likes: ${avgTwitterLikes.toFixed(2)}`);
  } catch (error) {
    console.error('Combined analysis error:', error);
  }
}

/**
 * Run all examples
 */
async function main() {
  console.log('Neuroslop AI Platform - Data Source Examples');
  console.log('==============================================');

  // Check if environment variables are set
  if (
    !process.env.REDDIT_CLIENT_ID ||
    !process.env.TWITTER_API_KEY ||
    !process.env.TWITTER_BEARER_TOKEN
  ) {
    console.error('\nError: Required environment variables are not set.');
    console.error('Please copy .env.example to .env and fill in your API credentials.');
    process.exit(1);
  }

  try {
    // Run examples
    await redditExample();
    await twitterExample();
    await combinedExample();

    console.log('\n=== Examples completed successfully ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { redditExample, twitterExample, combinedExample };
