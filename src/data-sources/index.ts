/**
 * Data Sources Module
 *
 * Provides unified access to various social media data sources including Reddit and Twitter/X.
 * All data sources implement a common interface with built-in rate limiting, error handling,
 * and retry logic.
 */

// Export types
export * from './types';

// Export base class
export { BaseDataSource } from './base';

// Export data source implementations
export { RedditDataSource } from './reddit';
export { TwitterDataSource } from './twitter';
export { USPTODataSource } from './uspto';
export { EDGARDataSource } from './edgar';

// Re-export commonly used types for convenience
export type {
  BaseContent,
  RedditPost,
  RedditComment,
  Tweet,
  SearchResult,
  EngagementMetrics,
  SentimentAnalysis,
  Author,
} from './types';

export {
  DataSourceType,
  SentimentType,
  DataSourceErrorType,
  DataSourceError,
} from './types';

// Export government data types
export type {
  Inventor,
  Assignee,
  Patent,
  PatentClassification,
  PatentSearchQuery,
  PatentTrendDataPoint,
  PatentAnalytics,
  SECCompany,
  SECFiling,
  SECFilingSearchQuery,
  FinancialData,
  RiskFactor,
  ManagementDiscussion,
  CompanyFilingStats,
  FilingTrendDataPoint
} from './government-types';

export {
  PatentStatus,
  PatentType,
  SECFilingType
} from './government-types';

// Export USPTO-specific types from uspto.ts
export type {
  USPTOContent,
  USPTOSearchParams,
  USPTOConfig
} from './uspto';

// Export EDGAR-specific types from edgar.ts
export type {
  EDGARContent,
  EDGARSearchParams,
  EDGARConfig
} from './edgar';
