/**
 * EDGAR (SEC) Data Source Usage Example
 *
 * Demonstrates how to use the EDGAR integration to search and analyze SEC filings
 */

import { EDGARDataSource } from '../src/data-sources/edgar';
import { SECFilingType, SECFilingSearchQuery } from '../src/data-sources/government-types';

async function main() {
  // Initialize the EDGAR data source
  // Note: SEC requires a proper User-Agent with contact information
  const edgar = new EDGARDataSource({
    baseUrl: 'https://data.sec.gov',
    userAgent: 'MyCompany info@mycompany.com', // Required!
    email: 'info@mycompany.com',
    timeout: 30000,
    retryAttempts: 3,
    rateLimitPerMinute: 600 // SEC allows 10 requests per second
  });

  try {
    // Initialize and test connection
    console.log('Initializing EDGAR connection...');
    await edgar.initialize();
    const isHealthy = await edgar.healthCheck();
    console.log(`Connection status: ${isHealthy ? 'Connected' : 'Failed'}`);

    // Example 1: Search for a company
    console.log('\n--- Example 1: Search for a company ---');
    const appleCompany = await edgar.searchCompany('Apple Inc.');

    if (appleCompany) {
      console.log(`Company: ${appleCompany.name}`);
      console.log(`CIK: ${appleCompany.cik}`);
      console.log(`Tickers: ${appleCompany.tickers?.join(', ')}`);
      console.log(`SIC: ${appleCompany.sic} - ${appleCompany.sicDescription}`);
    }

    // Example 2: Search company by ticker
    console.log('\n--- Example 2: Search by ticker ---');
    const msftCompany = await edgar.searchCompany('MSFT');

    if (msftCompany) {
      console.log(`Found: ${msftCompany.name} (CIK: ${msftCompany.cik})`);
    }

    // Example 3: Get company by CIK
    console.log('\n--- Example 3: Get company by CIK ---');
    const company = await edgar.getCompanyByCIK('0000320193'); // Apple

    if (company) {
      console.log(`Company: ${company.name}`);
      console.log(`Entity Type: ${company.entityType}`);
      console.log(`Fiscal Year End: ${company.fiscalYearEnd}`);
    }

    // Example 4: Search 10-K filings
    console.log('\n--- Example 4: Search 10-K filings ---');
    const query10K: SECFilingSearchQuery = {
      company: 'Microsoft',
      formTypes: [SECFilingType.FORM_10K],
      filingDateStart: new Date('2020-01-01'),
      filingDateEnd: new Date('2023-12-31'),
      limit: 10
    };

    const filings10K = await edgar.searchFilings(query10K);
    console.log(`Found ${filings10K.metadata.totalResults} 10-K filings`);

    filings10K.data.slice(0, 3).forEach(filing => {
      console.log(`- ${filing.formType} filed on ${filing.filingDate.toLocaleDateString()}`);
      console.log(`  Accession: ${filing.accessionNumber}`);
      console.log(`  URL: ${filing.filingUrl}`);
    });

    // Example 5: Search 10-Q and 8-K filings
    console.log('\n--- Example 5: Search multiple form types ---');
    const queryMultiple: SECFilingSearchQuery = {
      tickers: ['AAPL'],
      formTypes: [SECFilingType.FORM_10Q, SECFilingType.FORM_8K],
      filingDateStart: new Date('2023-01-01'),
      limit: 15
    };

    const filingsMultiple = await edgar.searchFilings(queryMultiple);
    console.log(`Found ${filingsMultiple.metadata.totalResults} filings`);

    // Count by form type
    const formTypeCounts: Record<string, number> = {};
    filingsMultiple.data.forEach(filing => {
      formTypeCounts[filing.formType] = (formTypeCounts[filing.formType] || 0) + 1;
    });

    console.log('Breakdown by form type:');
    Object.entries(formTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Example 6: Get specific filing by accession number
    console.log('\n--- Example 6: Get filing by accession number ---');
    const filing = await edgar.getFilingByAccessionNumber('0000320193-23-000077');

    if (filing) {
      console.log(`Company: ${filing.companyName}`);
      console.log(`Form: ${filing.formType}`);
      console.log(`Filing Date: ${filing.filingDate.toLocaleDateString()}`);
      if (filing.reportDate) {
        console.log(`Report Date: ${filing.reportDate.toLocaleDateString()}`);
      }
      console.log(`Primary Document: ${filing.primaryDocument}`);
    }

    // Example 7: Extract financial data
    console.log('\n--- Example 7: Extract financial data ---');
    const financialData = await edgar.extractFinancialData('0000320193-23-000077');

    if (financialData) {
      console.log(`Period: ${financialData.period} (FY${financialData.fiscalYear})`);
      console.log(`Currency: ${financialData.currency}`);
      console.log('\nKey Metrics:');
      if (financialData.metrics.revenue) {
        console.log(`  Revenue: $${(financialData.metrics.revenue / 1e9).toFixed(2)}B`);
      }
      if (financialData.metrics.netIncome) {
        console.log(`  Net Income: $${(financialData.metrics.netIncome / 1e9).toFixed(2)}B`);
      }
      if (financialData.metrics.epsBasic) {
        console.log(`  EPS (Basic): $${financialData.metrics.epsBasic.toFixed(2)}`);
      }
      if (financialData.metrics.totalAssets) {
        console.log(`  Total Assets: $${(financialData.metrics.totalAssets / 1e9).toFixed(2)}B`);
      }
    }

    // Example 8: Extract risk factors
    console.log('\n--- Example 8: Extract risk factors ---');
    const riskFactors = await edgar.extractRiskFactors('0000320193-23-000077');

    console.log(`Found ${riskFactors.length} risk factors:`);
    riskFactors.slice(0, 3).forEach((risk, index) => {
      console.log(`\n${index + 1}. ${risk.category} (${risk.severity || 'N/A'})`);
      console.log(`   ${risk.description.substring(0, 100)}...`);
    });

    // Example 9: Extract Management Discussion & Analysis
    console.log('\n--- Example 9: Extract MD&A ---');
    const mda = await edgar.extractManagementDiscussion('0000320193-23-000077');

    if (mda) {
      console.log(`Word Count: ${mda.wordCount}`);
      console.log(`Sections: ${mda.sections?.length || 0}`);

      if (mda.sections) {
        console.log('\nSection Titles:');
        mda.sections.forEach(section => {
          console.log(`  - ${section.title} (${section.wordCount} words)`);
        });
      }

      if (mda.sentiment) {
        console.log('\nSentiment Analysis:');
        console.log(`  Positive: ${(mda.sentiment.positive! * 100).toFixed(1)}%`);
        console.log(`  Negative: ${(mda.sentiment.negative! * 100).toFixed(1)}%`);
        console.log(`  Neutral: ${(mda.sentiment.neutral! * 100).toFixed(1)}%`);
      }

      if (mda.mentionedMetrics) {
        console.log(`\nMentioned Metrics: ${mda.mentionedMetrics.join(', ')}`);
      }
    }

    // Example 10: Company filing statistics
    console.log('\n--- Example 10: Company filing statistics ---');
    const stats = await edgar.getCompanyFilingStats('0000789019'); // Microsoft

    console.log(`Company: ${stats.companyName}`);
    console.log(`Total Filings: ${stats.totalFilings}`);
    console.log(`Avg Filings/Year: ${stats.avgFilingsPerYear?.toFixed(1)}`);

    console.log('\nFilings by Type (top 5):');
    const sortedTypes = Object.entries(stats.filingsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedTypes.forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\nRecent Filings:');
    stats.recentFilings.slice(0, 5).forEach(date => {
      console.log(`  ${date.toLocaleDateString()}`);
    });

    // Example 11: Filing trends
    console.log('\n--- Example 11: Filing trends ---');
    const trends = await edgar.getFilingTrends({
      company: 'Tesla',
      filingDateStart: new Date('2022-01-01'),
      filingDateEnd: new Date('2023-12-31')
    });

    console.log('Filing trends by month:');
    trends.slice(0, 6).forEach(trend => {
      console.log(`${trend.period.toLocaleDateString()}: ${trend.filingCount} filings`);
      if (trend.byType) {
        const types = Object.entries(trend.byType).slice(0, 3);
        console.log(`  Top types: ${types.map(([t, c]) => `${t}(${c})`).join(', ')}`);
      }
    });

    // Example 12: Search with keywords
    console.log('\n--- Example 12: Keyword search in filings ---');
    const keywordQuery: SECFilingSearchQuery = {
      company: 'Amazon',
      keywords: ['artificial intelligence', 'machine learning', 'AWS'],
      formTypes: [SECFilingType.FORM_10K],
      limit: 5
    };

    const keywordResults = await edgar.searchFilings(keywordQuery);
    console.log(`Found ${keywordResults.metadata.totalResults} filings mentioning AI/ML`);

    // Example 13: Pagination
    console.log('\n--- Example 13: Pagination ---');
    const page1 = await edgar.search({
      tickers: ['GOOGL'],
      limit: 5,
      offset: 0
    });

    const page2 = await edgar.search({
      tickers: ['GOOGL'],
      limit: 5,
      offset: 5
    });

    console.log(`Page 1: ${page1.items.length} filings`);
    console.log(`Page 2: ${page2.items.length} filings`);
    console.log(`More available: ${page2.metadata.hasMore}`);

    // Example 14: Sorting
    console.log('\n--- Example 14: Sorted search ---');
    const sortedQuery: SECFilingSearchQuery = {
      company: 'Apple',
      formTypes: [SECFilingType.FORM_8K],
      sortBy: 'filingDate',
      sortOrder: 'desc',
      limit: 5
    };

    const sortedResults = await edgar.searchFilings(sortedQuery);
    console.log('Most recent 8-K filings:');
    sortedResults.data.forEach(filing => {
      console.log(`  ${filing.filingDate.toLocaleDateString()}: ${filing.accessionNumber}`);
    });

    // Get data source statistics
    console.log('\n--- Data Source Statistics ---');
    const dsStats = edgar.getStats();
    console.log(`Total Requests: ${dsStats.totalRequests}`);
    console.log(`Successful: ${dsStats.successfulRequests}`);
    console.log(`Failed: ${dsStats.failedRequests}`);
    console.log(`Rate Limit Hits: ${dsStats.rateLimitHits}`);
    console.log(`Avg Response Time: ${Math.round(dsStats.averageResponseTime)}ms`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
