/**
 * Tests for Neural Engine
 */

import { createNeuralEngine } from '../../src/reasoning/neural.js';
import { createAgentDBClient } from '../../src/reasoning/agentdb-client.js';
import type { MarketSignal } from '../../src/reasoning/types.js';

describe('NeuralEngine', () => {
  let neuralEngine: ReturnType<typeof createNeuralEngine>;
  let agentDB: ReturnType<typeof createAgentDBClient>;

  beforeAll(async () => {
    agentDB = createAgentDBClient({
      dbPath: ':memory:',
      dimension: 128,
      preset: 'small',
    });
    await agentDB.initialize();

    neuralEngine = createNeuralEngine(
      {
        embeddingModel: 'test-model',
        dimension: 128,
        similarityThreshold: 0.7,
        maxResults: 10,
      },
      agentDB
    );
  });

  afterAll(async () => {
    await agentDB.close();
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings for text', async () => {
      const text = 'Bitcoin price rising';
      const embedding = await neuralEngine.generateEmbedding(text);

      expect(embedding).toHaveLength(128);
      expect(embedding.every(v => typeof v === 'number')).toBe(true);
    });

    it('should cache embeddings', async () => {
      const text = 'Ethereum volume spike';
      const embedding1 = await neuralEngine.generateEmbedding(text);
      const embedding2 = await neuralEngine.generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });

    it('should embed market signals', async () => {
      const signal: MarketSignal = {
        id: 'sig1',
        timestamp: new Date(),
        source: 'test',
        type: 'price',
        symbol: 'BTC',
        value: 100,
        confidence: 0.9,
        metadata: {},
      };

      const embedding = await neuralEngine.embedMarketSignal(signal);

      expect(embedding.id).toBe('sig1');
      expect(embedding.vector).toHaveLength(128);
      expect(embedding.dimension).toBe(128);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect temporal patterns', async () => {
      const signals: MarketSignal[] = Array.from({ length: 5 }, (_, i) => ({
        id: `sig${i}`,
        timestamp: new Date(Date.now() + i * 1000),
        source: 'test',
        type: 'price',
        symbol: 'BTC',
        value: 100 + i * 10,
        confidence: 0.8,
        metadata: {},
      }));

      const patterns = await neuralEngine.detectPatterns(signals);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === 'trend')).toBe(true);
    });

    it('should detect anomalies', async () => {
      const signals: MarketSignal[] = [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `sig${i}`,
          timestamp: new Date(Date.now() + i * 1000),
          source: 'test',
          type: 'price',
          symbol: 'BTC',
          value: 100,
          confidence: 0.8,
          metadata: {},
        })),
        {
          id: 'anomaly',
          timestamp: new Date(Date.now() + 6000),
          source: 'test',
          type: 'price',
          symbol: 'BTC',
          value: 500, // Anomaly
          confidence: 0.8,
          metadata: {},
        },
      ];

      const patterns = await neuralEngine.detectPatterns(signals);

      expect(patterns.some(p => p.type === 'anomaly')).toBe(true);
    });

    it('should extract features from signals', () => {
      const signals: MarketSignal[] = [
        { id: '1', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 100, confidence: 0.9, metadata: {} },
        { id: '2', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 110, confidence: 0.85, metadata: {} },
        { id: '3', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 120, confidence: 0.8, metadata: {} },
      ];

      const features = neuralEngine.extractFeatures(signals);

      expect(features.count).toBe(3);
      expect(features.mean).toBeCloseTo(110);
      expect(features.min).toBe(100);
      expect(features.max).toBe(120);
    });
  });

  describe('Learning from Episodes', () => {
    it('should learn from episodes', async () => {
      const episodes = [
        {
          id: 'ep1',
          timestamp: new Date(),
          state: { price: 100 },
          action: 'buy',
          outcome: 'profit',
          reward: 10,
          reflection: 'Good decision',
          metadata: {},
        },
      ];

      const result = await neuralEngine.learnFromEpisodes(episodes);

      expect(result.patternsLearned).toBe(1);
      expect(result.avgReward).toBe(10);
    });
  });
});
