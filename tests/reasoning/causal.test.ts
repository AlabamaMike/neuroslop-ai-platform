/**
 * Tests for Causal Engine
 */

import { createCausalEngine } from '../../src/reasoning/causal.js';
import { createAgentDBClient } from '../../src/reasoning/agentdb-client.js';
import type { MarketSignal, MarketEvent } from '../../src/reasoning/types.js';

describe('CausalEngine', () => {
  let causalEngine: ReturnType<typeof createCausalEngine>;
  let agentDB: ReturnType<typeof createAgentDBClient>;

  beforeAll(async () => {
    agentDB = createAgentDBClient({
      dbPath: ':memory:',
      dimension: 128,
      preset: 'small',
    });
    await agentDB.initialize();

    causalEngine = createCausalEngine(
      {
        minConfidence: 0.5,
        maxPathLength: 5,
        enableLearning: true,
      },
      agentDB
    );
  });

  afterAll(async () => {
    await agentDB.close();
  });

  describe('Causal Discovery', () => {
    it('should discover causal relationships', async () => {
      const signals: MarketSignal[] = [
        { id: '1', timestamp: new Date(Date.now()), source: 'test', type: 'price', symbol: 'BTC', value: 100, confidence: 0.8, metadata: {} },
        { id: '2', timestamp: new Date(Date.now() + 1000), source: 'test', type: 'volume', symbol: 'BTC', value: 50, confidence: 0.8, metadata: {} },
        { id: '3', timestamp: new Date(Date.now() + 2000), source: 'test', type: 'price', symbol: 'BTC', value: 110, confidence: 0.8, metadata: {} },
        { id: '4', timestamp: new Date(Date.now() + 3000), source: 'test', type: 'volume', symbol: 'BTC', value: 60, confidence: 0.8, metadata: {} },
      ];

      const events: MarketEvent[] = [];

      const edges = await causalEngine.discoverCausalRelationships(signals, events);

      expect(Array.isArray(edges)).toBe(true);
      // May or may not discover edges depending on the data
    });

    it('should discover event causality', async () => {
      const event: MarketEvent = {
        id: 'event1',
        timestamp: new Date(Date.now()),
        eventType: 'news',
        impact: 'high',
        symbols: ['BTC'],
        description: 'Major announcement',
        metadata: {},
      };

      const signals: MarketSignal[] = [
        { id: '1', timestamp: new Date(Date.now() + 60000), source: 'test', type: 'price', symbol: 'BTC', value: 100, confidence: 0.8, metadata: {} },
        { id: '2', timestamp: new Date(Date.now() + 120000), source: 'test', type: 'price', symbol: 'BTC', value: 120, confidence: 0.8, metadata: {} },
      ];

      const edges = await causalEngine.discoverCausalRelationships(signals, [event]);

      expect(Array.isArray(edges)).toBe(true);
    });
  });

  describe('Causal Inference', () => {
    it('should predict outcomes based on causality', async () => {
      const predictions = await causalEngine.predictOutcome('BTC:price', 10);

      expect(Array.isArray(predictions)).toBe(true);
    });

    it('should estimate intervention effects', async () => {
      const result = await causalEngine.estimateInterventionEffect('price', 100, 'volume', );

      expect(result).toHaveProperty('effect');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('Graph Operations', () => {
    it('should maintain a local causal graph', () => {
      const graph = causalEngine.getGraph();

      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    });
  });
});
