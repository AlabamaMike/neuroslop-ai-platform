/**
 * Signal Detection Engine
 * Implements neurosymbolic reasoning for market signal detection
 */

import {
  Signal,
  SignalType,
  SignalStrength,
  DataPoint,
  DataSourceType,
  DetectionConfig,
  SignalEvidence,
  NeurosymbolicReasoning,
  SignalEvolution,
  SignalSnapshot,
  TrendingSignal,
} from './types.js';
import { DataAggregator } from './aggregator.js';
import { SignalScorer, ScoringWeights } from './scoring.js';
import { v4 as uuidv4 } from 'uuid';

export class SignalDetector {
  private aggregator: DataAggregator;
  private scorer: SignalScorer;
  private config: DetectionConfig;
  private activeSignals: Map<string, Signal>;
  private signalHistory: Map<string, SignalEvolution>;
  private detectionCallbacks: Array<(signal: Signal) => void>;

  constructor(
    aggregator: DataAggregator,
    config: DetectionConfig,
    scoringWeights?: ScoringWeights
  ) {
    this.aggregator = aggregator;
    this.scorer = new SignalScorer(scoringWeights);
    this.config = config;
    this.activeSignals = new Map();
    this.signalHistory = new Map();
    this.detectionCallbacks = [];
  }

  /**
   * Detect signals from aggregated data
   */
  public async detectSignals(dataPoints: DataPoint[]): Promise<Signal[]> {
    if (dataPoints.length < this.config.minEvidencePoints) {
      return [];
    }

    const detectedSignals: Signal[] = [];

    // Group data points by similarity
    const clusters = this.clusterDataPoints(dataPoints);

    for (const cluster of clusters) {
      if (cluster.length < this.config.minEvidencePoints) {
        continue;
      }

      // Detect different types of signals
      for (const signalType of this.config.signalTypes) {
        const signal = await this.detectSignalType(signalType, cluster);

        if (signal && this.meetsThresholds(signal)) {
          // Calculate score
          const score = this.scorer.calculateScore(signal, cluster);

          if (score.overallScore >= 0.5) {
            detectedSignals.push(signal);
            this.scorer.addToHistory(signal);

            // Track signal evolution
            this.trackSignalEvolution(signal);

            // Notify callbacks
            this.notifyDetection(signal);
          }
        }

        if (detectedSignals.length >= this.config.maxSignalsPerRun) {
          break;
        }
      }

      if (detectedSignals.length >= this.config.maxSignalsPerRun) {
        break;
      }
    }

    // Update active signals
    detectedSignals.forEach(signal => {
      this.activeSignals.set(signal.id, signal);
    });

    return detectedSignals;
  }

  /**
   * Detect specific signal type from data cluster
   */
  private async detectSignalType(
    type: SignalType,
    dataPoints: DataPoint[]
  ): Promise<Signal | null> {
    switch (type) {
      case SignalType.EMERGING_TREND:
        return this.detectEmergingTrend(dataPoints);
      case SignalType.SENTIMENT_SHIFT:
        return this.detectSentimentShift(dataPoints);
      case SignalType.VOLUME_SPIKE:
        return this.detectVolumeSpike(dataPoints);
      case SignalType.PATTERN_DETECTED:
        return this.detectPattern(dataPoints);
      case SignalType.ANOMALY:
        return this.detectAnomaly(dataPoints);
      case SignalType.CORRELATION:
        return this.detectCorrelation(dataPoints);
      default:
        return null;
    }
  }

  /**
   * Detect emerging trend
   */
  private detectEmergingTrend(dataPoints: DataPoint[]): Signal | null {
    // Extract keywords and entities
    const keywords = this.extractKeywords(dataPoints);
    const entities = this.extractEntities(dataPoints);

    if (keywords.length < 2) {
      return null;
    }

    // Analyze temporal distribution
    const sorted = [...dataPoints].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const timeSpan = {
      start: sorted[0].timestamp,
      end: sorted[sorted.length - 1].timestamp,
    };

    // Calculate velocity and momentum
    const velocity = this.calculateVelocity(sorted);
    const momentum = this.calculateMomentum(sorted);

    // Apply neurosymbolic reasoning
    const reasoning = this.applyNeurosymbolicReasoning(dataPoints, {
      keywords,
      entities,
      type: SignalType.EMERGING_TREND,
    });

    // Calculate confidence based on reasoning
    const confidence = this.calculateConfidence(reasoning, velocity, momentum);

    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    const evidence = this.buildEvidence(dataPoints);
    const strength = this.determineStrength(confidence, velocity);

    return {
      id: uuidv4(),
      type: SignalType.EMERGING_TREND,
      title: `Emerging Trend: ${keywords.slice(0, 3).join(', ')}`,
      description: this.generateDescription(SignalType.EMERGING_TREND, keywords, entities),
      keywords,
      entities,
      confidence,
      relevance: this.calculateRelevance(dataPoints),
      strength,
      evidence,
      reasoning,
      metadata: {
        dataPointCount: dataPoints.length,
        sourceDistribution: this.getSourceDistribution(dataPoints),
        timeSpan,
        velocity,
        momentum,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Detect sentiment shift
   */
  private detectSentimentShift(dataPoints: DataPoint[]): Signal | null {
    const withSentiment = dataPoints.filter(dp => dp.sentiment !== undefined);

    if (withSentiment.length < this.config.minEvidencePoints) {
      return null;
    }

    // Sort by time
    const sorted = [...withSentiment].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Split into early and late periods
    const midpoint = Math.floor(sorted.length / 2);
    const early = sorted.slice(0, midpoint);
    const late = sorted.slice(midpoint);

    const earlyAvg = early.reduce((sum, dp) => sum + dp.sentiment!, 0) / early.length;
    const lateAvg = late.reduce((sum, dp) => sum + dp.sentiment!, 0) / late.length;

    const shift = Math.abs(lateAvg - earlyAvg);

    if (shift < 0.3) {
      return null; // Not significant enough
    }

    const keywords = this.extractKeywords(dataPoints);
    const entities = this.extractEntities(dataPoints);

    const reasoning = this.applyNeurosymbolicReasoning(dataPoints, {
      keywords,
      entities,
      type: SignalType.SENTIMENT_SHIFT,
      sentimentShift: shift,
    });

    const confidence = Math.min(1.0, shift * 1.5 + reasoning.confidenceFactors.overall);

    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    return {
      id: uuidv4(),
      type: SignalType.SENTIMENT_SHIFT,
      title: `Sentiment Shift: ${lateAvg > earlyAvg ? 'Positive' : 'Negative'}`,
      description: this.generateDescription(SignalType.SENTIMENT_SHIFT, keywords, entities),
      keywords,
      entities,
      confidence,
      relevance: this.calculateRelevance(dataPoints),
      strength: this.determineStrength(confidence, shift),
      evidence: this.buildEvidence(dataPoints),
      reasoning,
      metadata: {
        dataPointCount: dataPoints.length,
        sourceDistribution: this.getSourceDistribution(dataPoints),
        timeSpan: {
          start: sorted[0].timestamp,
          end: sorted[sorted.length - 1].timestamp,
        },
        velocity: this.calculateVelocity(sorted),
        momentum: shift,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Detect volume spike
   */
  private detectVolumeSpike(dataPoints: DataPoint[]): Signal | null {
    // Group by time buckets (e.g., hourly)
    const buckets = this.groupByTimeBuckets(dataPoints, 60 * 60 * 1000); // 1 hour

    if (buckets.length < 3) {
      return null;
    }

    const counts = buckets.map(b => b.length);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const max = Math.max(...counts);

    // Detect spike (3x above mean)
    if (max < mean * 3) {
      return null;
    }

    const spikeIndex = counts.indexOf(max);
    const spikeBucket = buckets[spikeIndex];

    const keywords = this.extractKeywords(spikeBucket);
    const entities = this.extractEntities(spikeBucket);

    const reasoning = this.applyNeurosymbolicReasoning(spikeBucket, {
      keywords,
      entities,
      type: SignalType.VOLUME_SPIKE,
    });

    const confidence = Math.min(1.0, (max / mean) / 5);

    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    return {
      id: uuidv4(),
      type: SignalType.VOLUME_SPIKE,
      title: `Volume Spike: ${keywords.slice(0, 3).join(', ')}`,
      description: this.generateDescription(SignalType.VOLUME_SPIKE, keywords, entities),
      keywords,
      entities,
      confidence,
      relevance: this.calculateRelevance(spikeBucket),
      strength: this.determineStrength(confidence, max / mean),
      evidence: this.buildEvidence(spikeBucket),
      reasoning,
      metadata: {
        dataPointCount: spikeBucket.length,
        sourceDistribution: this.getSourceDistribution(spikeBucket),
        timeSpan: {
          start: spikeBucket[0].timestamp,
          end: spikeBucket[spikeBucket.length - 1].timestamp,
        },
        velocity: max / mean,
        momentum: confidence,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Detect pattern
   */
  private detectPattern(dataPoints: DataPoint[]): Signal | null {
    // Simplified pattern detection
    const keywords = this.extractKeywords(dataPoints);
    const entities = this.extractEntities(dataPoints);

    // Look for recurring patterns in entities
    const entityFreq = new Map<string, number>();
    dataPoints.forEach(dp => {
      dp.entities.forEach(entity => {
        entityFreq.set(entity, (entityFreq.get(entity) || 0) + 1);
      });
    });

    const maxFreq = Math.max(...Array.from(entityFreq.values()));
    const patternStrength = maxFreq / dataPoints.length;

    if (patternStrength < 0.5) {
      return null;
    }

    const reasoning = this.applyNeurosymbolicReasoning(dataPoints, {
      keywords,
      entities,
      type: SignalType.PATTERN_DETECTED,
    });

    const confidence = (patternStrength + reasoning.confidenceFactors.overall) / 2;

    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    return {
      id: uuidv4(),
      type: SignalType.PATTERN_DETECTED,
      title: `Pattern Detected: ${keywords.slice(0, 3).join(', ')}`,
      description: this.generateDescription(SignalType.PATTERN_DETECTED, keywords, entities),
      keywords,
      entities,
      confidence,
      relevance: this.calculateRelevance(dataPoints),
      strength: this.determineStrength(confidence, patternStrength),
      evidence: this.buildEvidence(dataPoints),
      reasoning,
      metadata: {
        dataPointCount: dataPoints.length,
        sourceDistribution: this.getSourceDistribution(dataPoints),
        timeSpan: {
          start: dataPoints[0].timestamp,
          end: dataPoints[dataPoints.length - 1].timestamp,
        },
        velocity: patternStrength,
        momentum: confidence,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Detect anomaly
   */
  private detectAnomaly(dataPoints: DataPoint[]): Signal | null {
    // Look for outliers in relevance scores
    const scores = dataPoints
      .filter(dp => dp.relevanceScore !== undefined)
      .map(dp => dp.relevanceScore!);

    if (scores.length < this.config.minEvidencePoints) {
      return null;
    }

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Find outliers (> 2 std devs from mean)
    const outliers = dataPoints.filter(dp =>
      dp.relevanceScore && Math.abs(dp.relevanceScore - mean) > 2 * stdDev
    );

    if (outliers.length === 0) {
      return null;
    }

    const keywords = this.extractKeywords(outliers);
    const entities = this.extractEntities(outliers);

    const reasoning = this.applyNeurosymbolicReasoning(outliers, {
      keywords,
      entities,
      type: SignalType.ANOMALY,
    });

    const confidence = Math.min(1.0, (outliers.length / dataPoints.length) * 3);

    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    return {
      id: uuidv4(),
      type: SignalType.ANOMALY,
      title: `Anomaly Detected: ${keywords.slice(0, 3).join(', ')}`,
      description: this.generateDescription(SignalType.ANOMALY, keywords, entities),
      keywords,
      entities,
      confidence,
      relevance: this.calculateRelevance(outliers),
      strength: this.determineStrength(confidence, stdDev),
      evidence: this.buildEvidence(outliers),
      reasoning,
      metadata: {
        dataPointCount: outliers.length,
        sourceDistribution: this.getSourceDistribution(outliers),
        timeSpan: {
          start: outliers[0].timestamp,
          end: outliers[outliers.length - 1].timestamp,
        },
        velocity: stdDev,
        momentum: confidence,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Detect correlation between entities
   */
  private detectCorrelation(dataPoints: DataPoint[]): Signal | null {
    // Find co-occurring entities
    const coOccurrence = new Map<string, Map<string, number>>();

    dataPoints.forEach(dp => {
      for (let i = 0; i < dp.entities.length; i++) {
        for (let j = i + 1; j < dp.entities.length; j++) {
          const entity1 = dp.entities[i];
          const entity2 = dp.entities[j];

          if (!coOccurrence.has(entity1)) {
            coOccurrence.set(entity1, new Map());
          }

          const map = coOccurrence.get(entity1)!;
          map.set(entity2, (map.get(entity2) || 0) + 1);
        }
      }
    });

    // Find strongest correlation
    let maxCorrelation = 0;
    let correlatedPair: [string, string] | null = null;

    coOccurrence.forEach((map, entity1) => {
      map.forEach((count, entity2) => {
        if (count > maxCorrelation) {
          maxCorrelation = count;
          correlatedPair = [entity1, entity2];
        }
      });
    });

    if (!correlatedPair || maxCorrelation < this.config.minEvidencePoints) {
      return null;
    }

    const keywords = this.extractKeywords(dataPoints);
    const entities = [correlatedPair[0], correlatedPair[1]];

    const reasoning = this.applyNeurosymbolicReasoning(dataPoints, {
      keywords,
      entities,
      type: SignalType.CORRELATION,
    });

    const confidence = Math.min(1.0, maxCorrelation / dataPoints.length);

    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    return {
      id: uuidv4(),
      type: SignalType.CORRELATION,
      title: `Correlation: ${correlatedPair[0]} & ${correlatedPair[1]}`,
      description: this.generateDescription(SignalType.CORRELATION, keywords, entities),
      keywords,
      entities,
      confidence,
      relevance: this.calculateRelevance(dataPoints),
      strength: this.determineStrength(confidence, maxCorrelation / dataPoints.length),
      evidence: this.buildEvidence(dataPoints),
      reasoning,
      metadata: {
        dataPointCount: dataPoints.length,
        sourceDistribution: this.getSourceDistribution(dataPoints),
        timeSpan: {
          start: dataPoints[0].timestamp,
          end: dataPoints[dataPoints.length - 1].timestamp,
        },
        velocity: maxCorrelation / dataPoints.length,
        momentum: confidence,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Apply neurosymbolic reasoning
   */
  private applyNeurosymbolicReasoning(
    dataPoints: DataPoint[],
    context: any
  ): NeurosymbolicReasoning {
    if (!this.config.enableNeurosymbolicReasoning) {
      return {
        rules: [],
        inferences: [],
        confidenceFactors: { overall: 0.5 },
        knowledgeGraphEntities: [],
        logicalChain: [],
      };
    }

    // Symbolic rules
    const rules: string[] = [
      'IF multiple_sources AND high_frequency THEN high_confidence',
      'IF sentiment_consistent AND entity_overlap THEN strong_signal',
      'IF temporal_clustering AND source_diversity THEN emerging_trend',
    ];

    // Extract knowledge graph entities
    const knowledgeGraphEntities = Array.from(
      new Set(dataPoints.flatMap(dp => dp.entities))
    );

    // Build logical inferences
    const inferences: string[] = [];
    const confidenceFactors: Record<string, number> = {};

    // Inference: Source diversity
    const sourceTypes = new Set(dataPoints.map(dp => dp.sourceType));
    const totalSourceTypes = Object.keys(DataSourceType).length;
    const diversity = sourceTypes.size / totalSourceTypes;
    confidenceFactors.diversity = diversity;
    inferences.push(
      `Detected ${sourceTypes.size} unique sources, diversity score: ${diversity.toFixed(2)}`
    );

    // Inference: Temporal consistency
    const timeSpan =
      dataPoints[dataPoints.length - 1].timestamp.getTime() -
      dataPoints[0].timestamp.getTime();
    const consistency = Math.min(1.0, dataPoints.length / (timeSpan / (60 * 60 * 1000)));
    confidenceFactors.temporal = consistency;
    inferences.push(`Temporal consistency score: ${consistency.toFixed(2)}`);

    // Inference: Entity coherence
    const entityFreq = new Map<string, number>();
    dataPoints.forEach(dp => {
      dp.entities.forEach(entity => {
        entityFreq.set(entity, (entityFreq.get(entity) || 0) + 1);
      });
    });
    const maxEntityFreq = Math.max(...Array.from(entityFreq.values()));
    const coherence = maxEntityFreq / dataPoints.length;
    confidenceFactors.coherence = coherence;
    inferences.push(`Entity coherence score: ${coherence.toFixed(2)}`);

    // Overall confidence
    confidenceFactors.overall =
      (diversity + consistency + coherence) / 3;

    // Build logical chain
    const logicalChain = [
      `Analyzed ${dataPoints.length} data points`,
      `Identified ${knowledgeGraphEntities.length} entities`,
      `Applied ${rules.length} symbolic rules`,
      `Generated ${inferences.length} inferences`,
      `Overall confidence: ${confidenceFactors.overall.toFixed(2)}`,
    ];

    return {
      rules,
      inferences,
      confidenceFactors,
      knowledgeGraphEntities,
      logicalChain,
    };
  }

  /**
   * Helper methods
   */

  private clusterDataPoints(dataPoints: DataPoint[]): DataPoint[][] {
    // Simple clustering by keyword similarity
    const clusters: DataPoint[][] = [];
    const processed = new Set<string>();

    dataPoints.forEach(dp => {
      if (processed.has(dp.id)) {
        return;
      }

      const cluster = [dp];
      processed.add(dp.id);

      // Find similar data points
      dataPoints.forEach(other => {
        if (processed.has(other.id)) {
          return;
        }

        const overlap = dp.entities.filter(e => other.entities.includes(e)).length;
        if (overlap >= 2) {
          cluster.push(other);
          processed.add(other.id);
        }
      });

      if (cluster.length >= this.config.minEvidencePoints) {
        clusters.push(cluster);
      }
    });

    return clusters;
  }

  private extractKeywords(dataPoints: DataPoint[]): string[] {
    const wordFreq = new Map<string, number>();

    dataPoints.forEach(dp => {
      const words = dp.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractEntities(dataPoints: DataPoint[]): string[] {
    const entitySet = new Set<string>();
    dataPoints.forEach(dp => {
      dp.entities.forEach(entity => entitySet.add(entity));
    });
    return Array.from(entitySet);
  }

  private calculateVelocity(dataPoints: DataPoint[]): number {
    if (dataPoints.length < 2) {
      return 0;
    }

    const timeSpan =
      dataPoints[dataPoints.length - 1].timestamp.getTime() -
      dataPoints[0].timestamp.getTime();

    if (timeSpan === 0) {
      return 0;
    }

    return dataPoints.length / (timeSpan / (1000 * 60 * 60)); // points per hour
  }

  private calculateMomentum(dataPoints: DataPoint[]): number {
    if (dataPoints.length < 4) {
      return 0;
    }

    const midpoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, midpoint);
    const secondHalf = dataPoints.slice(midpoint);

    const firstVelocity = this.calculateVelocity(firstHalf);
    const secondVelocity = this.calculateVelocity(secondHalf);

    return secondVelocity - firstVelocity;
  }

  private calculateConfidence(
    reasoning: NeurosymbolicReasoning,
    velocity: number,
    momentum: number
  ): number {
    const baseConfidence = reasoning.confidenceFactors.overall || 0.5;
    const velocityFactor = Math.min(1.0, velocity / 10);
    const momentumFactor = Math.min(1.0, Math.abs(momentum) / 5);

    return (baseConfidence + velocityFactor + momentumFactor) / 3;
  }

  private calculateRelevance(dataPoints: DataPoint[]): number {
    const scores = dataPoints
      .filter(dp => dp.relevanceScore !== undefined)
      .map(dp => dp.relevanceScore!);

    if (scores.length === 0) {
      return 0.5;
    }

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private determineStrength(confidence: number, factor: number): SignalStrength {
    const combined = (confidence + Math.min(1.0, factor)) / 2;

    if (combined >= 0.8) return SignalStrength.VERY_STRONG;
    if (combined >= 0.65) return SignalStrength.STRONG;
    if (combined >= 0.5) return SignalStrength.MODERATE;
    return SignalStrength.WEAK;
  }

  private buildEvidence(dataPoints: DataPoint[]): SignalEvidence[] {
    return dataPoints.slice(0, 10).map(dp => ({
      dataPointId: dp.id,
      sourceType: dp.sourceType,
      snippet: dp.content.substring(0, 200),
      relevanceScore: dp.relevanceScore || 0.5,
      timestamp: dp.timestamp,
    }));
  }

  private getSourceDistribution(dataPoints: DataPoint[]): Record<string, number> {
    const dist: Record<string, number> = {};
    dataPoints.forEach(dp => {
      dist[dp.sourceType] = (dist[dp.sourceType] || 0) + 1;
    });
    return dist;
  }

  private groupByTimeBuckets(
    dataPoints: DataPoint[],
    bucketSizeMs: number
  ): DataPoint[][] {
    const sorted = [...dataPoints].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const buckets: DataPoint[][] = [];
    let currentBucket: DataPoint[] = [];
    let bucketStart = sorted[0].timestamp.getTime();

    sorted.forEach(dp => {
      if (dp.timestamp.getTime() - bucketStart > bucketSizeMs) {
        if (currentBucket.length > 0) {
          buckets.push(currentBucket);
        }
        currentBucket = [dp];
        bucketStart = dp.timestamp.getTime();
      } else {
        currentBucket.push(dp);
      }
    });

    if (currentBucket.length > 0) {
      buckets.push(currentBucket);
    }

    return buckets;
  }

  private generateDescription(
    type: SignalType,
    keywords: string[],
    entities: string[]
  ): string {
    const keywordStr = keywords.slice(0, 5).join(', ');
    const entityStr = entities.slice(0, 3).join(', ');

    switch (type) {
      case SignalType.EMERGING_TREND:
        return `An emerging trend has been detected around ${keywordStr}. Key entities: ${entityStr}.`;
      case SignalType.SENTIMENT_SHIFT:
        return `A significant sentiment shift has been observed for ${keywordStr}. Entities involved: ${entityStr}.`;
      case SignalType.VOLUME_SPIKE:
        return `A volume spike detected for ${keywordStr}. Related entities: ${entityStr}.`;
      case SignalType.PATTERN_DETECTED:
        return `A recurring pattern identified involving ${keywordStr}. Key entities: ${entityStr}.`;
      case SignalType.ANOMALY:
        return `An anomaly has been detected in data related to ${keywordStr}. Entities: ${entityStr}.`;
      case SignalType.CORRELATION:
        return `A strong correlation found between ${entityStr}.`;
      default:
        return `Signal detected for ${keywordStr}.`;
    }
  }

  private meetsThresholds(signal: Signal): boolean {
    return (
      signal.confidence >= this.config.confidenceThreshold &&
      signal.relevance >= this.config.relevanceThreshold
    );
  }

  private trackSignalEvolution(signal: Signal): void {
    const evolution = this.signalHistory.get(signal.id) || {
      signalId: signal.id,
      snapshots: [],
      trajectory: 'growing' as const,
      healthStatus: 'healthy' as const,
    };

    evolution.snapshots.push({
      timestamp: new Date(),
      confidence: signal.confidence,
      relevance: signal.relevance,
      dataPointCount: signal.metadata.dataPointCount,
      strength: signal.strength,
    });

    // Keep only recent snapshots
    if (evolution.snapshots.length > 100) {
      evolution.snapshots.shift();
    }

    // Determine trajectory
    if (evolution.snapshots.length >= 3) {
      const recent = evolution.snapshots.slice(-3);
      const avgChange =
        (recent[2].confidence - recent[0].confidence) / 2;

      if (avgChange > 0.1) {
        evolution.trajectory = 'growing';
      } else if (avgChange < -0.1) {
        evolution.trajectory = 'declining';
      } else if (Math.abs(avgChange) < 0.05) {
        evolution.trajectory = 'stable';
      } else {
        evolution.trajectory = 'volatile';
      }

      // Determine health
      if (recent[2].confidence < 0.4) {
        evolution.healthStatus = 'stale';
      } else if (evolution.trajectory === 'declining') {
        evolution.healthStatus = 'degrading';
      } else {
        evolution.healthStatus = 'healthy';
      }
    }

    this.signalHistory.set(signal.id, evolution);
  }

  private notifyDetection(signal: Signal): void {
    this.detectionCallbacks.forEach(callback => {
      try {
        callback(signal);
      } catch (error) {
        console.error('Detection callback error:', error);
      }
    });
  }

  /**
   * Public methods for signal management
   */

  public onSignalDetected(callback: (signal: Signal) => void): void {
    this.detectionCallbacks.push(callback);
  }

  public getActiveSignals(): Signal[] {
    return Array.from(this.activeSignals.values());
  }

  public getSignal(id: string): Signal | undefined {
    return this.activeSignals.get(id);
  }

  public getSignalEvolution(id: string): SignalEvolution | undefined {
    return this.signalHistory.get(id);
  }

  public getTrendingSignals(limit: number = 10): TrendingSignal[] {
    const signals = this.getActiveSignals();
    const dataPoints: DataPoint[] = []; // Would need to be tracked

    const scored = signals.map(signal => ({
      signal,
      score: this.scorer.calculateScore(signal, dataPoints),
      trend: {
        direction: 'rising' as const,
        changeRate: signal.metadata.velocity,
      },
    }));

    return scored
      .sort((a, b) => b.score.overallScore - a.score.overallScore)
      .slice(0, limit);
  }

  public updateConfig(config: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): DetectionConfig {
    return { ...this.config };
  }
}
