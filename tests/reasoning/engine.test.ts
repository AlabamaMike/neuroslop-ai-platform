/**
 * Tests for Main Reasoning Engine
 */

import { createReasoningEngine, defaultConfig } from '../../src/reasoning/engine.js';
import type { ReasoningContext, MarketSignal, MarketEvent } from '../../src/reasoning/types.js';

describe('NeurosymbolicReasoningEngine', () => {
  let engine: ReturnType<typeof createReasoningEngine>;

  beforeAll(async () => {
    const config = {
      ...defaultConfig,
      agentdb: {
        dbPath: ':memory:',
        dimension: 128,
        preset: 'small' as const,
      },
    };

    engine = createReasoningEngine(config);
    await engine.initialize();
  });

  afterAll(async () => {
    await engine.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      // Engine is already initialized in beforeAll
      const stats = await engine.getStatistics();
      expect(stats).toHaveProperty('embeddings');
    });
  });

  describe('Reasoning Pipeline', () => {
    it('should perform neurosymbolic reasoning', async () => {
      const signals: MarketSignal[] = [
        { id: '1', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 100, confidence: 0.9, metadata: {} },
        { id: '2', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 110, confidence: 0.85, metadata: {} },
        { id: '3', timestamp: new Date(), source: 'test', type: 'volume', symbol: 'BTC', value: 1000, confidence: 0.8, metadata: {} },
      ];

      const events: MarketEvent[] = [];

      const context: ReasoningContext = {
        signals,
        events,
        timestamp: new Date(),
        metadata: {},
      };

      const result = await engine.reason(context);

      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('executionTime');

      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.predictions)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should generate insights from patterns', async () => {
      const signals: MarketSignal[] = Array.from({ length: 10 }, (_, i) => ({
        id: `sig${i}`,
        timestamp: new Date(Date.now() + i * 1000),
        source: 'test',
        type: 'price' as const,
        symbol: 'BTC',
        value: 100 + i * 5,
        confidence: 0.8,
        metadata: {},
      }));

      const context: ReasoningContext = {
        signals,
        events: [],
        timestamp: new Date(),
        metadata: {},
      };

      const result = await engine.reason(context);

      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', async () => {
      const signals: MarketSignal[] = [
        { id: '1', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 100, confidence: 0.9, metadata: {} },
        { id: '2', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 110, confidence: 0.9, metadata: {} },
        { id: '3', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 120, confidence: 0.9, metadata: {} },
      ];

      const context: ReasoningContext = {
        signals,
        events: [],
        timestamp: new Date(),
        metadata: {},
      };

      const result = await engine.reason(context);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Reflexion and Learning', () => {
    it('should store and retrieve episodes', async () => {
      const episode = {
        id: 'ep1',
        timestamp: new Date(),
        state: { price: 100 },
        action: 'buy',
        outcome: 'profit',
        reward: 10,
        reflection: 'Good trade',
        metadata: {},
      };

      await engine.storeEpisode(episode);

      const episodes = await engine.queryEpisodes({ price: 100 });
      expect(Array.isArray(episodes)).toBe(true);
    });

    it('should store and retrieve skills', async () => {
      const skill = {
        id: 'skill1',
        name: 'Pattern Recognition',
        description: 'Recognize market patterns',
        parameters: {},
        examples: ['example1'],
        successRate: 0.8,
        usageCount: 10,
        lastUsed: new Date(),
      };

      await engine.storeSkill(skill);

      const skills = await engine.getSkills(10);
      expect(Array.isArray(skills)).toBe(true);
    });

    it('should compute learning metrics', async () => {
      const metrics = await engine.getLearningMetrics();

      expect(metrics).toHaveProperty('episodesProcessed');
      expect(metrics).toHaveProperty('patternsDiscovered');
      expect(metrics).toHaveProperty('skillsLearned');
      expect(metrics).toHaveProperty('averageReward');
    });
  });

  describe('Knowledge Graph', () => {
    it('should build knowledge graph from insights', async () => {
      const insights = [
        {
          id: 'insight1',
          type: 'pattern' as const,
          description: 'Test insight',
          confidence: 0.8,
          evidence: [],
          timestamp: new Date(),
        },
      ];

      await engine.buildKnowledgeGraph(insights);

      const entity = engine.getOntologyEntity('insight1');
      expect(entity).toBeDefined();
    });

    it('should access causal graph', async () => {
      const graph = await engine.getCausalGraph();

      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
    });
  });
});
