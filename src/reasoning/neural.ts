/**
 * Neural Components for Neurosymbolic Reasoning
 * Handles embeddings, vector search, pattern matching, and neural learning
 */

import type {
  MarketSignal,
  Embedding,
  VectorSearchResult,
  Pattern,
  PatternMatch,
  Episode,
} from './types.js';
import type { AgentDBClient } from './agentdb-client.js';

export interface NeuralConfig {
  embeddingModel: string;
  dimension: number;
  similarityThreshold: number;
  maxResults: number;
}

export class NeuralEngine {
  private config: NeuralConfig;
  private agentDB: AgentDBClient;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(config: NeuralConfig, agentDB: AgentDBClient) {
    this.config = config;
    this.agentDB = agentDB;
  }

  // ============================================================================
  // Embedding Generation
  // ============================================================================

  /**
   * Generate embedding for text content
   * In production, this would call a real embedding model (OpenAI, Transformers.js, etc.)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = this.embeddingCache.get(text);
    if (cached) {
      return cached;
    }

    // In production: Call embedding API or model
    // For now, generate a mock embedding
    const embedding = this.mockEmbedding(text);
    
    // Cache the result
    this.embeddingCache.set(text, embedding);
    
    return embedding;
  }

  /**
   * Generate embedding for market signal
   */
  async embedMarketSignal(signal: MarketSignal): Promise<Embedding> {
    // Create a text representation of the signal
    const text = this.serializeSignal(signal);
    
    // Generate embedding
    const vector = await this.generateEmbedding(text);
    
    return {
      id: signal.id,
      vector,
      dimension: this.config.dimension,
      model: this.config.embeddingModel,
      metadata: {
        signalType: signal.type,
        symbol: signal.symbol,
        timestamp: signal.timestamp.toISOString(),
        source: signal.source,
      },
    };
  }

  /**
   * Batch embed multiple market signals
   */
  async batchEmbedSignals(signals: MarketSignal[]): Promise<Embedding[]> {
    const embeddings: Embedding[] = [];
    
    for (const signal of signals) {
      const embedding = await this.embedMarketSignal(signal);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  /**
   * Store embeddings in AgentDB
   */
  async storeEmbeddings(embeddings: Embedding[]): Promise<void> {
    await this.agentDB.batchStoreEmbeddings(embeddings);
  }

  // ============================================================================
  // Semantic Search
  // ============================================================================

  /**
   * Search for similar market signals using semantic similarity
   */
  async searchSimilarSignals(
    querySignal: MarketSignal,
    limit?: number
  ): Promise<VectorSearchResult[]> {
    // Generate embedding for query
    const queryText = this.serializeSignal(querySignal);
    const queryVector = await this.generateEmbedding(queryText);
    
    // Search in AgentDB
    const results = await this.agentDB.searchSimilar(
      queryVector,
      limit || this.config.maxResults,
      this.config.similarityThreshold
    );
    
    return results;
  }

  /**
   * Find semantically similar text
   */
  async searchSimilarText(
    query: string,
    limit?: number
  ): Promise<VectorSearchResult[]> {
    const queryVector = await this.generateEmbedding(query);
    
    const results = await this.agentDB.searchSimilar(
      queryVector,
      limit || this.config.maxResults,
      this.config.similarityThreshold
    );
    
    return results;
  }

  // ============================================================================
  // Pattern Recognition
  // ============================================================================

  /**
   * Extract features from market signals for pattern recognition
   */
  extractFeatures(signals: MarketSignal[]): Record<string, number> {
    if (signals.length === 0) {
      return {};
    }

    // Calculate statistical features
    const values = signals.map(s => s.value);
    const confidences = signals.map(s => s.confidence);
    
    return {
      count: signals.length,
      mean: this.mean(values),
      std: this.std(values),
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      avgConfidence: this.mean(confidences),
      trend: this.calculateTrend(values),
      volatility: this.calculateVolatility(values),
    };
  }

  /**
   * Detect patterns in market signals
   */
  async detectPatterns(signals: MarketSignal[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Extract features
    const features = this.extractFeatures(signals);
    
    // Temporal pattern detection
    const temporalPattern = this.detectTemporalPattern(signals, features);
    if (temporalPattern) {
      patterns.push(temporalPattern);
    }
    
    // Anomaly detection
    const anomalyPattern = this.detectAnomaly(signals, features);
    if (anomalyPattern) {
      patterns.push(anomalyPattern);
    }
    
    // Trend detection
    const trendPattern = this.detectTrend(signals, features);
    if (trendPattern) {
      patterns.push(trendPattern);
    }
    
    // Store patterns in AgentDB
    for (const pattern of patterns) {
      await this.agentDB.storePattern(pattern);
    }
    
    return patterns;
  }

  /**
   * Match current signals against known patterns
   */
  async matchPatterns(signals: MarketSignal[]): Promise<PatternMatch[]> {
    const currentFeatures = this.extractFeatures(signals);
    
    // Get known patterns from AgentDB
    const knownPatterns = await this.agentDB.getPatterns(undefined, 0.5, 100);
    
    const matches: PatternMatch[] = [];
    
    for (const pattern of knownPatterns) {
      const similarity = this.calculateFeatureSimilarity(currentFeatures, pattern.features);
      
      if (similarity >= this.config.similarityThreshold) {
        matches.push({
          pattern,
          similarity,
          timestamp: new Date(),
          context: {
            signalCount: signals.length,
            features: currentFeatures,
          },
        });
      }
    }
    
    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);
    
    return matches;
  }

  // ============================================================================
  // Learning from Episodes
  // ============================================================================

  /**
   * Learn from historical episodes to improve predictions
   */
  async learnFromEpisodes(episodes: Episode[]): Promise<{
    patternsLearned: number;
    avgReward: number;
  }> {
    let patternsLearned = 0;
    const rewards: number[] = [];
    
    for (const episode of episodes) {
      // Extract state features
      const stateText = JSON.stringify(episode.state);
      const stateVector = await this.generateEmbedding(stateText);
      
      // Store embedding with episode metadata
      const embedding: Embedding = {
        id: `episode-\${episode.id}`,
        vector: stateVector,
        dimension: this.config.dimension,
        model: this.config.embeddingModel,
        metadata: {
          action: episode.action,
          outcome: episode.outcome,
          reward: episode.reward,
          timestamp: episode.timestamp.toISOString(),
        },
      };
      
      await this.agentDB.storeEmbedding(embedding);
      
      // Track rewards
      rewards.push(episode.reward);
      
      // If episode was successful, try to extract a pattern
      if (episode.reward > 0) {
        patternsLearned++;
      }
    }
    
    return {
      patternsLearned,
      avgReward: rewards.length > 0 ? this.mean(rewards) : 0,
    };
  }

  /**
   * Find similar past episodes given current state
   */
  async findSimilarEpisodes(state: Record<string, unknown>, limit: number = 10): Promise<Episode[]> {
    const stateText = JSON.stringify(state);
    const stateVector = await this.generateEmbedding(stateText);
    
    return await this.agentDB.findSimilarEpisodes(stateVector, limit);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Serialize market signal to text for embedding
   */
  private serializeSignal(signal: MarketSignal): string {
    return `\${signal.type} signal for \${signal.symbol}: value=\${signal.value}, confidence=\${signal.confidence}, source=\${signal.source}`;
  }

  /**
   * Generate a mock embedding (for development/testing)
   * In production, this would be replaced with a real embedding model
   */
  private mockEmbedding(text: string): number[] {
    const seed = this.hashString(text);
    const random = this.seededRandom(seed);
    
    const embedding = new Array(this.config.dimension);
    for (let i = 0; i < this.config.dimension; i++) {
      embedding[i] = random() * 2 - 1; // Range [-1, 1]
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Hash string to number (for seeding)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Calculate mean of array
   */
  private mean(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  }

  /**
   * Calculate standard deviation
   */
  private std(arr: number[]): number {
    const avg = this.mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Calculate trend (linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = this.mean(values);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }
    
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  private calculateVolatility(values: number[]): number {
    const avg = this.mean(values);
    return avg !== 0 ? this.std(values) / Math.abs(avg) : 0;
  }

  /**
   * Detect temporal pattern
   */
  private detectTemporalPattern(signals: MarketSignal[], features: Record<string, number>): Pattern | null {
    if (signals.length < 3) return null;
    
    // Check for consistent temporal progression
    const timeDeltas: number[] = [];
    for (let i = 1; i < signals.length; i++) {
      const delta = signals[i].timestamp.getTime() - signals[i-1].timestamp.getTime();
      timeDeltas.push(delta);
    }
    
    const avgDelta = this.mean(timeDeltas);
    const stdDelta = this.std(timeDeltas);
    
    // If time deltas are consistent (low std), it's a temporal pattern
    if (stdDelta / avgDelta < 0.3) {
      return {
        id: `temporal-\${Date.now()}`,
        name: 'Temporal Pattern',
        type: 'temporal',
        features: { ...features, avgTimeDelta: avgDelta },
        support: signals.length,
        confidence: 1 - (stdDelta / avgDelta),
        timestamp: new Date(),
      };
    }
    
    return null;
  }

  /**
   * Detect anomaly pattern
   */
  private detectAnomaly(signals: MarketSignal[], features: Record<string, number>): Pattern | null {
    if (signals.length < 5) return null;
    
    // Z-score based anomaly detection
    const values = signals.map(s => s.value);
    const mean = features.mean;
    const std = features.std;
    
    const zScores = values.map(v => Math.abs((v - mean) / (std || 1)));
    const maxZScore = Math.max(...zScores);
    
    // If any value has z-score > 2.5, it's an anomaly
    if (maxZScore > 2.5) {
      return {
        id: `anomaly-\${Date.now()}`,
        name: 'Anomaly Detected',
        type: 'anomaly',
        features: { ...features, maxZScore },
        support: 1,
        confidence: Math.min(maxZScore / 5, 0.99),
        timestamp: new Date(),
      };
    }
    
    return null;
  }

  /**
   * Detect trend pattern
   */
  private detectTrend(signals: MarketSignal[], features: Record<string, number>): Pattern | null {
    if (signals.length < 4) return null;
    
    const trend = features.trend;
    
    // Significant trend if slope is large relative to mean
    if (Math.abs(trend) > 0.1) {
      return {
        id: `trend-\${Date.now()}`,
        name: trend > 0 ? 'Upward Trend' : 'Downward Trend',
        type: 'trend',
        features: { ...features, trendStrength: Math.abs(trend) },
        support: signals.length,
        confidence: Math.min(Math.abs(trend) * 5, 0.99),
        timestamp: new Date(),
      };
    }
    
    return null;
  }

  /**
   * Calculate similarity between two feature vectors
   */
  private calculateFeatureSimilarity(
    features1: Record<string, number>,
    features2: Record<string, number>
  ): number {
    const keys = new Set([...Object.keys(features1), ...Object.keys(features2)]);
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (const key of keys) {
      const val1 = features1[key] || 0;
      const val2 = features2[key] || 0;
      
      dotProduct += val1 * val2;
      mag1 += val1 * val1;
      mag2 += val2 * val2;
    }
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    // Cosine similarity
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }
}

// Factory function
export function createNeuralEngine(config: NeuralConfig, agentDB: AgentDBClient): NeuralEngine {
  return new NeuralEngine(config, agentDB);
}
