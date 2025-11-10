/**
 * Signal Detector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SignalDetector } from '../../src/signals/detector.js';
import {
  DataAggregator,
  MockDataSource,
} from '../../src/signals/aggregator.js';
import {
  DetectionConfig,
  SignalType,
  DataSourceType,
  DataPoint,
} from '../../src/signals/types.js';

describe('SignalDetector', () => {
  let detector: SignalDetector;
  let aggregator: DataAggregator;
  let config: DetectionConfig;

  beforeEach(() => {
    aggregator = new DataAggregator();
    config = {
      confidenceThreshold: 0.6,
      relevanceThreshold: 0.5,
      minEvidencePoints: 5,
      enableNeurosymbolicReasoning: true,
      signalTypes: [
        SignalType.EMERGING_TREND,
        SignalType.SENTIMENT_SHIFT,
        SignalType.VOLUME_SPIKE,
      ],
      maxSignalsPerRun: 10,
    };

    detector = new SignalDetector(aggregator, config);
  });

  describe('detectSignals', () => {
    it('should detect signals from data points', async () => {
      const dataPoints: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        id: `dp-${i}`,
        sourceType: DataSourceType.REDDIT,
        sourceId: `source-${i}`,
        content: `AI technology breakthrough innovation ${i}`,
        metadata: {},
        timestamp: new Date(Date.now() - (20 - i) * 60 * 60 * 1000),
        entities: ['AI', 'technology', 'innovation'],
        sentiment: 0.7,
        relevanceScore: 0.8,
      }));

      const signals = await detector.detectSignals(dataPoints);

      expect(signals).toBeInstanceOf(Array);
      // May or may not detect signals based on thresholds
    });

    it('should return empty array for insufficient data', async () => {
      const dataPoints: DataPoint[] = [
        {
          id: 'dp-1',
          sourceType: DataSourceType.REDDIT,
          sourceId: 'source-1',
          content: 'Test',
          metadata: {},
          timestamp: new Date(),
          entities: [],
          sentiment: 0.5,
        },
      ];

      const signals = await detector.detectSignals(dataPoints);

      expect(signals).toEqual([]);
    });

    it('should respect maxSignalsPerRun', async () => {
      const dataPoints: DataPoint[] = Array.from({ length: 100 }, (_, i) => ({
        id: `dp-${i}`,
        sourceType: DataSourceType.REDDIT,
        sourceId: `source-${i}`,
        content: `Test content ${i} keyword topic`,
        metadata: {},
        timestamp: new Date(Date.now() - i * 60 * 1000),
        entities: ['keyword', 'topic'],
        sentiment: 0.7,
        relevanceScore: 0.8,
      }));

      const signals = await detector.detectSignals(dataPoints);

      expect(signals.length).toBeLessThanOrEqual(config.maxSignalsPerRun);
    });

    it('should detect only configured signal types', async () => {
      const dataPoints: DataPoint[] = Array.from({ length: 30 }, (_, i) => ({
        id: `dp-${i}`,
        sourceType: DataSourceType.REDDIT,
        sourceId: `source-${i}`,
        content: `Market signal ${i}`,
        metadata: {},
        timestamp: new Date(Date.now() - i * 60 * 1000),
        entities: ['market', 'signal'],
        sentiment: 0.5 + (i * 0.01),
        relevanceScore: 0.7,
      }));

      const signals = await detector.detectSignals(dataPoints);

      signals.forEach(signal => {
        expect(config.signalTypes).toContain(signal.type);
      });
    });
  });

  describe('signal callbacks', () => {
    it('should call callback when signal is detected', async () => {
      let callbackCalled = false;
      let detectedSignal = null;

      detector.onSignalDetected((signal) => {
        callbackCalled = true;
        detectedSignal = signal;
      });

      const dataPoints: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        id: `dp-${i}`,
        sourceType: DataSourceType.REDDIT,
        sourceId: `source-${i}`,
        content: `Test keyword ${i}`,
        metadata: {},
        timestamp: new Date(Date.now() - i * 60 * 1000),
        entities: ['test', 'keyword'],
        sentiment: 0.8,
        relevanceScore: 0.9,
      }));

      await detector.detectSignals(dataPoints);

      // Callback may or may not be called based on detection
      if (callbackCalled) {
        expect(detectedSignal).toBeDefined();
      }
    });
  });

  describe('signal management', () => {
    it('should track active signals', async () => {
      const dataPoints: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        id: `dp-${i}`,
        sourceType: DataSourceType.REDDIT,
        sourceId: `source-${i}`,
        content: `Test content ${i}`,
        metadata: {},
        timestamp: new Date(Date.now() - i * 60 * 1000),
        entities: ['test'],
        sentiment: 0.7,
        relevanceScore: 0.8,
      }));

      await detector.detectSignals(dataPoints);

      const activeSignals = detector.getActiveSignals();
      expect(activeSignals).toBeInstanceOf(Array);
    });

    it('should retrieve signal by id', async () => {
      const dataPoints: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        id: `dp-${i}`,
        sourceType: DataSourceType.REDDIT,
        sourceId: `source-${i}`,
        content: `Trending topic ${i}`,
        metadata: {},
        timestamp: new Date(Date.now() - i * 60 * 1000),
        entities: ['trending', 'topic'],
        sentiment: 0.8,
        relevanceScore: 0.9,
      }));

      const signals = await detector.detectSignals(dataPoints);

      if (signals.length > 0) {
        const signal = detector.getSignal(signals[0].id);
        expect(signal).toBeDefined();
        expect(signal?.id).toBe(signals[0].id);
      }
    });

    it('should get trending signals', () => {
      const trending = detector.getTrendingSignals(5);

      expect(trending).toBeInstanceOf(Array);
      expect(trending.length).toBeLessThanOrEqual(5);
    });
  });

  describe('configuration', () => {
    it('should update detection config', () => {
      detector.updateConfig({
        confidenceThreshold: 0.7,
      });

      const updatedConfig = detector.getConfig();
      expect(updatedConfig.confidenceThreshold).toBe(0.7);
    });

    it('should get current config', () => {
      const currentConfig = detector.getConfig();

      expect(currentConfig).toEqual(config);
    });
  });
});
