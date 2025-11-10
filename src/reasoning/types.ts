/**
 * Core types for the neurosymbolic reasoning engine
 */

import { z } from 'zod';

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketSignal {
  id: string;
  timestamp: Date;
  source: string;
  type: 'price' | 'volume' | 'sentiment' | 'news' | 'social' | 'technical';
  symbol: string;
  value: number;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface MarketEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  impact: 'high' | 'medium' | 'low';
  symbols: string[];
  description: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Embedding and Vector Types
// ============================================================================

export interface Embedding {
  id: string;
  vector: number[];
  dimension: number;
  model: string;
  metadata: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  distance: number;
  metadata: Record<string, unknown>;
  content?: string;
}

// ============================================================================
// Causal Inference Types
// ============================================================================

export interface CausalEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  confidence: number;
  evidence: string[];
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface CausalNode {
  id: string;
  name: string;
  type: 'signal' | 'event' | 'outcome';
  metadata: Record<string, unknown>;
}

export interface CausalInferenceResult {
  cause: string;
  effect: string;
  strength: number;
  confidence: number;
  path: string[];
  explanation: string;
}

// ============================================================================
// Symbolic Reasoning Types
// ============================================================================

export interface LogicRule {
  id: string;
  name: string;
  conditions: Condition[];
  conclusions: Conclusion[];
  confidence: number;
  priority: number;
}

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

export interface Conclusion {
  field: string;
  value: unknown;
  action: 'set' | 'increment' | 'flag';
}

export interface OntologyEntity {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  relationships: Relationship[];
}

export interface Relationship {
  type: string;
  target: string;
  properties: Record<string, unknown>;
}

export interface InferenceResult {
  rule: string;
  matched: boolean;
  conclusions: Conclusion[];
  confidence: number;
  explanation: string;
}

// ============================================================================
// Pattern Recognition Types
// ============================================================================

export interface Pattern {
  id: string;
  name: string;
  type: 'temporal' | 'correlation' | 'anomaly' | 'trend';
  features: Record<string, number>;
  support: number;
  confidence: number;
  timestamp: Date;
}

export interface PatternMatch {
  pattern: Pattern;
  similarity: number;
  timestamp: Date;
  context: Record<string, unknown>;
}

// ============================================================================
// Reflexion and Learning Types
// ============================================================================

export interface Episode {
  id: string;
  timestamp: Date;
  state: Record<string, unknown>;
  action: string;
  outcome: string;
  reward: number;
  reflection: string;
  metadata: Record<string, unknown>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  examples: string[];
  successRate: number;
  usageCount: number;
  lastUsed: Date;
}

export interface LearningMetrics {
  episodesProcessed: number;
  patternsDiscovered: number;
  skillsLearned: number;
  averageReward: number;
  improvementRate: number;
}

// ============================================================================
// Reasoning Engine Types
// ============================================================================

export interface ReasoningContext {
  signals: MarketSignal[];
  events: MarketEvent[];
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface ReasoningResult {
  insights: Insight[];
  predictions: Prediction[];
  recommendations: Recommendation[];
  confidence: number;
  executionTime: number;
  metadata: Record<string, unknown>;
}

export interface Insight {
  id: string;
  type: 'causal' | 'pattern' | 'anomaly' | 'correlation';
  description: string;
  confidence: number;
  evidence: string[];
  timestamp: Date;
}

export interface Prediction {
  id: string;
  target: string;
  horizon: number; // in seconds
  value: number;
  confidence: number;
  method: 'causal' | 'pattern' | 'neural' | 'hybrid';
  explanation: string;
}

export interface Recommendation {
  id: string;
  action: string;
  rationale: string;
  confidence: number;
  priority: number;
  expectedOutcome: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ReasoningConfig {
  agentdb: {
    dbPath: string;
    dimension: number;
    preset: 'small' | 'medium' | 'large';
  };
  neural: {
    embeddingModel: string;
    similarityThreshold: number;
    maxResults: number;
  };
  symbolic: {
    enableRuleEngine: boolean;
    enableOntology: boolean;
    maxInferenceDepth: number;
  };
  causal: {
    minConfidence: number;
    maxPathLength: number;
    enableLearning: boolean;
  };
  reflexion: {
    enableLearning: boolean;
    retentionPeriod: number; // in days
    minRewardThreshold: number;
  };
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const MarketSignalSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  source: z.string(),
  type: z.enum(['price', 'volume', 'sentiment', 'news', 'social', 'technical']),
  symbol: z.string(),
  value: z.number(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.unknown()),
});

export const CausalEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  strength: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  timestamp: z.date(),
  metadata: z.record(z.unknown()),
});

export const LogicRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  conditions: z.array(
    z.object({
      field: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains']),
      value: z.unknown(),
    })
  ),
  conclusions: z.array(
    z.object({
      field: z.string(),
      value: z.unknown(),
      action: z.enum(['set', 'increment', 'flag']),
    })
  ),
  confidence: z.number().min(0).max(1),
  priority: z.number(),
});

export const ReasoningConfigSchema = z.object({
  agentdb: z.object({
    dbPath: z.string(),
    dimension: z.number(),
    preset: z.enum(['small', 'medium', 'large']),
  }),
  neural: z.object({
    embeddingModel: z.string(),
    similarityThreshold: z.number().min(0).max(1),
    maxResults: z.number().positive(),
  }),
  symbolic: z.object({
    enableRuleEngine: z.boolean(),
    enableOntology: z.boolean(),
    maxInferenceDepth: z.number().positive(),
  }),
  causal: z.object({
    minConfidence: z.number().min(0).max(1),
    maxPathLength: z.number().positive(),
    enableLearning: z.boolean(),
  }),
  reflexion: z.object({
    enableLearning: z.boolean(),
    retentionPeriod: z.number().positive(),
    minRewardThreshold: z.number(),
  }),
});
