# Data Sources Documentation

This document provides comprehensive documentation for the data source integrations in the Neurosymbolic Market Signals Platform.

## Table of Contents

- [Overview](#overview)
- [Base Architecture](#base-architecture)
- [USPTO Integration](#uspto-integration)
- [EDGAR Integration](#edgar-integration)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)
- [Best Practices](#best-practices)

## Overview

The platform provides a unified architecture for integrating with various data sources. All data sources extend the `BaseDataSource` class and implement a consistent interface for searching, retrieving, and analyzing data.

### Supported Data Sources

- **USPTO**: United States Patent and Trademark Office - Patent data
- **EDGAR**: SEC Electronic Data Gathering, Analysis, and Retrieval - Company filings

## Base Architecture

All data sources share a common architecture defined in `src/data-sources/base.ts`.

### BaseDataSource Class

```typescript
abstract class BaseDataSource<TContent, TSearchParams, TConfig> {
  abstract initialize(): Promise<void>;
  abstract search(params: TSearchParams): Promise<SearchResult<TContent>>;
  abstract getById(id: string): Promise<TContent | null>;
  abstract healthCheck(): Promise<boolean>;

  getStats(): DataSourceStats;
  resetStats(): void;
}
```

### Key Features

- **Automatic Retry Logic**: Failed requests are automatically retried with exponential backoff
- **Rate Limiting**: Prevents exceeding API rate limits
- **Statistics Tracking**: Monitors request counts, success rates, and response times
- **Error Handling**: Standardized error types and handling
- **Type Safety**: Full TypeScript support with comprehensive types

## USPTO Integration

### Overview

The USPTO integration provides access to patent data from the United States Patent and Trademark Office.

### Configuration

```typescript
interface USPTOConfig {
  baseUrl?: string;              // Default: 'https://developer.uspto.gov/api'
  apiKey?: string;               // Optional API key
  userAgent?: string;            // User agent string
  timeout?: number;              // Request timeout (default: 30000ms)
  retryAttempts?: number;        // Retry attempts (default: 3)
  rateLimitPerMinute?: number;   // Rate limit (default: 60)
}
```

### Initialization

```typescript
import { USPTODataSource } from 'neuroslop-ai-platform';

const uspto = new USPTODataSource({
  baseUrl: 'https://developer.uspto.gov/api',
  apiKey: process.env.USPTO_API_KEY,
  userAgent: 'MyApp/1.0',
  rateLimitPerMinute: 60
});

await uspto.initialize();
```

### Searching Patents

#### By Keywords

```typescript
const result = await uspto.search({
  keywords: ['artificial intelligence', 'machine learning'],
  limit: 10,
  offset: 0
});
```

#### By Company (Assignee)

```typescript
const result = await uspto.searchPatents({
  assignees: ['Apple Inc.', 'Google LLC'],
  filingDateStart: new Date('2020-01-01'),
  filingDateEnd: new Date('2023-12-31'),
  limit: 20
});
```

#### By Inventor

```typescript
const result = await uspto.searchPatents({
  inventors: ['John Smith'],
  types: ['UTILITY'],
  limit: 10
});
```

#### With Status Filter

```typescript
const result = await uspto.searchPatents({
  keywords: ['blockchain'],
  status: ['GRANTED', 'PENDING'],
  limit: 50
});
```

### Retrieving Specific Patents

```typescript
const patent = await uspto.getPatentByNumber('US10000000');

if (patent) {
  console.log(patent.title);
  console.log(patent.abstract);
  console.log(patent.inventors);
  console.log(patent.assignees);
  console.log(patent.claims);
}
```

### Patent Analytics

#### Get Trends

```typescript
const trends = await uspto.getPatentTrends({
  assignees: ['Microsoft Corporation'],
  filingDateStart: new Date('2020-01-01'),
  filingDateEnd: new Date('2023-12-31')
});

trends.forEach(trend => {
  console.log(`${trend.period}: ${trend.filingCount} filed, ${trend.grantCount} granted`);
});
```

#### Get Analytics

```typescript
const analytics = await uspto.getPatentAnalytics({
  assignees: ['IBM'],
  filingDateStart: new Date('2022-01-01'),
  filingDateEnd: new Date('2022-12-31')
});

console.log('Total Patents:', analytics.totalPatents);
console.log('By Status:', analytics.byStatus);
console.log('Top Inventors:', analytics.topInventors);
console.log('Top Classifications:', analytics.topClassifications);
console.log('Avg Time to Grant:', analytics.avgTimeToGrant, 'days');
```

### Patent Types

```typescript
enum PatentType {
  UTILITY = 'UTILITY',
  DESIGN = 'DESIGN',
  PLANT = 'PLANT',
  REISSUE = 'REISSUE',
  PROVISIONAL = 'PROVISIONAL'
}

enum PatentStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  ABANDONED = 'ABANDONED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}
```

### Example Use Cases

1. **Innovation Tracking**: Monitor patent filings by competitors
2. **Technology Trends**: Identify emerging technology areas
3. **IP Portfolio Analysis**: Analyze patent portfolios of companies
4. **Inventor Research**: Track prolific inventors in specific fields
5. **Prior Art Search**: Find relevant patents for patent applications

## EDGAR Integration

### Overview

The EDGAR integration provides access to SEC filings from public companies.

### Configuration

```typescript
interface EDGARConfig {
  baseUrl?: string;              // Default: 'https://data.sec.gov'
  userAgent: string;             // REQUIRED by SEC
  email?: string;                // Recommended by SEC
  timeout?: number;              // Request timeout (default: 30000ms)
  retryAttempts?: number;        // Retry attempts (default: 3)
  rateLimitPerMinute?: number;   // Rate limit (default: 600 = 10/sec)
}
```

### Initialization

```typescript
import { EDGARDataSource } from 'neuroslop-ai-platform';

const edgar = new EDGARDataSource({
  baseUrl: 'https://data.sec.gov',
  userAgent: 'MyCompany contact@example.com', // REQUIRED!
  email: 'contact@example.com',
  rateLimitPerMinute: 600 // SEC allows 10 requests per second
});

await edgar.initialize();
```

**Important**: The SEC requires a proper User-Agent header with contact information. Failure to provide this will result in blocked requests.

### Searching Companies

```typescript
// By company name
const company = await edgar.searchCompany('Apple Inc.');

// By ticker symbol
const company = await edgar.searchCompany('AAPL');

// By CIK
const company = await edgar.getCompanyByCIK('0000320193');
```

### Searching Filings

#### By Company and Form Type

```typescript
const filings = await edgar.searchFilings({
  company: 'Microsoft',
  formTypes: ['10-K', '10-Q'],
  filingDateStart: new Date('2020-01-01'),
  filingDateEnd: new Date('2023-12-31'),
  limit: 20
});
```

#### By Ticker

```typescript
const filings = await edgar.searchFilings({
  tickers: ['AAPL', 'MSFT'],
  formTypes: ['8-K'],
  limit: 50
});
```

#### By CIK

```typescript
const filings = await edgar.searchFilings({
  ciks: ['0000789019'], // Microsoft
  formTypes: ['10-K'],
  limit: 10
});
```

#### With Keywords

```typescript
const filings = await edgar.searchFilings({
  company: 'Tesla',
  keywords: ['artificial intelligence', 'autonomous driving'],
  formTypes: ['10-K'],
  limit: 5
});
```

### Retrieving Specific Filings

```typescript
const filing = await edgar.getFilingByAccessionNumber('0000320193-23-000077');

if (filing) {
  console.log(filing.companyName);
  console.log(filing.formType);
  console.log(filing.filingDate);
  console.log(filing.filingUrl);
  console.log(filing.primaryDocument);
}
```

### Extracting Financial Data

```typescript
const financials = await edgar.extractFinancialData('0000320193-23-000077');

if (financials) {
  console.log('Period:', financials.period);
  console.log('Revenue:', financials.metrics.revenue);
  console.log('Net Income:', financials.metrics.netIncome);
  console.log('EPS:', financials.metrics.epsBasic);
  console.log('Total Assets:', financials.metrics.totalAssets);
}
```

### Extracting Risk Factors

```typescript
const risks = await edgar.extractRiskFactors('0000320193-23-000077');

risks.forEach(risk => {
  console.log('Category:', risk.category);
  console.log('Severity:', risk.severity);
  console.log('Description:', risk.description);
});
```

### Extracting Management Discussion

```typescript
const mda = await edgar.extractManagementDiscussion('0000320193-23-000077');

if (mda) {
  console.log('Word Count:', mda.wordCount);
  console.log('Sections:', mda.sections?.length);
  console.log('Sentiment:', mda.sentiment);
  console.log('Mentioned Metrics:', mda.mentionedMetrics);
}
```

### Company Statistics

```typescript
const stats = await edgar.getCompanyFilingStats('0000789019');

console.log('Company:', stats.companyName);
console.log('Total Filings:', stats.totalFilings);
console.log('Filings by Type:', stats.filingsByType);
console.log('Recent Filings:', stats.recentFilings);
console.log('Avg Filings/Year:', stats.avgFilingsPerYear);
```

### Filing Trends

```typescript
const trends = await edgar.getFilingTrends({
  company: 'Tesla',
  filingDateStart: new Date('2020-01-01'),
  filingDateEnd: new Date('2023-12-31')
});

trends.forEach(trend => {
  console.log(`${trend.period}: ${trend.filingCount} filings`);
  console.log('By Type:', trend.byType);
});
```

### SEC Filing Types

```typescript
enum SECFilingType {
  FORM_10K = '10-K',      // Annual report
  FORM_10Q = '10-Q',      // Quarterly report
  FORM_8K = '8-K',        // Current report
  FORM_S1 = 'S-1',        // Registration statement
  FORM_4 = '4',           // Insider trading
  FORM_DEF14A = 'DEF 14A', // Proxy statement
  // ... and more
}
```

### Example Use Cases

1. **Financial Analysis**: Extract and analyze financial metrics
2. **Risk Assessment**: Monitor risk factors in filings
3. **Compliance Monitoring**: Track regulatory filings
4. **Insider Trading**: Monitor Form 4 insider transactions
5. **Corporate Events**: Track 8-K filings for material events
6. **Competitor Analysis**: Compare financial performance

## Error Handling

All data sources use a standardized error handling approach:

```typescript
import { DataSourceError, DataSourceErrorType } from 'neuroslop-ai-platform';

try {
  const result = await uspto.searchPatents(query);
} catch (error) {
  if (error instanceof DataSourceError) {
    switch (error.type) {
      case DataSourceErrorType.NETWORK_ERROR:
        console.error('Network error:', error.message);
        break;
      case DataSourceErrorType.RATE_LIMIT:
        console.error('Rate limit exceeded:', error.rateLimitInfo);
        break;
      case DataSourceErrorType.AUTH_ERROR:
        console.error('Authentication failed:', error.message);
        break;
      case DataSourceErrorType.INVALID_PARAMS:
        console.error('Invalid parameters:', error.message);
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

### Error Types

- `NETWORK_ERROR`: Network connectivity issues
- `AUTH_ERROR`: Authentication/authorization failures
- `RATE_LIMIT`: Rate limit exceeded
- `INVALID_PARAMS`: Invalid query parameters
- `NOT_FOUND`: Resource not found
- `API_ERROR`: API-specific errors
- `TIMEOUT`: Request timeout
- `UNKNOWN`: Unknown errors

## Rate Limiting

Both data sources implement automatic rate limiting to prevent exceeding API limits.

### USPTO Rate Limits

- Default: 60 requests per minute
- Automatically enforced with request queuing
- Configurable via `rateLimitPerMinute`

### EDGAR Rate Limits

- SEC Limit: 10 requests per second
- Default: 600 requests per minute (10/sec)
- Automatically enforced with request queuing
- **Important**: Exceeding limits may result in IP blocking by SEC

```typescript
const edgar = new EDGARDataSource({
  userAgent: 'MyApp contact@example.com',
  rateLimitPerMinute: 600 // 10 requests per second
});
```

## Caching

Both data sources implement in-memory caching to reduce redundant API calls:

```typescript
// First request - fetches from API
const result1 = await uspto.searchPatents(query);

// Second request - returns cached result
const result2 = await uspto.searchPatents(query);

// Clear cache
uspto.clearCache();
```

### Cache Configuration

- Default TTL: 1 hour (3600000ms)
- Cache key: Based on method name and parameters
- Automatic expiration
- Manual clearing available

## Best Practices

### 1. Initialize Once, Reuse Often

```typescript
// Good
const uspto = new USPTODataSource(config);
await uspto.initialize();

// Use uspto multiple times...

// Bad
for (const company of companies) {
  const uspto = new USPTODataSource(config);
  await uspto.initialize();
  // ...
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  const result = await edgar.searchFilings(query);
} catch (error) {
  if (error instanceof DataSourceError) {
    if (error.type === DataSourceErrorType.RATE_LIMIT) {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 60000));
      return edgar.searchFilings(query);
    }
  }
  throw error;
}
```

### 3. Use Pagination for Large Result Sets

```typescript
async function getAllFilings(edgar: EDGARDataSource, query: SECFilingSearchQuery) {
  const allFilings = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const result = await edgar.searchFilings({ ...query, limit, offset });
    allFilings.push(...result.data);

    if (!result.metadata.hasMore) break;
    offset += limit;
  }

  return allFilings;
}
```

### 4. Monitor Statistics

```typescript
const stats = uspto.getStats();

if (stats.failedRequests > 10) {
  console.warn('High failure rate detected');
}

if (stats.rateLimitHits > 5) {
  console.warn('Frequently hitting rate limits');
}
```

### 5. Use Specific Queries

```typescript
// Good - Specific query
const result = await uspto.searchPatents({
  assignees: ['Apple Inc.'],
  filingDateStart: new Date('2022-01-01'),
  filingDateEnd: new Date('2022-12-31'),
  status: ['GRANTED'],
  limit: 20
});

// Bad - Too broad
const result = await uspto.searchPatents({
  keywords: ['technology'],
  limit: 1000
});
```

### 6. Respect SEC Requirements

When using EDGAR:

```typescript
// Always provide proper User-Agent with contact info
const edgar = new EDGARDataSource({
  userAgent: 'CompanyName contact@company.com',
  email: 'contact@company.com'
});

// Respect rate limits
const edgar = new EDGARDataSource({
  userAgent: 'CompanyName contact@company.com',
  rateLimitPerMinute: 600 // Stay at or below 10 req/sec
});
```

## Testing

Both data sources include comprehensive test suites:

```bash
# Run all data source tests
npm test

# Run USPTO tests only
npm test -- uspto.test.ts

# Run EDGAR tests only
npm test -- edgar.test.ts

# Run with coverage
npm run test:coverage
```

## Support

For issues, questions, or contributions:

- GitHub Issues: [Submit an issue](https://github.com/yourusername/neuroslop-ai-platform/issues)
- Documentation: [Full docs](https://github.com/yourusername/neuroslop-ai-platform/docs)
- Examples: See `examples/` directory

## License

MIT License - See LICENSE file for details
