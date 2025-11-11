/**
 * Signal Scoring System
 * Implements multi-dimensional scoring for market signals
 */

import {
  Signal,
  SignalScore,
  SignalStrength,
  DataSourceType,
  DataPoint,
} from './types.js';

export interface ScoringWeights {
  confidence: number;
  relevance: number;
  novelty: number;
  diversity: number;
  velocity: number;
  consistency: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  confidence: 0.25,
  relevance: 0.20,
  novelty: 0.15,
  diversity: 0.15,
  velocity: 0.15,
  consistency: 0.10,
};

export class SignalScorer {
  private weights: ScoringWeights;
  private historicalSignals: Map<string, Signal[]>;

  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
    this.historicalSignals = new Map();
  }

  /**
   * Calculate comprehensive score for a signal
   */
  public calculateScore(signal: Signal, dataPoints: DataPoint[]): SignalScore {
    const components = {
      confidence: this.scoreConfidence(signal),
      relevance: this.scoreRelevance(signal),
      novelty: this.scoreNovelty(signal),
      diversity: this.scoreDiversity(signal),
      velocity: this.scoreVelocity(signal, dataPoints),
      consistency: this.scoreConsistency(signal, dataPoints),
    };

    const overallScore = this.calculateWeightedScore(components);

    return {
      signalId: signal.id,
      overallScore,
      components,
      weights: { ...this.weights },
      calculatedAt: new Date(),
    };
  }

  /**
   * Score based on confidence level from neurosymbolic reasoning
   */
  private scoreConfidence(signal: Signal): number {
    // Base confidence from signal
    let score = signal.confidence;

    // Boost for strong reasoning chains
    if (signal.reasoning.logicalChain.length > 3) {
      score *= 1.1;
    }

    // Boost for knowledge graph integration
    if (signal.reasoning.knowledgeGraphEntities.length > 5) {
      score *= 1.05;
    }

    // Factor in evidence count
    const evidenceBoost = Math.min(
      0.1,
      (signal.evidence.length / 20) * 0.1
    );
    score += evidenceBoost;

    return Math.min(1.0, score);
  }

  /**
   * Score based on relevance to market conditions
   */
  private scoreRelevance(signal: Signal): number {
    let score = signal.relevance;

    // Boost for recency
    const ageInHours = (Date.now() - signal.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours < 24) {
      score *= 1.1;
    } else if (ageInHours > 72) {
      score *= 0.9;
    }

    // Boost for strong signals
    if (signal.strength === SignalStrength.VERY_STRONG) {
      score *= 1.15;
    } else if (signal.strength === SignalStrength.STRONG) {
      score *= 1.08;
    }

    return Math.min(1.0, score);
  }

  /**
   * Score based on novelty (how new/unique the signal is)
   */
  private scoreNovelty(signal: Signal): number {
    const similarSignals = this.findSimilarSignals(signal);

    if (similarSignals.length === 0) {
      return 1.0; // Completely novel
    }

    // Calculate similarity with existing signals
    const maxSimilarity = Math.max(
      ...similarSignals.map(s => this.calculateSimilarity(signal, s))
    );

    // Novel score is inverse of similarity
    return 1.0 - maxSimilarity;
  }

  /**
   * Score based on diversity of data sources
   */
  private scoreDiversity(signal: Signal): number {
    const sourceTypes = Object.keys(signal.metadata.sourceDistribution);
    const totalSources = Object.values(DataSourceType).length;

    // Base score from number of unique sources
    let score = sourceTypes.length / totalSources;

    // Bonus for balanced distribution
    const sourceValues = Object.values(signal.metadata.sourceDistribution);
    const mean = sourceValues.reduce((a, b) => a + b, 0) / sourceValues.length;
    const variance = sourceValues.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0) / sourceValues.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = more balanced = higher score
    const balanceBonus = Math.max(0, 0.3 - (stdDev / mean) * 0.3);
    score += balanceBonus;

    return Math.min(1.0, score);
  }

  /**
   * Score based on velocity (rate of signal emergence)
   */
  private scoreVelocity(signal: Signal, dataPoints: DataPoint[]): number {
    if (dataPoints.length < 2) {
      return 0.5; // Neutral score for insufficient data
    }

    const timeSpan = signal.metadata.timeSpan.end.getTime() -
                     signal.metadata.timeSpan.start.getTime();
    const hours = timeSpan / (1000 * 60 * 60);

    if (hours === 0) {
      return 0.5;
    }

    const pointsPerHour = dataPoints.length / hours;

    // Normalize velocity (assuming 10 points/hour is high velocity)
    let score = Math.min(1.0, pointsPerHour / 10);

    // Factor in the signal's recorded velocity
    if (signal.metadata.velocity > 0) {
      score = (score + signal.metadata.velocity) / 2;
    }

    return score;
  }

  /**
   * Score based on consistency across data points
   */
  private scoreConsistency(signal: Signal, dataPoints: DataPoint[]): number {
    if (dataPoints.length < 3) {
      return 0.5; // Neutral score for insufficient data
    }

    // Check sentiment consistency
    const sentiments = dataPoints
      .filter(dp => dp.sentiment !== undefined)
      .map(dp => dp.sentiment!);

    if (sentiments.length > 0) {
      const sentimentMean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
      const sentimentVariance = sentiments.reduce((sum, val) =>
        sum + Math.pow(val - sentimentMean, 2), 0) / sentiments.length;

      // Lower variance = more consistent
      const sentimentScore = Math.max(0, 1.0 - Math.sqrt(sentimentVariance));

      return sentimentScore;
    }

    // Fallback: check entity consistency
    const allEntities = dataPoints.flatMap(dp => dp.entities);
    const entityFreq = new Map<string, number>();
    allEntities.forEach(entity => {
      entityFreq.set(entity, (entityFreq.get(entity) || 0) + 1);
    });

    const maxFreq = Math.max(...Array.from(entityFreq.values()));
    return maxFreq / dataPoints.length;
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(components: SignalScore['components']): number {
    return (
      components.confidence * this.weights.confidence +
      components.relevance * this.weights.relevance +
      components.novelty * this.weights.novelty +
      components.diversity * this.weights.diversity +
      components.velocity * this.weights.velocity +
      components.consistency * this.weights.consistency
    );
  }

  /**
   * Find similar signals from history
   */
  private findSimilarSignals(signal: Signal): Signal[] {
    const allSignals: Signal[] = [];
    this.historicalSignals.forEach(signals => allSignals.push(...signals));

    return allSignals.filter(s => {
      if (s.id === signal.id) return false;

      // Check keyword overlap
      const keywordOverlap = signal.keywords.filter(k =>
        s.keywords.includes(k)
      ).length;

      return keywordOverlap >= 2;
    });
  }

  /**
   * Calculate similarity between two signals (0-1)
   */
  private calculateSimilarity(signal1: Signal, signal2: Signal): number {
    // Keyword similarity (Jaccard index)
    const keywords1 = new Set(signal1.keywords);
    const keywords2 = new Set(signal2.keywords);
    const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
    const union = new Set([...keywords1, ...keywords2]);
    const keywordSim = intersection.size / union.size;

    // Entity similarity
    const entities1 = new Set(signal1.entities);
    const entities2 = new Set(signal2.entities);
    const entityIntersection = new Set([...entities1].filter(e => entities2.has(e)));
    const entityUnion = new Set([...entities1, ...entities2]);
    const entitySim = entityUnion.size > 0 ? entityIntersection.size / entityUnion.size : 0;

    // Type similarity
    const typeSim = signal1.type === signal2.type ? 1.0 : 0.0;

    // Weighted average
    return (keywordSim * 0.4 + entitySim * 0.4 + typeSim * 0.2);
  }

  /**
   * Add signal to history for novelty scoring
   */
  public addToHistory(signal: Signal): void {
    const key = signal.type;
    const existing = this.historicalSignals.get(key) || [];
    existing.push(signal);

    // Keep only recent signals (last 100 per type)
    if (existing.length > 100) {
      existing.shift();
    }

    this.historicalSignals.set(key, existing);
  }

  /**
   * Update scoring weights
   */
  public updateWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };

    // Normalize weights to sum to 1
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    Object.keys(this.weights).forEach(key => {
      this.weights[key as keyof ScoringWeights] /= sum;
    });
  }

  /**
   * Get current weights
   */
  public getWeights(): ScoringWeights {
    return { ...this.weights };
  }
}
