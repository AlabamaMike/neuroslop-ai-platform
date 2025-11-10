/**
 * EDGAR (SEC) Data Source Integration Tests
 *
 * Test-Driven Development tests for SEC EDGAR filing data integration
 */

import { EDGARDataSource, EDGARConfig } from '../../src/data-sources/edgar';
import {
  SECFiling,
  SECFilingType,
  SECFilingSearchQuery,
  SECCompany,
  FinancialData,
  CompanyFilingStats,
  RiskFactor,
  ManagementDiscussion
} from '../../src/data-sources/government-types';
import { DataSourceError, DataSourceErrorType } from '../../src/data-sources/base';

describe('EDGARDataSource', () => {
  let edgarDataSource: EDGARDataSource;
  const mockConfig: EDGARConfig = {
    baseUrl: 'https://data.sec.gov',
    userAgent: 'Test Application test@example.com',
    email: 'test@example.com',
    timeout: 30000,
    maxRetries: 3,
    rateLimit: 10
  };

  beforeEach(() => {
    edgarDataSource = new EDGARDataSource(mockConfig);
  });

  describe('Constructor and Initialization', () => {
    it('should create an instance with valid configuration', () => {
      expect(edgarDataSource).toBeInstanceOf(EDGARDataSource);
    });

    it('should require userAgent in configuration', () => {
      const invalidConfig: any = {
        baseUrl: 'https://data.sec.gov'
      };

      expect(() => new EDGARDataSource(invalidConfig)).toThrow();
    });

    it('should initialize successfully', async () => {
      await expect(edgarDataSource.initialize()).resolves.not.toThrow();
    });

    it('should return source name', () => {
      expect(edgarDataSource.getSourceName()).toBe('EDGAR');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const result = await edgarDataSource.testConnection();
      expect(typeof result).toBe('boolean');
    });

    it('should handle connection failures gracefully', async () => {
      const badConfig: EDGARConfig = {
        baseUrl: 'https://invalid-url-xyz123.com',
        userAgent: 'Test',
        timeout: 1000
      };
      const badSource = new EDGARDataSource(badConfig);
      await expect(badSource.testConnection()).resolves.toBe(false);
    });
  });

  describe('Company Search', () => {
    it('should search company by name', async () => {
      const company = await edgarDataSource.searchCompany('Apple Inc.');

      if (company) {
        expect(company).toHaveProperty('cik');
        expect(company).toHaveProperty('name');
        expect(company.name.toLowerCase()).toContain('apple');
      }
    });

    it('should search company by ticker symbol', async () => {
      const company = await edgarDataSource.searchCompany('AAPL');

      if (company) {
        expect(company).toHaveProperty('cik');
        expect(company).toHaveProperty('tickers');
      }
    });

    it('should return null for non-existent company', async () => {
      const company = await edgarDataSource.searchCompany('NonExistentCompanyXYZ123');
      expect(company).toBeNull();
    });

    it('should get company by CIK', async () => {
      const company = await edgarDataSource.getCompanyByCIK('0000320193'); // Apple

      if (company) {
        expect(company.cik).toBe('0000320193');
        expect(company).toHaveProperty('name');
        expect(company).toHaveProperty('tickers');
      }
    });
  });

  describe('Filing Search', () => {
    it('should search filings by company', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Apple Inc.',
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.metadata.returnedResults).toBeLessThanOrEqual(10);
    });

    it('should search filings by CIK', async () => {
      const query: SECFilingSearchQuery = {
        ciks: ['0000320193'],
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      expect(result.data).toBeInstanceOf(Array);
      result.data.forEach(filing => {
        expect(filing.cik).toBe('0000320193');
      });
    });

    it('should search filings by ticker', async () => {
      const query: SECFilingSearchQuery = {
        tickers: ['AAPL'],
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      expect(result.data).toBeInstanceOf(Array);
    });

    it('should filter by form type', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Microsoft',
        formTypes: [SECFilingType.FORM_10K],
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      result.data.forEach(filing => {
        expect(filing.formType).toBe(SECFilingType.FORM_10K);
      });
    });

    it('should filter by multiple form types', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Google',
        formTypes: [SECFilingType.FORM_10K, SECFilingType.FORM_10Q],
        limit: 20
      };

      const result = await edgarDataSource.searchFilings(query);

      result.data.forEach(filing => {
        expect(
          [SECFilingType.FORM_10K, SECFilingType.FORM_10Q]
        ).toContain(filing.formType);
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2022-12-31');

      const query: SECFilingSearchQuery = {
        company: 'Tesla',
        filingDateStart: startDate,
        filingDateEnd: endDate,
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      result.data.forEach(filing => {
        expect(filing.filingDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(filing.filingDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should handle empty search results', async () => {
      const query: SECFilingSearchQuery = {
        company: 'NonExistentCompanyXYZ999',
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      expect(result.data).toHaveLength(0);
      expect(result.metadata.totalResults).toBe(0);
    });
  });

  describe('Filing Retrieval', () => {
    it('should retrieve filing by accession number', async () => {
      const accessionNumber = '0000320193-23-000077';

      const filing = await edgarDataSource.getFilingByAccessionNumber(accessionNumber);

      if (filing) {
        expect(filing.accessionNumber).toBe(accessionNumber);
        expect(filing).toHaveProperty('formType');
        expect(filing).toHaveProperty('filingDate');
        expect(filing).toHaveProperty('filingUrl');
      }
    });

    it('should return null for non-existent accession number', async () => {
      const filing = await edgarDataSource.getFilingByAccessionNumber('9999999999-99-999999');
      expect(filing).toBeNull();
    });

    it('should include document links in filing', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Amazon',
        formTypes: [SECFilingType.FORM_10K],
        limit: 1
      };

      const result = await edgarDataSource.searchFilings(query);

      if (result.data.length > 0) {
        const filing = result.data[0];
        expect(filing).toHaveProperty('filingUrl');
        expect(filing.filingUrl).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('Filing Content Extraction', () => {
    it('should extract financial data from 10-K filing', async () => {
      const accessionNumber = '0000320193-23-000077';

      const financialData = await edgarDataSource.extractFinancialData(accessionNumber);

      if (financialData) {
        expect(financialData).toHaveProperty('fiscalYear');
        expect(financialData).toHaveProperty('metrics');
        expect(financialData.metrics).toHaveProperty('revenue');
      }
    });

    it('should extract risk factors from filing', async () => {
      const accessionNumber = '0000320193-23-000077';

      const riskFactors = await edgarDataSource.extractRiskFactors(accessionNumber);

      expect(Array.isArray(riskFactors)).toBe(true);
      if (riskFactors.length > 0) {
        expect(riskFactors[0]).toHaveProperty('category');
        expect(riskFactors[0]).toHaveProperty('description');
        expect(riskFactors[0]).toHaveProperty('source');
      }
    });

    it('should extract management discussion and analysis', async () => {
      const accessionNumber = '0000320193-23-000077';

      const mda = await edgarDataSource.extractManagementDiscussion(accessionNumber);

      if (mda) {
        expect(mda).toHaveProperty('fullText');
        expect(mda).toHaveProperty('filingAccessionNumber');
        expect(mda.fullText.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Filing Search with Keywords', () => {
    it('should search filings by keywords', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Microsoft',
        keywords: ['artificial intelligence', 'cloud computing'],
        formTypes: [SECFilingType.FORM_10K],
        limit: 5
      };

      const result = await edgarDataSource.searchFilings(query);

      expect(result.data).toBeInstanceOf(Array);
    });

    it('should handle keyword search in filing content', async () => {
      const keywords = ['revenue growth', 'market expansion'];

      const query: SECFilingSearchQuery = {
        company: 'Apple',
        keywords,
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('Company Filing Statistics', () => {
    it('should get filing statistics for a company', async () => {
      const stats = await edgarDataSource.getCompanyFilingStats('0000320193');

      expect(stats).toHaveProperty('cik');
      expect(stats).toHaveProperty('totalFilings');
      expect(stats).toHaveProperty('filingsByType');
      expect(stats).toHaveProperty('recentFilings');
      expect(stats.totalFilings).toBeGreaterThan(0);
    });

    it('should include filings by type breakdown', async () => {
      const stats = await edgarDataSource.getCompanyFilingStats('0001018724'); // Amazon

      expect(stats.filingsByType).toBeInstanceOf(Object);
      expect(Object.keys(stats.filingsByType).length).toBeGreaterThan(0);
    });
  });

  describe('Filing Trends', () => {
    it('should get filing trends over time', async () => {
      const trends = await edgarDataSource.getFilingTrends({
        company: 'Tesla',
        filingDateStart: new Date('2020-01-01'),
        filingDateEnd: new Date('2022-12-31')
      });

      expect(Array.isArray(trends)).toBe(true);
      if (trends.length > 0) {
        expect(trends[0]).toHaveProperty('period');
        expect(trends[0]).toHaveProperty('filingCount');
      }
    });

    it('should group trends by month', async () => {
      const trends = await edgarDataSource.getFilingTrends({
        formTypes: [SECFilingType.FORM_8K],
        filingDateStart: new Date('2022-01-01'),
        filingDateEnd: new Date('2022-12-31')
      });

      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('8-K Item Filtering', () => {
    it('should filter 8-K filings by item', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Amazon',
        formTypes: [SECFilingType.FORM_8K],
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      result.data.forEach(filing => {
        if (filing.formType === SECFilingType.FORM_8K) {
          expect(filing).toHaveProperty('items');
        }
      });
    });
  });

  describe('Sorting and Pagination', () => {
    it('should sort filings by filing date descending', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Microsoft',
        sortBy: 'filingDate',
        sortOrder: 'desc',
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      for (let i = 1; i < result.data.length; i++) {
        expect(
          result.data[i].filingDate.getTime()
        ).toBeLessThanOrEqual(
          result.data[i - 1].filingDate.getTime()
        );
      }
    });

    it('should sort filings by filing date ascending', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Apple',
        sortBy: 'filingDate',
        sortOrder: 'asc',
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      for (let i = 1; i < result.data.length; i++) {
        expect(
          result.data[i].filingDate.getTime()
        ).toBeGreaterThanOrEqual(
          result.data[i - 1].filingDate.getTime()
        );
      }
    });

    it('should handle pagination with offset and limit', async () => {
      const query1: SECFilingSearchQuery = {
        company: 'Google',
        limit: 5,
        offset: 0
      };

      const query2: SECFilingSearchQuery = {
        company: 'Google',
        limit: 5,
        offset: 5
      };

      const result1 = await edgarDataSource.searchFilings(query1);
      const result2 = await edgarDataSource.searchFilings(query2);

      expect(result1.data.length).toBeLessThanOrEqual(5);
      expect(result2.data.length).toBeLessThanOrEqual(5);

      if (result1.data.length > 0 && result2.data.length > 0) {
        expect(result1.data[0].accessionNumber).not.toBe(result2.data[0].accessionNumber);
      }
    });

    it('should indicate when more results are available', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Tesla',
        limit: 5
      };

      const result = await edgarDataSource.searchFilings(query);

      if (result.metadata.totalResults > 5) {
        expect(result.metadata.hasMore).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const badConfig: EDGARConfig = {
        baseUrl: 'https://invalid-domain-xyz123.com',
        userAgent: 'Test',
        timeout: 1000
      };
      const badSource = new EDGARDataSource(badConfig);

      await expect(
        badSource.searchFilings({ company: 'test' })
      ).rejects.toThrow(DataSourceError);
    });

    it('should handle timeout errors', async () => {
      const timeoutConfig: EDGARConfig = {
        baseUrl: 'https://data.sec.gov',
        userAgent: 'Test',
        timeout: 1
      };
      const timeoutSource = new EDGARDataSource(timeoutConfig);

      await expect(
        timeoutSource.searchFilings({ company: 'test' })
      ).rejects.toThrow();
    });

    it('should validate query parameters', async () => {
      const invalidQuery: SECFilingSearchQuery = {
        limit: -1
      };

      await expect(
        edgarDataSource.searchFilings(invalidQuery)
      ).rejects.toThrow(DataSourceError);
    });

    it('should enforce SEC rate limiting', async () => {
      // SEC limits to 10 requests per second
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < 12; i++) {
        promises.push(
          edgarDataSource.searchFilings({
            company: 'Apple',
            limit: 1
          })
        );
      }

      await Promise.all(promises);

      const elapsed = Date.now() - startTime;

      // Should take at least 1 second for 12 requests at 10 req/sec
      expect(elapsed).toBeGreaterThan(1000);
    });
  });

  describe('Amendment Filtering', () => {
    it('should filter out amendments by default', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Microsoft',
        formTypes: [SECFilingType.FORM_10K],
        includeAmendments: false,
        limit: 10
      };

      const result = await edgarDataSource.searchFilings(query);

      result.data.forEach(filing => {
        expect(filing.isAmendment).toBeFalsy();
      });
    });

    it('should include amendments when requested', async () => {
      const query: SECFilingSearchQuery = {
        company: 'Apple',
        formTypes: [SECFilingType.FORM_10K],
        includeAmendments: true,
        limit: 20
      };

      const result = await edgarDataSource.searchFilings(query);

      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('Caching', () => {
    it('should cache filing searches', async () => {
      const query: SECFilingSearchQuery = {
        company: 'cache test',
        limit: 5
      };

      const startTime1 = Date.now();
      const result1 = await edgarDataSource.searchFilings(query);
      const elapsed1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const result2 = await edgarDataSource.searchFilings(query);
      const elapsed2 = Date.now() - startTime2;

      // Second request should be faster (cached)
      expect(elapsed2).toBeLessThan(elapsed1);
      expect(result1.metadata.totalResults).toBe(result2.metadata.totalResults);
    });

    it('should allow cache invalidation', async () => {
      const query: SECFilingSearchQuery = {
        company: 'cache test 2',
        limit: 5
      };

      await edgarDataSource.searchFilings(query);
      edgarDataSource.clearCache();

      const result = await edgarDataSource.searchFilings(query);
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('Financial Data Extraction', () => {
    it('should extract revenue from 10-K filing', async () => {
      const financialData = await edgarDataSource.extractFinancialData('test-accession');

      if (financialData) {
        expect(financialData.metrics).toHaveProperty('revenue');
        expect(typeof financialData.metrics.revenue).toBe('number');
      }
    });

    it('should extract EPS from filing', async () => {
      const financialData = await edgarDataSource.extractFinancialData('test-accession');

      if (financialData && financialData.metrics.epsBasic) {
        expect(typeof financialData.metrics.epsBasic).toBe('number');
      }
    });

    it('should extract balance sheet metrics', async () => {
      const financialData = await edgarDataSource.extractFinancialData('test-accession');

      if (financialData) {
        expect(financialData.metrics).toBeDefined();
      }
    });
  });
});
