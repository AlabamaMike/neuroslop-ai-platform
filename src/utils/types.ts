export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment?: number;
  relevance?: number;
}

export interface SocialPost {
  id: string;
  platform: string;
  content: string;
  author: string;
  score: number;
  comments: number;
  timestamp: string;
  sentiment?: number;
}

export interface Signal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold';
  strength: number;
  confidence: number;
  reasoning: string[];
  sources: string[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ReasoningStep {
  id: string;
  type: string;
  input: unknown;
  output: unknown;
  reasoning: string;
  confidence: number;
  timestamp: string;
}

export interface KnowledgeGraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface KnowledgeGraphRelationship {
  id: string;
  type: string;
  source: string;
  target: string;
  properties: Record<string, unknown>;
}

export interface PlatformConfig {
  anthropicApiKey: string;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  logLevel?: string;
  maxReasoningSteps?: number;
  confidenceThreshold?: number;
}
