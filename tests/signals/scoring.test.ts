/**
 * Signal Scoring Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SignalScorer, DEFAULT_WEIGHTS } from '../../src/signals/scoring.js';
import {
  Signal,
  SignalType,
  SignalStrength,
  DataPoint,
  DataSourceType,
} from '../../src/signals/types.js';

describe('SignalScorer', () => {
  let scorer: SignalScorer;
  let mockSignal: Signal;
  let mockDataPoints: DataPoint[];

  beforeEach(() => {
    scorer = new SignalScorer();

    mockSignal = {
      id: 'test-signal-1',
      type: SignalType.EMERGING_TREND,
      title: 'Test Signal',
      description: 'Test description',
      keywords: ['test', 'signal', 'market'],
      entities: ['entity1', 'entity2'],
      confidence: 0.8,
      relevance: 0.75,
      strength: SignalStrength.STRONG,
      evidence: [],
      reasoning: {
        rules: ['rule1', 'rule2'],
        inferences: ['inference1'],
        confidenceFactors: { overall: 0.8 },
        knowledgeGraphEntities: ['entity1', 'entity2', 'entity3'],
        logicalChain: ['step1', 'step2', 'step3', 'step4'],
      },
      metadata: {
        dataPointCount: 20,
        sourceDistribution: {
          [DataSourceType.REDDIT]: 10,
          [DataSourceType.TWITTER]: 10,
        },
        timeSpan: {
          start: new Date(Date.now() - 12 * 60 * 60 * 1000),
          end: new Date(),
        },
        velocity: 1.5,
        momentum: 0.5,
      },
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };

    mockDataPoints = Array.from({ length: 10 }, (_, i) => ({
      id: `dp-${i}`,
      sourceType: i % 2 === 0 ? DataSourceType.REDDIT : DataSourceType.TWITTER,
      sourceId: `source-${i}`,
      content: `Test content ${i}`,
      metadata: {},
      timestamp: new Date(Date.now() - (10 - i) * 60 * 60 * 1000),
      entities: ['entity1', 'entity2'],
      sentiment: 0.5 + (i * 0.05),
      relevanceScore: 0.7,
    }));
  });

  describe('calculateScore', () => {
    it('should calculate comprehensive score for a signal', () => {
      const score = scorer.calculateScore(mockSignal, mockDataPoints);

      expect(score).toBeDefined();
      expect(score.signalId).toBe(mockSignal.id);
      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.overallScore).toBeLessThanOrEqual(1);
      expect(score.components).toBeDefined();
      expect(score.weights).toEqual(DEFAULT_WEIGHTS);
    });

    it('should have all scoring components', () => {
      const score = scorer.calculateScore(mockSignal, mockDataPoints);

      expect(score.components.confidence).toBeDefined();
      expect(score.components.relevance).toBeDefined();
      expect(score.components.novelty).toBeDefined();
      expect(score.components.diversity).toBeDefined();
      expect(score.components.velocity).toBeDefined();
      expect(score.components.consistency).toBeDefined();
    });

    it('should score confidence based on reasoning', () => {
      const score = scorer.calculateScore(mockSignal, mockDataPoints);

      expect(score.components.confidence).toBeGreaterThan(mockSignal.confidence);
      expect(score.components.confidence).toBeLessThanOrEqual(1);
    });

    it('should score diversity based on source distribution', () => {
      const score = scorer.calculateScore(mockSignal, mockDataPoints);

      expect(score.components.diversity).toBeGreaterThan(0);
      expect(score.components.diversity).toBeLessThanOrEqual(1);
    });

    it('should give higher novelty score to first-time signals', () => {
      const score1 = scorer.calculateScore(mockSignal, mockDataPoints);

      expect(score1.components.novelty).toBeGreaterThan(0.8);

      // Add signal to history
      scorer.addToHistory(mockSignal);

      // Score similar signal
      const similarSignal = { ...mockSignal, id: 'test-signal-2' };
      const score2 = scorer.calculateScore(similarSignal, mockDataPoints);

      expect(score2.components.novelty).toBeLessThan(score1.components.novelty);
    });
  });

  describe('updateWeights', () => {
    it('should update scoring weights', () => {
      const newWeights = { confidence: 0.5, relevance: 0.3 };
      scorer.updateWeights(newWeights);

      const weights = scorer.getWeights();

      // Weights should be normalized
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    });

    it('should normalize weights to sum to 1', () => {
      scorer.updateWeights({
        confidence: 0.8,
        relevance: 0.8,
        novelty: 0.8,
      });

      const weights = scorer.getWeights();
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0);
    });
  });

  describe('addToHistory', () => {
    it('should add signal to history', () => {
      scorer.addToHistory(mockSignal);

      const score1 = scorer.calculateScore(mockSignal, mockDataPoints);
      const similarSignal = { ...mockSignal, id: 'similar' };
      const score2 = scorer.calculateScore(similarSignal, mockDataPoints);

      expect(score2.components.novelty).toBeLessThan(1.0);
    });

    it('should limit history size', () => {
      // Add 150 signals
      for (let i = 0; i < 150; i++) {
        const signal = { ...mockSignal, id: `signal-${i}` };
        scorer.addToHistory(signal);
      }

      // Should not throw and should work correctly
      const score = scorer.calculateScore(mockSignal, mockDataPoints);
      expect(score).toBeDefined();
    });
  });
});
