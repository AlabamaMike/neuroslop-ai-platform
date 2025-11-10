/**
 * Signal Detection Types
 * Comprehensive type definitions for the neurosymbolic market signals platform
 */

export enum SignalType {
  EMERGING_TREND = 'emerging_trend',
  SENTIMENT_SHIFT = 'sentiment_shift',
  VOLUME_SPIKE = 'volume_spike',
  PATTERN_DETECTED = 'pattern_detected',
  ANOMALY = 'anomaly',
  CORRELATION = 'correlation',
}

export enum SignalStrength {
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

export enum DataSourceType {
  REDDIT = 'reddit',
  TWITTER = 'twitter',
  USPTO = 'uspto',
  EDGAR = 'edgar',
  NEWS = 'news',
  SOCIAL_MEDIA = 'social_media',
  BLOCKCHAIN = 'blockchain',
  MARKET_DATA = 'market_data',
}

export interface DataPoint {
  id: string;
  sourceType: DataSourceType;
  sourceId: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
  entities: string[];
  sentiment?: number;
  relevanceScore?: number;
}

export interface SignalEvidence {
  dataPointId: string;
  sourceType: DataSourceType;
  snippet: string;
  relevanceScore: number;
  timestamp: Date;
}

export interface NeurosymbolicReasoning {
  rules: string[];
  inferences: string[];
  confidenceFactors: Record<string, number>;
  knowledgeGraphEntities: string[];
  logicalChain: string[];
}

export interface Signal {
  id: string;
  type: SignalType;
  title: string;
  description: string;
  keywords: string[];
  entities: string[];
  confidence: number;
  relevance: number;
  strength: SignalStrength;
  evidence: SignalEvidence[];
  reasoning: NeurosymbolicReasoning;
  metadata: {
    dataPointCount: number;
    sourceDistribution: Record<DataSourceType, number>;
    timeSpan: {
      start: Date;
      end: Date;
    };
    velocity: number; // Rate of signal growth
    momentum: number; // Acceleration of signal
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface SignalScore {
  signalId: string;
  overallScore: number;
  components: {
    confidence: number;
    relevance: number;
    novelty: number;
    diversity: number;
    velocity: number;
    consistency: number;
  };
  weights: {
    confidence: number;
    relevance: number;
    novelty: number;
    diversity: number;
    velocity: number;
    consistency: number;
  };
  calculatedAt: Date;
}

export interface TrendingSignal {
  signal: Signal;
  score: SignalScore;
  trend: {
    direction: 'rising' | 'falling' | 'stable';
    changeRate: number;
    peakTime?: Date;
  };
}

export interface SignalEvolution {
  signalId: string;
  snapshots: SignalSnapshot[];
  trajectory: 'growing' | 'declining' | 'stable' | 'volatile';
  healthStatus: 'healthy' | 'degrading' | 'stale';
}

export interface SignalSnapshot {
  timestamp: Date;
  confidence: number;
  relevance: number;
  dataPointCount: number;
  strength: SignalStrength;
}

export interface AggregationConfig {
  sources: DataSourceType[];
  timeWindow: {
    start: Date;
    end: Date;
  };
  minDataPoints: number;
  keywords?: string[];
  entities?: string[];
}

export interface DetectionConfig {
  confidenceThreshold: number;
  relevanceThreshold: number;
  minEvidencePoints: number;
  enableNeurosymbolicReasoning: boolean;
  signalTypes: SignalType[];
  maxSignalsPerRun: number;
}

export interface SourceConfiguration {
  type: DataSourceType;
  enabled: boolean;
  config: Record<string, any>;
  credentials?: Record<string, any>;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface SearchQuery {
  keywords?: string[];
  entities?: string[];
  signalTypes?: SignalType[];
  minConfidence?: number;
  minRelevance?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  signals: Signal[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    api: boolean;
    websocket: boolean;
    cache: boolean;
    signalDetector: boolean;
  };
  metrics: {
    activeSignals: number;
    signalsDetected24h: number;
    avgConfidence: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

export interface WebSocketMessage {
  type: 'signal_detected' | 'signal_updated' | 'signal_expired' | 'trending_update';
  timestamp: Date;
  data: Signal | TrendingSignal | Signal[] | TrendingSignal[];
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}
