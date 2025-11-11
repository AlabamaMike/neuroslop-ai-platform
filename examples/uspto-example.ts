/**
 * USPTO Data Source Usage Example
 *
 * Demonstrates how to use the USPTO integration to search and analyze patent data
 */

import { USPTODataSource } from '../src/data-sources/uspto';
import { PatentSearchQuery, PatentStatus, PatentType } from '../src/data-sources/government-types';

async function main() {
  // Initialize the USPTO data source
  const uspto = new USPTODataSource({
    baseUrl: 'https://developer.uspto.gov/api',
    apiKey: process.env.USPTO_API_KEY, // Optional
    userAgent: 'MyApp/1.0',
    timeout: 30000,
    maxRetries: 3,
    rateLimitPerMinute: 60
  });

  try {
    // Initialize and test connection
    console.log('Initializing USPTO connection...');
    await uspto.initialize();
    const isHealthy = await uspto.healthCheck();
    console.log(`Connection status: ${isHealthy ? 'Connected' : 'Failed'}`);

    // Example 1: Search patents by keyword
    console.log('\n--- Example 1: Search patents by keyword ---');
    const keywordSearch = await uspto.search({
      keywords: ['artificial intelligence', 'machine learning'],
      limit: 10
    });

    console.log(`Found ${keywordSearch.metadata.total} patents`);
    keywordSearch.items.slice(0, 3).forEach(patent => {
      console.log(`- ${patent.patentNumber}: ${patent.title}`);
      console.log(`  Filed: ${patent.filingDate.toLocaleDateString()}`);
      console.log(`  Status: ${patent.patentStatus}`);
    });

    // Example 2: Search patents by company (assignee)
    console.log('\n--- Example 2: Search patents by company ---');
    const companySearch: PatentSearchQuery = {
      assignees: ['Apple Inc.', 'Google LLC'],
      filingDateStart: new Date('2022-01-01'),
      filingDateEnd: new Date('2023-12-31'),
      status: [PatentStatus.GRANTED],
      limit: 20
    };

    const companyResult = await uspto.searchPatents(companySearch);
    console.log(`Found ${companyResult.metadata.totalResults} granted patents`);

    // Example 3: Search patents by inventor
    console.log('\n--- Example 3: Search patents by inventor ---');
    const inventorSearch: PatentSearchQuery = {
      inventors: ['John Smith'],
      types: [PatentType.UTILITY],
      limit: 10
    };

    const inventorResult = await uspto.searchPatents(inventorSearch);
    console.log(`Found ${inventorResult.metadata.totalResults} patents`);

    // Example 4: Get specific patent by number
    console.log('\n--- Example 4: Get patent by number ---');
    const patent = await uspto.getPatentByNumber('US10000000');

    if (patent) {
      console.log(`Patent: ${patent.patentNumber}`);
      console.log(`Title: ${patent.title}`);
      console.log(`Abstract: ${patent.abstract.substring(0, 200)}...`);
      console.log(`Inventors: ${patent.inventors.map(i => i.name).join(', ')}`);
      console.log(`Assignees: ${patent.assignees.map(a => a.name).join(', ')}`);
      console.log(`Filing Date: ${patent.filingDate.toLocaleDateString()}`);
      if (patent.grantDate) {
        console.log(`Grant Date: ${patent.grantDate.toLocaleDateString()}`);
      }
      if (patent.claims) {
        console.log(`Number of Claims: ${patent.claims.length}`);
      }
    }

    // Example 5: Get patent trends
    console.log('\n--- Example 5: Patent filing trends ---');
    const trends = await uspto.getPatentTrends({
      assignees: ['Microsoft Corporation'],
      filingDateStart: new Date('2020-01-01'),
      filingDateEnd: new Date('2023-12-31')
    });

    console.log('Filing trends by month:');
    trends.slice(0, 6).forEach(trend => {
      console.log(`${trend.period.toLocaleDateString()}: ${trend.filingCount} filed, ${trend.grantCount} granted`);
    });

    // Example 6: Patent analytics
    console.log('\n--- Example 6: Patent analytics ---');
    const analytics = await uspto.getPatentAnalytics({
      assignees: ['IBM'],
      filingDateStart: new Date('2022-01-01'),
      filingDateEnd: new Date('2022-12-31')
    });

    console.log(`Total Patents: ${analytics.totalPatents}`);
    console.log('\nPatents by Status:');
    Object.entries(analytics.byStatus).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`  ${status}: ${count}`);
      }
    });

    console.log('\nTop Inventors:');
    analytics.topInventors.slice(0, 5).forEach(inv => {
      console.log(`  ${inv.name}: ${inv.count} patents`);
    });

    console.log('\nTop Classifications:');
    analytics.topClassifications.slice(0, 5).forEach(cls => {
      console.log(`  ${cls.code}: ${cls.count} patents`);
    });

    if (analytics.avgTimeToGrant) {
      console.log(`\nAverage Time to Grant: ${Math.round(analytics.avgTimeToGrant)} days`);
    }

    // Example 7: Pagination
    console.log('\n--- Example 7: Pagination ---');
    const page1 = await uspto.search({
      keywords: ['blockchain'],
      limit: 5,
      offset: 0
    });

    const page2 = await uspto.search({
      keywords: ['blockchain'],
      limit: 5,
      offset: 5
    });

    console.log(`Page 1: ${page1.items.length} results`);
    console.log(`Page 2: ${page2.items.length} results`);
    console.log(`More available: ${page2.metadata.hasMore}`);

    // Example 8: Sorting
    console.log('\n--- Example 8: Sorted search ---');
    const sortedSearch: PatentSearchQuery = {
      assignees: ['Tesla Inc.'],
      sortBy: 'filingDate',
      sortOrder: 'desc',
      limit: 5
    };

    const sortedResult = await uspto.searchPatents(sortedSearch);
    console.log('Most recent filings:');
    sortedResult.data.forEach(patent => {
      console.log(`  ${patent.filingDate.toLocaleDateString()}: ${patent.title.substring(0, 60)}...`);
    });

    // Get statistics
    console.log('\n--- Data Source Statistics ---');
    const stats = uspto.getStats();
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful: ${stats.successfulRequests}`);
    console.log(`Failed: ${stats.failedRequests}`);
    console.log(`Rate Limit Hits: ${stats.rateLimitHits}`);
    console.log(`Avg Response Time: ${Math.round(stats.averageResponseTime)}ms`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
