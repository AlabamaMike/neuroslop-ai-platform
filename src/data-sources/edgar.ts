/**
 * EDGAR (Electronic Data Gathering, Analysis, and Retrieval) Data Source
 *
 * Provides integration with SEC EDGAR system for accessing public company filings
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { BaseDataSource } from './base';
import {
  DataSourceType,
  DataSourceError,
  DataSourceErrorType,
  EDGARConfig,
  BaseContent,
  SearchResult,
  BaseSearchParams
} from './types';
import {
  SECFiling,
  SECFilingType,
  SECFilingSearchQuery,
  SECCompany,
  FinancialData,
  CompanyFilingStats,
  RiskFactor,
  ManagementDiscussion,
  FilingTrendDataPoint,
  SECFilingSchema
} from './government-types';

/**
 * EDGAR-specific content type
 */
export interface EDGARContent extends BaseContent {
  accessionNumber: string;
  cik: string;
  companyName: string;
  formType: SECFilingType;
  filingDate: Date;
  reportDate?: Date;
  filingUrl: string;
}

/**
 * EDGAR search parameters extending base params
 */
export interface EDGARSearchParams extends BaseSearchParams {
  ciks?: string[];
  tickers?: string[];
  formTypes?: SECFilingType[];
  sicCodes?: string[];
  includeAmendments?: boolean;
  filingDateStart?: Date;
  filingDateEnd?: Date;
  offset?: number;
  sortOrder?: 'asc' | 'desc';
}

export { EDGARConfig };

/**
 * EDGAR Data Source Implementation
 */
export class EDGARDataSource extends BaseDataSource<
  EDGARContent,
  EDGARSearchParams,
  EDGARConfig
> {
  private axiosInstance: AxiosInstance;
  private cache: Map<string, { data: any; expiry: number }>;
  private companyCache: Map<string, SECCompany>;

  constructor(config: EDGARConfig) {
    // Validate required userAgent
    if (!config.userAgent) {
      throw new DataSourceError(
        DataSourceErrorType.INVALID_PARAMS,
        'userAgent is required for SEC EDGAR API access'
      );
    }

    super(DataSourceType.EDGAR, config);

    const baseUrl = config.baseUrl || 'https://data.sec.gov';

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'application/json',
        'Host': 'data.sec.gov'
      }
    });

    this.cache = new Map();
    this.companyCache = new Map();
  }

  /**
   * Initialize the EDGAR data source
   */
  async initialize(): Promise<void> {
    try {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new DataSourceError(
          DataSourceErrorType.NETWORK_ERROR,
          'SEC EDGAR API is not accessible'
        );
      }
    } catch (error) {
      throw new DataSourceError(
        DataSourceErrorType.NETWORK_ERROR,
        `Failed to initialize EDGAR data source: ${(error as Error).message}`
      );
    }
  }

  /**
   * Test connection to SEC EDGAR
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get('https://www.sec.gov/', {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      return response.status < 500;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get content by ID (accession number)
   */
  async getById(accessionNumber: string): Promise<EDGARContent | null> {
    return this.executeWithRetry(async () => {
      const filing = await this.getFilingByAccessionNumber(accessionNumber);
      if (!filing) return null;

      return this.convertFilingToContent(filing);
    }, `getById(${accessionNumber})`);
  }

  /**
   * Search for filings
   */
  async search(params: EDGARSearchParams): Promise<SearchResult<EDGARContent>> {
    this.validateSearchParams(params);

    return this.executeWithRetry(async () => {
      const filingQuery: SECFilingSearchQuery = {
        ciks: params.ciks,
        tickers: params.tickers,
        formTypes: params.formTypes,
        keywords: params.keywords,
        sicCodes: params.sicCodes,
        includeAmendments: params.includeAmendments,
        filingDateStart: params.filingDateStart || params.startDate,
        filingDateEnd: params.filingDateEnd || params.endDate,
        limit: params.limit || 10,
        offset: params.offset || 0,
        sortBy: params.sortBy as any,
        sortOrder: params.sortOrder
      };

      const result = await this.searchFilings(filingQuery);

      return {
        data: result.data.map(filing => this.convertFilingToContent(filing)),
        total: result.metadata.totalResults,
        hasMore: result.metadata.hasMore,
        metadata: {
          searchParams: params,
          executionTime: result.metadata.executionTime || 0,
          source: DataSourceType.EDGAR,
          timestamp: new Date()
        }
      };
    }, 'search');
  }

  /**
   * Get source name
   */
  getSourceName(): string {
    return 'EDGAR';
  }

  /**
   * Search for a company by name or ticker
   */
  async searchCompany(query: string): Promise<SECCompany | null> {
    const cacheKey = `company:${query.toLowerCase()}`;
    if (this.companyCache.has(cacheKey)) {
      return this.companyCache.get(cacheKey)!;
    }

    try {
      // Try to fetch company from SEC company tickers endpoint
      const response = await this.axiosInstance.get('/files/company_tickers.json');
      const companies = Object.values(response.data) as any[];

      // Search by ticker or name
      const company = companies.find((c: any) => {
        const ticker = c.ticker?.toString().toUpperCase();
        const title = c.title?.toString().toUpperCase();
        const searchQuery = query.toUpperCase();

        return ticker === searchQuery || title.includes(searchQuery);
      });

      if (!company) {
        return null;
      }

      // Format CIK with leading zeros
      const cik = company.cik_str.toString().padStart(10, '0');

      const secCompany: SECCompany = {
        cik,
        name: company.title,
        tickers: [company.ticker],
        sic: company.sic_description
      };

      this.companyCache.set(cacheKey, secCompany);
      return secCompany;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get company by CIK
   */
  async getCompanyByCIK(cik: string): Promise<SECCompany | null> {
    const formattedCIK = this.formatCIK(cik);
    const cacheKey = `company:cik:${formattedCIK}`;

    if (this.companyCache.has(cacheKey)) {
      return this.companyCache.get(cacheKey)!;
    }

    try {
      const response = await this.axiosInstance.get(
        `/submissions/CIK${formattedCIK}.json`
      );

      const data = response.data;

      const company: SECCompany = {
        cik: formattedCIK,
        name: data.name,
        tickers: data.tickers || [],
        exchanges: data.exchanges || [],
        sic: data.sic,
        sicDescription: data.sicDescription,
        fiscalYearEnd: data.fiscalYearEnd,
        entityType: data.entityType
      };

      this.companyCache.set(cacheKey, company);
      return company;
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return null;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Search SEC filings
   */
  async searchFilings(query: SECFilingSearchQuery): Promise<{
    data: SECFiling[];
    metadata: {
      totalResults: number;
      returnedResults: number;
      offset: number;
      hasMore: boolean;
      executionTime?: number;
    };
    query: SECFilingSearchQuery;
  }> {
    if (query.limit && query.limit < 1) {
      throw new DataSourceError(
        DataSourceErrorType.INVALID_PARAMS,
        'Limit must be greater than 0'
      );
    }

    const cacheKey = this.generateCacheKey('searchFilings', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      let filings: SECFiling[] = [];

      // If company name is provided, first resolve to CIK
      if (query.company) {
        const company = await this.searchCompany(query.company);
        if (company) {
          query.ciks = [company.cik];
        }
      }

      // If tickers are provided, resolve to CIKs
      if (query.tickers && query.tickers.length > 0) {
        const ciks: string[] = [];
        for (const ticker of query.tickers) {
          const company = await this.searchCompany(ticker);
          if (company) {
            ciks.push(company.cik);
          }
        }
        query.ciks = [...(query.ciks || []), ...ciks];
      }

      // Fetch filings for each CIK
      if (query.ciks && query.ciks.length > 0) {
        for (const cik of query.ciks) {
          const companyFilings = await this.fetchFilingsForCIK(cik, query);
          filings.push(...companyFilings);
        }
      } else {
        // If no specific company, generate mock filings
        filings = this.generateMockFilings(query);
      }

      // Filter by form types
      if (query.formTypes && query.formTypes.length > 0) {
        filings = filings.filter(f => query.formTypes!.includes(f.formType));
      }

      // Filter by date range
      if (query.filingDateStart) {
        filings = filings.filter(f => f.filingDate >= query.filingDateStart!);
      }
      if (query.filingDateEnd) {
        filings = filings.filter(f => f.filingDate <= query.filingDateEnd!);
      }

      // Filter amendments
      if (query.includeAmendments === false) {
        filings = filings.filter(f => !f.isAmendment);
      }

      // Sort filings
      filings = this.sortFilings(filings, query.sortBy, query.sortOrder);

      // Apply pagination
      const limit = query.limit || 10;
      const offset = query.offset || 0;
      const paginatedFilings = filings.slice(offset, offset + limit);

      const result = {
        data: paginatedFilings,
        metadata: {
          totalResults: filings.length,
          returnedResults: paginatedFilings.length,
          offset,
          hasMore: offset + paginatedFilings.length < filings.length,
          executionTime: Date.now() - startTime
        },
        query
      };

      this.setInCache(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get filing by accession number
   */
  async getFilingByAccessionNumber(accessionNumber: string): Promise<SECFiling | null> {
    const cacheKey = `filing:${accessionNumber}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Extract CIK from accession number
      const cik = accessionNumber.split('-')[0].padStart(10, '0');

      // Fetch company filings
      const response = await this.axiosInstance.get(
        `/submissions/CIK${cik}.json`
      );

      const filings = response.data.filings?.recent;
      if (!filings) {
        return null;
      }

      // Find filing by accession number
      const index = filings.accessionNumber?.indexOf(accessionNumber);
      if (index === -1) {
        return null;
      }

      const filing: SECFiling = {
        accessionNumber,
        cik,
        companyName: response.data.name,
        formType: this.mapFormType(filings.form[index]),
        filingDate: new Date(filings.filingDate[index]),
        reportDate: filings.reportDate?.[index] ? new Date(filings.reportDate[index]) : undefined,
        filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${filings.form[index]}&dateb=&owner=exclude&count=100&search_text=`,
        primaryDocument: filings.primaryDocument?.[index],
        fileNumber: filings.fileNumber?.[index],
        isAmendment: filings.form[index].includes('/A')
      };

      this.setInCache(cacheKey, filing);
      return filing;
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return null;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Extract financial data from a filing
   */
  async extractFinancialData(accessionNumber: string): Promise<FinancialData | null> {
    const filing = await this.getFilingByAccessionNumber(accessionNumber);
    if (!filing) {
      return null;
    }

    // In a real implementation, this would parse XBRL data
    // For now, return mock data
    return {
      period: 'FY2023',
      fiscalYear: 2023,
      fiscalQuarter: undefined,
      currency: 'USD',
      metrics: {
        revenue: 383285000000,
        netIncome: 96995000000,
        epsBasic: 6.16,
        epsDiluted: 6.13,
        totalAssets: 352755000000,
        totalLiabilities: 290437000000,
        stockholdersEquity: 62318000000,
        operatingCashFlow: 110543000000,
        freeCashFlow: 99584000000
      },
      source: accessionNumber
    };
  }

  /**
   * Extract risk factors from a filing
   */
  async extractRiskFactors(accessionNumber: string): Promise<RiskFactor[]> {
    const filing = await this.getFilingByAccessionNumber(accessionNumber);
    if (!filing) {
      return [];
    }

    // In a real implementation, this would parse the filing HTML/text
    // For now, return mock risk factors
    return [
      {
        category: 'Market Risk',
        description: 'Global economic conditions could adversely affect demand for our products.',
        severity: 'high',
        source: accessionNumber,
        extractedDate: new Date()
      },
      {
        category: 'Competition Risk',
        description: 'The markets for our products are highly competitive.',
        severity: 'medium',
        source: accessionNumber,
        extractedDate: new Date()
      },
      {
        category: 'Regulatory Risk',
        description: 'We are subject to complex and evolving regulations.',
        severity: 'medium',
        source: accessionNumber,
        extractedDate: new Date()
      }
    ];
  }

  /**
   * Extract management discussion and analysis
   */
  async extractManagementDiscussion(accessionNumber: string): Promise<ManagementDiscussion | null> {
    const filing = await this.getFilingByAccessionNumber(accessionNumber);
    if (!filing) {
      return null;
    }

    // In a real implementation, this would parse the filing HTML/text
    // For now, return mock MD&A
    return {
      filingAccessionNumber: accessionNumber,
      fullText: 'This is a sample Management Discussion and Analysis section...',
      sections: [
        {
          title: 'Results of Operations',
          content: 'Revenue increased by 15% year-over-year...',
          wordCount: 500
        },
        {
          title: 'Liquidity and Capital Resources',
          content: 'Cash flow from operations remained strong...',
          wordCount: 400
        }
      ],
      mentionedMetrics: ['revenue', 'operating income', 'cash flow'],
      wordCount: 2500,
      sentiment: {
        positive: 0.6,
        negative: 0.2,
        neutral: 0.2
      }
    };
  }

  /**
   * Get company filing statistics
   */
  async getCompanyFilingStats(cik: string): Promise<CompanyFilingStats> {
    const formattedCIK = this.formatCIK(cik);

    try {
      const response = await this.axiosInstance.get(
        `/submissions/CIK${formattedCIK}.json`
      );

      const data = response.data;
      const filings = data.filings?.recent;

      if (!filings || !filings.form) {
        return {
          cik: formattedCIK,
          companyName: data.name,
          totalFilings: 0,
          filingsByType: {},
          recentFilings: []
        };
      }

      // Count filings by type
      const filingsByType: Record<string, number> = {};
      filings.form.forEach((form: string) => {
        filingsByType[form] = (filingsByType[form] || 0) + 1;
      });

      // Get recent filing dates
      const recentFilings = filings.filingDate
        .slice(0, 10)
        .map((date: string) => new Date(date));

      return {
        cik: formattedCIK,
        companyName: data.name,
        totalFilings: filings.form.length,
        filingsByType,
        recentFilings,
        avgFilingsPerYear: filings.form.length / 5, // Rough estimate
        firstFilingDate: new Date(filings.filingDate[filings.filingDate.length - 1]),
        lastFilingDate: new Date(filings.filingDate[0])
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get filing trends
   */
  async getFilingTrends(query: SECFilingSearchQuery): Promise<FilingTrendDataPoint[]> {
    const result = await this.searchFilings(query);

    // Group filings by month
    const trendMap = new Map<string, FilingTrendDataPoint>();

    result.data.forEach(filing => {
      const period = new Date(
        filing.filingDate.getFullYear(),
        filing.filingDate.getMonth(),
        1
      );
      const key = period.toISOString();

      if (!trendMap.has(key)) {
        trendMap.set(key, {
          period,
          filingCount: 0,
          byType: {}
        });
      }

      const trend = trendMap.get(key)!;
      trend.filingCount++;

      const formType = filing.formType.toString();
      trend.byType = trend.byType || {};
      trend.byType[formType] = (trend.byType[formType] || 0) + 1;
    });

    return Array.from(trendMap.values()).sort(
      (a, b) => a.period.getTime() - b.period.getTime()
    );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.companyCache.clear();
  }

  // Test connection (alias for healthCheck for backward compatibility)
  async testConnection(): Promise<boolean> {
    return this.healthCheck();
  }

  // ===== Private Helper Methods =====

  private convertFilingToContent(filing: SECFiling): EDGARContent {
    return {
      id: filing.accessionNumber,
      sourceType: DataSourceType.EDGAR,
      text: `${filing.companyName} - ${filing.formType} Filing`,
      author: {
        id: filing.cik,
        username: filing.companyName,
        displayName: filing.companyName
      },
      createdAt: filing.filingDate,
      url: filing.filingUrl,
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0
      },
      accessionNumber: filing.accessionNumber,
      cik: filing.cik,
      companyName: filing.companyName,
      formType: filing.formType,
      filingDate: filing.filingDate,
      reportDate: filing.reportDate,
      filingUrl: filing.filingUrl,
      metadata: {
        primaryDocument: filing.primaryDocument,
        fileNumber: filing.fileNumber,
        isAmendment: filing.isAmendment,
        items: filing.items
      }
    };
  }

  private formatCIK(cik: string): string {
    // Remove 'CIK' prefix if present and pad with zeros
    const cleanCIK = cik.replace(/^CIK/i, '').replace(/^0+/, '');
    return cleanCIK.padStart(10, '0');
  }

  private mapFormType(formString: string): SECFilingType {
    const normalizedForm = formString.replace(/\/A$/, '').trim();

    const formMap: Record<string, SECFilingType> = {
      '10-K': SECFilingType.FORM_10K,
      '10-Q': SECFilingType.FORM_10Q,
      '8-K': SECFilingType.FORM_8K,
      'S-1': SECFilingType.FORM_S1,
      'S-3': SECFilingType.FORM_S3,
      'S-4': SECFilingType.FORM_S4,
      '4': SECFilingType.FORM_4,
      '3': SECFilingType.FORM_3,
      'DEF 14A': SECFilingType.FORM_DEF14A,
      '13F': SECFilingType.FORM_13F,
      '13D': SECFilingType.FORM_13D,
      '13G': SECFilingType.FORM_13G,
      '20-F': SECFilingType.FORM_20F,
      '6-K': SECFilingType.FORM_6K,
      '424B': SECFilingType.FORM_424B
    };

    return formMap[normalizedForm] || SECFilingType.OTHER;
  }

  private async fetchFilingsForCIK(
    cik: string,
    query: SECFilingSearchQuery
  ): Promise<SECFiling[]> {
    const formattedCIK = this.formatCIK(cik);

    try {
      const response = await this.axiosInstance.get(
        `/submissions/CIK${formattedCIK}.json`
      );

      const data = response.data;
      const filings = data.filings?.recent;

      if (!filings || !filings.accessionNumber) {
        return [];
      }

      const result: SECFiling[] = [];

      for (let i = 0; i < filings.accessionNumber.length; i++) {
        const filing: SECFiling = {
          accessionNumber: filings.accessionNumber[i],
          cik: formattedCIK,
          companyName: data.name,
          formType: this.mapFormType(filings.form[i]),
          filingDate: new Date(filings.filingDate[i]),
          reportDate: filings.reportDate?.[i] ? new Date(filings.reportDate[i]) : undefined,
          filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${formattedCIK}&type=${filings.form[i]}&dateb=&owner=exclude&count=100`,
          primaryDocument: filings.primaryDocument?.[i],
          fileNumber: filings.fileNumber?.[i],
          isAmendment: filings.form[i].includes('/A')
        };

        result.push(filing);
      }

      return result;
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  private sortFilings(
    filings: SECFiling[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): SECFiling[] {
    const sorted = [...filings];

    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'filingDate') {
        comparison = a.filingDate.getTime() - b.filingDate.getTime();
      } else if (sortBy === 'reportDate' && a.reportDate && b.reportDate) {
        comparison = a.reportDate.getTime() - b.reportDate.getTime();
      } else {
        // Default: sort by filing date
        comparison = a.filingDate.getTime() - b.filingDate.getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  private generateMockFilings(query: SECFilingSearchQuery): SECFiling[] {
    // Generate mock filings for testing
    const limit = Math.min(query.limit || 10, 20);
    const filings: SECFiling[] = [];

    const formTypes = query.formTypes || [
      SECFilingType.FORM_10K,
      SECFilingType.FORM_10Q,
      SECFilingType.FORM_8K
    ];

    for (let i = 0; i < limit; i++) {
      const filingDate = new Date(2023, 0, 1);
      filingDate.setDate(filingDate.getDate() - i * 30);

      const accessionNumber = `0000000000-23-${String(100000 + i).padStart(6, '0')}`;

      filings.push({
        accessionNumber,
        cik: '0000000000',
        companyName: 'Sample Company Inc.',
        formType: formTypes[i % formTypes.length],
        filingDate,
        reportDate: new Date(filingDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000000000`,
        isAmendment: false
      });
    }

    return filings;
  }

  private generateCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private getFromCache(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  private setInCache(key: string, data: any, ttl: number = 3600000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  private handleError(error: any): DataSourceError {
    if (error instanceof DataSourceError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;

        if (status === 401 || status === 403) {
          return new DataSourceError(
            DataSourceErrorType.AUTH_ERROR,
            'Authentication or authorization failed',
            status
          );
        }

        if (status === 429) {
          const retryAfter = axiosError.response.headers['retry-after'];
          const reset = retryAfter
            ? new Date(Date.now() + parseInt(retryAfter) * 1000)
            : new Date(Date.now() + 60000);

          return new DataSourceError(
            DataSourceErrorType.RATE_LIMIT,
            'Rate limit exceeded. SEC limits to 10 requests per second.',
            status,
            { remaining: 0, reset, limit: 10 }
          );
        }

        if (status === 404) {
          return new DataSourceError(
            DataSourceErrorType.NOT_FOUND,
            'Resource not found',
            status
          );
        }

        return new DataSourceError(
          DataSourceErrorType.API_ERROR,
          `API error: ${axiosError.message}`,
          status
        );
      }

      if (axiosError.code === 'ECONNABORTED') {
        return new DataSourceError(
          DataSourceErrorType.NETWORK_ERROR,
          'Request timeout'
        );
      }

      return new DataSourceError(
        DataSourceErrorType.NETWORK_ERROR,
        `Network error: ${axiosError.message}`
      );
    }

    return new DataSourceError(
      DataSourceErrorType.UNKNOWN,
      `Unknown error: ${(error as Error).message}`
    );
  }
}
