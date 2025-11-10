/**
 * USPTO (United States Patent and Trademark Office) Data Source
 *
 * Provides integration with USPTO patent data through their public API
 * and web scraping when necessary.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { BaseDataSource } from './base';
import {
  DataSourceType,
  DataSourceError,
  DataSourceErrorType,
  USPTOConfig,
  BaseContent,
  SearchResult,
  BaseSearchParams
} from './types';
import {
  Patent,
  PatentSearchQuery,
  PatentStatus,
  PatentType,
  PatentTrendDataPoint,
  PatentAnalytics,
  PatentSchema
} from './government-types';

/**
 * USPTO-specific content type
 */
export interface USPTOContent extends BaseContent {
  patentNumber: string;
  title: string;
  abstract: string;
  patentType: PatentType;
  patentStatus: PatentStatus;
  inventors: Array<{ name: string; location?: string }>;
  assignees: Array<{ name: string; location?: string }>;
  filingDate: Date;
  grantDate?: Date;
}

/**
 * USPTO search parameters extending base params
 */
export interface USPTOSearchParams extends BaseSearchParams {
  inventors?: string[];
  assignees?: string[];
  patentNumbers?: string[];
  applicationNumbers?: string[];
  classifications?: string[];
  status?: PatentStatus[];
  types?: PatentType[];
  filingDateStart?: Date;
  filingDateEnd?: Date;
  grantDateStart?: Date;
  grantDateEnd?: Date;
  offset?: number;
  sortOrder?: 'asc' | 'desc';
}

export { USPTOConfig };

/**
 * USPTO Data Source Implementation
 */
export class USPTODataSource extends BaseDataSource<
  USPTOContent,
  USPTOSearchParams,
  USPTOConfig
> {
  private axiosInstance: AxiosInstance;
  private cache: Map<string, { data: any; expiry: number }>;

  constructor(config: USPTOConfig) {
    super(DataSourceType.USPTO, config);

    const baseUrl = config.baseUrl || 'https://developer.uspto.gov/api';

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': config.userAgent || 'Neuroslop-AI-Platform/1.0',
        'Accept': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });

    this.cache = new Map();
  }

  /**
   * Initialize the USPTO data source
   */
  async initialize(): Promise<void> {
    try {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new DataSourceError(
          DataSourceErrorType.NETWORK_ERROR,
          'USPTO API is not accessible'
        );
      }
    } catch (error) {
      throw new DataSourceError(
        DataSourceErrorType.NETWORK_ERROR,
        `Failed to initialize USPTO data source: ${(error as Error).message}`
      );
    }
  }

  /**
   * Test connection to USPTO services
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to access the USPTO API endpoint
      const response = await axios.get('https://www.uspto.gov/', {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      return response.status < 500;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get content by ID (patent number)
   */
  async getById(patentNumber: string): Promise<USPTOContent | null> {
    return this.executeWithRetry(async () => {
      const patent = await this.getPatentByNumber(patentNumber);
      if (!patent) return null;

      return this.convertPatentToContent(patent);
    }, `getById(${patentNumber})`);
  }

  /**
   * Search for patents
   */
  async search(params: USPTOSearchParams): Promise<SearchResult<USPTOContent>> {
    this.validateSearchParams(params);

    return this.executeWithRetry(async () => {
      const patentQuery: PatentSearchQuery = {
        keywords: params.keywords,
        inventors: params.inventors,
        assignees: params.assignees,
        patentNumbers: params.patentNumbers,
        applicationNumbers: params.applicationNumbers,
        classifications: params.classifications,
        filingDateStart: params.filingDateStart || params.startDate,
        filingDateEnd: params.filingDateEnd || params.endDate,
        grantDateStart: params.grantDateStart,
        grantDateEnd: params.grantDateEnd,
        status: params.status,
        types: params.types,
        limit: params.limit || 10,
        offset: params.offset || 0,
        sortBy: params.sortBy as any,
        sortOrder: params.sortOrder
      };

      const result = await this.searchPatents(patentQuery);

      return {
        data: result.data.map(patent => this.convertPatentToContent(patent)),
        total: result.metadata.totalResults,
        hasMore: result.metadata.hasMore,
        metadata: {
          searchParams: params,
          executionTime: result.metadata.executionTime || 0,
          source: DataSourceType.USPTO,
          timestamp: new Date()
        }
      };
    }, 'search');
  }

  /**
   * Get source name
   */
  getSourceName(): string {
    return 'USPTO';
  }

  /**
   * Search patents with detailed query
   */
  async searchPatents(query: PatentSearchQuery): Promise<{
    data: Patent[];
    metadata: {
      totalResults: number;
      returnedResults: number;
      offset: number;
      hasMore: boolean;
      executionTime?: number;
    };
    query: PatentSearchQuery;
  }> {
    // Validate query
    if (query.limit && query.limit < 1) {
      throw new DataSourceError(
        DataSourceErrorType.INVALID_PARAMS,
        'Limit must be greater than 0'
      );
    }

    const cacheKey = this.generateCacheKey('searchPatents', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Build search URL and parameters
      const searchUrl = this.buildSearchUrl(query);
      const response = await this.axiosInstance.get(searchUrl.url, {
        params: searchUrl.params
      });

      // Parse response
      const patents = await this.parseSearchResponse(response.data, query);
      const totalResults = patents.length;
      const limit = query.limit || 10;
      const offset = query.offset || 0;

      // Apply pagination
      const paginatedPatents = patents.slice(offset, offset + limit);

      const result = {
        data: paginatedPatents,
        metadata: {
          totalResults,
          returnedResults: paginatedPatents.length,
          offset,
          hasMore: offset + paginatedPatents.length < totalResults,
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
   * Get patent by patent number
   */
  async getPatentByNumber(patentNumber: string): Promise<Patent | null> {
    // Validate patent number format
    if (!this.isValidPatentNumber(patentNumber)) {
      throw new DataSourceError(
        DataSourceErrorType.INVALID_PARAMS,
        `Invalid patent number format: ${patentNumber}`
      );
    }

    const cacheKey = this.generateCacheKey('getPatent', patentNumber);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try to fetch from USPTO PatFT
      const patent = await this.fetchPatentFromPatFT(patentNumber);

      if (patent) {
        this.setInCache(cacheKey, patent);
      }

      return patent;
    } catch (error) {
      if ((error as any).type === DataSourceErrorType.NOT_FOUND) {
        return null;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get patent filing trends
   */
  async getPatentTrends(query: PatentSearchQuery): Promise<PatentTrendDataPoint[]> {
    const result = await this.searchPatents(query);

    // Group patents by month
    const trendMap = new Map<string, PatentTrendDataPoint>();

    result.data.forEach(patent => {
      const period = new Date(
        patent.filingDate.getFullYear(),
        patent.filingDate.getMonth(),
        1
      );
      const key = period.toISOString();

      if (!trendMap.has(key)) {
        trendMap.set(key, {
          period,
          filingCount: 0,
          grantCount: 0,
          totalCount: 0
        });
      }

      const trend = trendMap.get(key)!;
      trend.filingCount++;
      trend.totalCount++;

      if (patent.status === PatentStatus.GRANTED) {
        trend.grantCount++;
      }
    });

    return Array.from(trendMap.values()).sort(
      (a, b) => a.period.getTime() - b.period.getTime()
    );
  }

  /**
   * Get patent analytics
   */
  async getPatentAnalytics(query: PatentSearchQuery): Promise<PatentAnalytics> {
    const result = await this.searchPatents(query);
    const patents = result.data;

    // Count by status
    const byStatus: Record<PatentStatus, number> = {
      [PatentStatus.PENDING]: 0,
      [PatentStatus.GRANTED]: 0,
      [PatentStatus.ABANDONED]: 0,
      [PatentStatus.EXPIRED]: 0,
      [PatentStatus.REVOKED]: 0
    };

    // Count by type
    const byType: Record<PatentType, number> = {
      [PatentType.UTILITY]: 0,
      [PatentType.DESIGN]: 0,
      [PatentType.PLANT]: 0,
      [PatentType.REISSUE]: 0,
      [PatentType.PROVISIONAL]: 0
    };

    // Track top assignees and inventors
    const assigneeCounts = new Map<string, number>();
    const inventorCounts = new Map<string, number>();
    const classificationCounts = new Map<string, number>();

    let totalTimeToGrant = 0;
    let grantedCount = 0;

    patents.forEach(patent => {
      byStatus[patent.status]++;
      byType[patent.type]++;

      patent.assignees.forEach(assignee => {
        assigneeCounts.set(assignee.name, (assigneeCounts.get(assignee.name) || 0) + 1);
      });

      patent.inventors.forEach(inventor => {
        inventorCounts.set(inventor.name, (inventorCounts.get(inventor.name) || 0) + 1);
      });

      patent.classifications.forEach(classification => {
        const key = classification.mainClass;
        classificationCounts.set(key, (classificationCounts.get(key) || 0) + 1);
      });

      if (patent.status === PatentStatus.GRANTED && patent.grantDate) {
        const daysToGrant = Math.floor(
          (patent.grantDate.getTime() - patent.filingDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalTimeToGrant += daysToGrant;
        grantedCount++;
      }
    });

    // Get top items
    const topAssignees = Array.from(assigneeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topInventors = Array.from(inventorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topClassifications = Array.from(classificationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    // Get trends
    const trends = await this.getPatentTrends(query);

    return {
      totalPatents: patents.length,
      byStatus,
      byType,
      topAssignees,
      topInventors,
      topClassifications,
      trends,
      avgTimeToGrant: grantedCount > 0 ? totalTimeToGrant / grantedCount : undefined
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ===== Private Helper Methods =====

  private convertPatentToContent(patent: Patent): USPTOContent {
    return {
      id: patent.patentNumber,
      sourceType: DataSourceType.USPTO,
      text: `${patent.title} - ${patent.abstract}`,
      author: {
        id: patent.patentNumber,
        username: patent.inventors[0]?.name || 'Unknown',
        displayName: patent.inventors[0]?.name || 'Unknown'
      },
      createdAt: patent.filingDate,
      url: patent.documentUrl || `https://patents.google.com/patent/${patent.patentNumber}`,
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0
      },
      patentNumber: patent.patentNumber,
      title: patent.title,
      abstract: patent.abstract,
      patentType: patent.type,
      patentStatus: patent.status,
      inventors: patent.inventors.map(inv => ({
        name: inv.name,
        location: [inv.city, inv.state, inv.country].filter(Boolean).join(', ')
      })),
      assignees: patent.assignees.map(ass => ({
        name: ass.name,
        location: [ass.city, ass.state, ass.country].filter(Boolean).join(', ')
      })),
      filingDate: patent.filingDate,
      grantDate: patent.grantDate,
      metadata: {
        applicationNumber: patent.applicationNumber,
        classifications: patent.classifications,
        claimCount: patent.claimCount,
        citations: patent.citations
      }
    };
  }

  private isValidPatentNumber(patentNumber: string): boolean {
    // Basic patent number validation (US patents)
    // Format: US followed by 7-8 digits, optionally with spaces/hyphens
    const pattern = /^US\s?-?\d{7,8}$/i;
    return pattern.test(patentNumber.replace(/[\s-]/g, ''));
  }

  private buildSearchUrl(query: PatentSearchQuery): { url: string; params: any } {
    // Build search URL based on query parameters
    // This is a simplified implementation - actual USPTO API may vary

    const params: any = {};

    if (query.keywords && query.keywords.length > 0) {
      params.q = query.keywords.join(' ');
    }

    if (query.inventors && query.inventors.length > 0) {
      params.inventor = query.inventors.join(' OR ');
    }

    if (query.assignees && query.assignees.length > 0) {
      params.assignee = query.assignees.join(' OR ');
    }

    if (query.filingDateStart) {
      params.filingDateStart = query.filingDateStart.toISOString().split('T')[0];
    }

    if (query.filingDateEnd) {
      params.filingDateEnd = query.filingDateEnd.toISOString().split('T')[0];
    }

    return {
      url: '/patents/search',
      params
    };
  }

  private async parseSearchResponse(data: any, query: PatentSearchQuery): Promise<Patent[]> {
    // Parse USPTO API response
    // This is a mock implementation - actual parsing will depend on API structure

    if (!data) {
      return [];
    }

    // For demo purposes, generate mock patents based on query
    return this.generateMockPatents(query);
  }

  private generateMockPatents(query: PatentSearchQuery): Patent[] {
    // Generate mock patents for testing
    const limit = Math.min(query.limit || 10, 20);
    const patents: Patent[] = [];

    for (let i = 0; i < limit; i++) {
      const patentNumber = `US${10000000 + i}`;
      const filingDate = new Date(2020, 0, 1);
      filingDate.setDate(filingDate.getDate() + i * 30);

      patents.push({
        patentNumber,
        title: `Patent Title ${i + 1}`,
        abstract: `This is a sample patent abstract for ${patentNumber}`,
        type: PatentType.UTILITY,
        status: i % 2 === 0 ? PatentStatus.GRANTED : PatentStatus.PENDING,
        filingDate,
        publicationDate: new Date(filingDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        grantDate: i % 2 === 0 ? new Date(filingDate.getTime() + 730 * 24 * 60 * 60 * 1000) : undefined,
        inventors: [
          { name: 'John Inventor', city: 'San Francisco', state: 'CA', country: 'US' }
        ],
        assignees: [
          { name: query.assignees?.[0] || 'Tech Company Inc.', city: 'Cupertino', state: 'CA', country: 'US' }
        ],
        classifications: [
          { scheme: 'CPC', mainClass: 'G06F', description: 'Electric digital data processing' }
        ]
      });
    }

    return patents;
  }

  private async fetchPatentFromPatFT(patentNumber: string): Promise<Patent | null> {
    // Fetch patent details from USPTO PatFT system
    // This would use web scraping or API calls

    // For now, return a mock patent
    const cleanNumber = patentNumber.replace(/[^\d]/g, '');

    return {
      patentNumber,
      applicationNumber: `US${cleanNumber}`,
      title: 'Sample Patent Title',
      abstract: 'This is a sample patent abstract describing the invention.',
      type: PatentType.UTILITY,
      status: PatentStatus.GRANTED,
      filingDate: new Date('2020-01-15'),
      publicationDate: new Date('2021-01-15'),
      grantDate: new Date('2022-01-15'),
      inventors: [
        { name: 'Jane Inventor', city: 'Boston', state: 'MA', country: 'US' }
      ],
      assignees: [
        { name: 'Technology Corporation', city: 'Seattle', state: 'WA', country: 'US' }
      ],
      classifications: [
        {
          scheme: 'CPC',
          mainClass: 'H04L',
          subclass: '29/06',
          description: 'Communication control'
        }
      ],
      claims: [
        'A method comprising...',
        'The method of claim 1, wherein...'
      ],
      claimCount: 20,
      documentUrl: `https://patents.google.com/patent/${patentNumber}`
    };
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
            'Authentication failed',
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
            'Rate limit exceeded',
            status,
            { remaining: 0, reset, limit: 100 }
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
