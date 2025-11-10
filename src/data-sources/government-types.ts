/**
 * Government Data Source Types
 *
 * Comprehensive TypeScript types for USPTO (Patent Office) and EDGAR (SEC) data
 */

import { z } from 'zod';

// ============================================================================
// USPTO (Patent Office) Types
// ============================================================================

/**
 * Patent status enumeration
 */
export enum PatentStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  ABANDONED = 'ABANDONED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

/**
 * Patent type enumeration
 */
export enum PatentType {
  UTILITY = 'UTILITY',
  DESIGN = 'DESIGN',
  PLANT = 'PLANT',
  REISSUE = 'REISSUE',
  PROVISIONAL = 'PROVISIONAL'
}

/**
 * Inventor information
 */
export interface Inventor {
  /** Full name of the inventor */
  name: string;
  /** City of residence */
  city?: string;
  /** State/province of residence */
  state?: string;
  /** Country of residence */
  country?: string;
}

/**
 * Assignee (owner) information
 */
export interface Assignee {
  /** Name of the assignee (company or individual) */
  name: string;
  /** Assignee type (company, individual, government, etc.) */
  type?: string;
  /** City location */
  city?: string;
  /** State/province location */
  state?: string;
  /** Country location */
  country?: string;
}

/**
 * Patent classification information
 */
export interface PatentClassification {
  /** Classification scheme (CPC, IPC, etc.) */
  scheme: string;
  /** Main classification code */
  mainClass: string;
  /** Subclass code */
  subclass?: string;
  /** Full classification description */
  description?: string;
}

/**
 * Patent citation
 */
export interface PatentCitation {
  /** Citation type (forward or backward) */
  type: 'forward' | 'backward';
  /** Patent number being cited */
  patentNumber: string;
  /** Date of citation */
  date?: Date;
  /** Citation category */
  category?: string;
}

/**
 * Complete patent data structure
 */
export interface Patent {
  /** Patent number (e.g., "US1234567") */
  patentNumber: string;
  /** Patent application number */
  applicationNumber?: string;
  /** Patent title */
  title: string;
  /** Patent abstract */
  abstract: string;
  /** Full text of patent claims */
  claims?: string[];
  /** Patent description/specification */
  description?: string;
  /** Type of patent */
  type: PatentType;
  /** Current status */
  status: PatentStatus;
  /** Filing date */
  filingDate: Date;
  /** Publication date */
  publicationDate?: Date;
  /** Grant date (if granted) */
  grantDate?: Date;
  /** Expiration date */
  expirationDate?: Date;
  /** List of inventors */
  inventors: Inventor[];
  /** List of assignees */
  assignees: Assignee[];
  /** Patent classifications */
  classifications: PatentClassification[];
  /** Citations (both forward and backward) */
  citations?: PatentCitation[];
  /** Priority date */
  priorityDate?: Date;
  /** Priority country */
  priorityCountry?: string;
  /** Number of claims */
  claimCount?: number;
  /** Number of figures/drawings */
  figureCount?: number;
  /** Related application numbers */
  relatedApplications?: string[];
  /** URL to full patent document */
  documentUrl?: string;
  /** Raw metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Patent search query parameters
 */
export interface PatentSearchQuery {
  /** Search keywords in title, abstract, or claims */
  keywords?: string[];
  /** Inventor names to search */
  inventors?: string[];
  /** Assignee/company names to search */
  assignees?: string[];
  /** Patent numbers to search */
  patentNumbers?: string[];
  /** Application numbers to search */
  applicationNumbers?: string[];
  /** Classification codes */
  classifications?: string[];
  /** Filing date range start */
  filingDateStart?: Date;
  /** Filing date range end */
  filingDateEnd?: Date;
  /** Grant date range start */
  grantDateStart?: Date;
  /** Grant date range end */
  grantDateEnd?: Date;
  /** Patent status filter */
  status?: PatentStatus[];
  /** Patent type filter */
  types?: PatentType[];
  /** Maximum results to return */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Sort field */
  sortBy?: 'filingDate' | 'grantDate' | 'relevance';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Patent trend data point
 */
export interface PatentTrendDataPoint {
  /** Date or time period */
  period: Date;
  /** Number of patents filed */
  filingCount: number;
  /** Number of patents granted */
  grantCount: number;
  /** Total patents in period */
  totalCount: number;
  /** Assignee or category (optional) */
  category?: string;
}

/**
 * Patent analytics summary
 */
export interface PatentAnalytics {
  /** Total patent count */
  totalPatents: number;
  /** Patents by status */
  byStatus: Record<PatentStatus, number>;
  /** Patents by type */
  byType: Record<PatentType, number>;
  /** Top assignees */
  topAssignees: Array<{ name: string; count: number }>;
  /** Top inventors */
  topInventors: Array<{ name: string; count: number }>;
  /** Top classifications */
  topClassifications: Array<{ code: string; count: number }>;
  /** Trend data over time */
  trends?: PatentTrendDataPoint[];
  /** Average time from filing to grant (in days) */
  avgTimeToGrant?: number;
}

// ============================================================================
// EDGAR (SEC) Types
// ============================================================================

/**
 * SEC filing form types
 */
export enum SECFilingType {
  FORM_10K = '10-K',
  FORM_10Q = '10-Q',
  FORM_8K = '8-K',
  FORM_S1 = 'S-1',
  FORM_S3 = 'S-3',
  FORM_S4 = 'S-4',
  FORM_4 = '4',
  FORM_3 = '3',
  FORM_DEF14A = 'DEF 14A',
  FORM_13F = '13F',
  FORM_13D = '13D',
  FORM_13G = '13G',
  FORM_20F = '20-F',
  FORM_6K = '6-K',
  FORM_424B = '424B',
  OTHER = 'OTHER'
}

/**
 * Company information from SEC
 */
export interface SECCompany {
  /** Central Index Key (CIK) */
  cik: string;
  /** Company name */
  name: string;
  /** Stock ticker symbol(s) */
  tickers?: string[];
  /** Stock exchange(s) */
  exchanges?: string[];
  /** Standard Industrial Classification (SIC) code */
  sic?: string;
  /** SIC description */
  sicDescription?: string;
  /** Business address */
  businessAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    stateOrCountry?: string;
    zipCode?: string;
    phone?: string;
  };
  /** Mailing address */
  mailingAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    stateOrCountry?: string;
    zipCode?: string;
  };
  /** Fiscal year end */
  fiscalYearEnd?: string;
  /** Former names */
  formerNames?: Array<{ name: string; from: Date; to: Date }>;
  /** Entity type */
  entityType?: string;
}

/**
 * SEC filing document
 */
export interface SECFiling {
  /** Accession number (unique identifier) */
  accessionNumber: string;
  /** CIK of the filing company */
  cik: string;
  /** Company name */
  companyName: string;
  /** Form type */
  formType: SECFilingType;
  /** Filing date */
  filingDate: Date;
  /** Report date (period of report) */
  reportDate?: Date;
  /** Acceptance datetime */
  acceptanceDateTime?: Date;
  /** URL to the filing on EDGAR */
  filingUrl: string;
  /** URL to the HTML version */
  htmlUrl?: string;
  /** URL to the XML version */
  xmlUrl?: string;
  /** Primary document filename */
  primaryDocument?: string;
  /** All documents in the filing */
  documents?: Array<{
    sequence: number;
    description: string;
    filename: string;
    url: string;
    type: string;
    size?: number;
  }>;
  /** Items reported (for 8-K filings) */
  items?: string[];
  /** Filing size in bytes */
  size?: number;
  /** Amendment flag */
  isAmendment?: boolean;
  /** File number */
  fileNumber?: string;
  /** Film number */
  filmNumber?: string;
}

/**
 * Financial statement data
 */
export interface FinancialData {
  /** Fiscal period */
  period: string;
  /** Fiscal year */
  fiscalYear: number;
  /** Fiscal quarter (1-4, or null for annual) */
  fiscalQuarter?: number;
  /** Currency code */
  currency: string;
  /** Financial metrics */
  metrics: {
    /** Revenue/Sales */
    revenue?: number;
    /** Net income */
    netIncome?: number;
    /** Earnings per share (basic) */
    epsBasic?: number;
    /** Earnings per share (diluted) */
    epsDiluted?: number;
    /** Total assets */
    totalAssets?: number;
    /** Total liabilities */
    totalLiabilities?: number;
    /** Stockholders equity */
    stockholdersEquity?: number;
    /** Operating cash flow */
    operatingCashFlow?: number;
    /** Free cash flow */
    freeCashFlow?: number;
    /** Research and development expenses */
    rdExpenses?: number;
    /** Debt (short-term) */
    shortTermDebt?: number;
    /** Debt (long-term) */
    longTermDebt?: number;
    /** Cash and equivalents */
    cashAndEquivalents?: number;
    /** Custom metrics */
    [key: string]: number | undefined;
  };
  /** Data source (filing accession number) */
  source?: string;
}

/**
 * Risk factors extracted from filings
 */
export interface RiskFactor {
  /** Risk category */
  category: string;
  /** Risk description */
  description: string;
  /** Severity (if quantifiable) */
  severity?: 'low' | 'medium' | 'high';
  /** Source filing */
  source: string;
  /** Extraction date */
  extractedDate: Date;
}

/**
 * Management Discussion & Analysis section
 */
export interface ManagementDiscussion {
  /** Filing accession number */
  filingAccessionNumber: string;
  /** Full MD&A text */
  fullText: string;
  /** Key topics/sections */
  sections?: Array<{
    title: string;
    content: string;
    wordCount?: number;
  }>;
  /** Extracted metrics or KPIs mentioned */
  mentionedMetrics?: string[];
  /** Word count */
  wordCount?: number;
  /** Sentiment indicators */
  sentiment?: {
    positive?: number;
    negative?: number;
    neutral?: number;
  };
}

/**
 * SEC filing search query
 */
export interface SECFilingSearchQuery {
  /** CIK or company name */
  company?: string;
  /** CIK numbers */
  ciks?: string[];
  /** Stock ticker symbols */
  tickers?: string[];
  /** Form types to search */
  formTypes?: SECFilingType[];
  /** Filing date range start */
  filingDateStart?: Date;
  /** Filing date range end */
  filingDateEnd?: Date;
  /** Keywords to search in filings */
  keywords?: string[];
  /** SIC codes */
  sicCodes?: string[];
  /** Include amendments */
  includeAmendments?: boolean;
  /** Maximum results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Sort by */
  sortBy?: 'filingDate' | 'reportDate' | 'relevance';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Company filing statistics
 */
export interface CompanyFilingStats {
  /** CIK */
  cik: string;
  /** Company name */
  companyName: string;
  /** Total filings */
  totalFilings: number;
  /** Filings by type */
  filingsByType: Record<string, number>;
  /** Recent filing dates */
  recentFilings: Date[];
  /** Average filings per year */
  avgFilingsPerYear?: number;
  /** First filing date */
  firstFilingDate?: Date;
  /** Last filing date */
  lastFilingDate?: Date;
}

/**
 * Filing trend data
 */
export interface FilingTrendDataPoint {
  /** Period (date) */
  period: Date;
  /** Number of filings */
  filingCount: number;
  /** Filings by type */
  byType?: Record<string, number>;
  /** Companies filing */
  companies?: string[];
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const PatentSchema = z.object({
  patentNumber: z.string(),
  applicationNumber: z.string().optional(),
  title: z.string(),
  abstract: z.string(),
  claims: z.array(z.string()).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(PatentType),
  status: z.nativeEnum(PatentStatus),
  filingDate: z.date(),
  publicationDate: z.date().optional(),
  grantDate: z.date().optional(),
  expirationDate: z.date().optional(),
  inventors: z.array(z.object({
    name: z.string(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional()
  })),
  assignees: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional()
  })),
  classifications: z.array(z.object({
    scheme: z.string(),
    mainClass: z.string(),
    subclass: z.string().optional(),
    description: z.string().optional()
  })),
  citations: z.array(z.object({
    type: z.enum(['forward', 'backward']),
    patentNumber: z.string(),
    date: z.date().optional(),
    category: z.string().optional()
  })).optional(),
  priorityDate: z.date().optional(),
  priorityCountry: z.string().optional(),
  claimCount: z.number().optional(),
  figureCount: z.number().optional(),
  relatedApplications: z.array(z.string()).optional(),
  documentUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const SECFilingSchema = z.object({
  accessionNumber: z.string(),
  cik: z.string(),
  companyName: z.string(),
  formType: z.nativeEnum(SECFilingType),
  filingDate: z.date(),
  reportDate: z.date().optional(),
  acceptanceDateTime: z.date().optional(),
  filingUrl: z.string().url(),
  htmlUrl: z.string().url().optional(),
  xmlUrl: z.string().url().optional(),
  primaryDocument: z.string().optional(),
  documents: z.array(z.object({
    sequence: z.number(),
    description: z.string(),
    filename: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number().optional()
  })).optional(),
  items: z.array(z.string()).optional(),
  size: z.number().optional(),
  isAmendment: z.boolean().optional(),
  fileNumber: z.string().optional(),
  filmNumber: z.string().optional()
});

export const FinancialDataSchema = z.object({
  period: z.string(),
  fiscalYear: z.number(),
  fiscalQuarter: z.number().min(1).max(4).optional(),
  currency: z.string(),
  metrics: z.record(z.number().optional()),
  source: z.string().optional()
});
