/**
 * Tests for Symbolic Engine
 */

import { createSymbolicEngine } from '../../src/reasoning/symbolic.js';
import type { MarketSignal, MarketEvent } from '../../src/reasoning/types.js';

describe('SymbolicEngine', () => {
  let symbolicEngine: ReturnType<typeof createSymbolicEngine>;

  beforeEach(() => {
    symbolicEngine = createSymbolicEngine({
      enableRuleEngine: true,
      enableOntology: true,
      maxInferenceDepth: 5,
    });
  });

  describe('Rule Management', () => {
    it('should add and retrieve rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        conditions: [{ field: 'test', operator: 'eq' as const, value: 1 }],
        conclusions: [{ field: 'result', value: true, action: 'set' as const }],
        confidence: 0.9,
        priority: 10,
      };

      symbolicEngine.addRule(rule);
      const retrieved = symbolicEngine.getRule('test-rule');

      expect(retrieved).toEqual(rule);
    });

    it('should get all rules', () => {
      const rules = symbolicEngine.getAllRules();
      expect(rules.length).toBeGreaterThan(0); // Default rules exist
    });

    it('should remove rules', () => {
      const rule = {
        id: 'remove-test',
        name: 'Remove Test',
        conditions: [],
        conclusions: [],
        confidence: 0.5,
        priority: 1,
      };

      symbolicEngine.addRule(rule);
      const removed = symbolicEngine.removeRule('remove-test');

      expect(removed).toBe(true);
      expect(symbolicEngine.getRule('remove-test')).toBeUndefined();
    });
  });

  describe('Rule-Based Inference', () => {
    it('should infer conclusions from signals', async () => {
      const signals: MarketSignal[] = [
        { id: '1', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 100, confidence: 0.8, metadata: {} },
        { id: '2', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 110, confidence: 0.8, metadata: {} },
        { id: '3', timestamp: new Date(), source: 'test', type: 'price', symbol: 'BTC', value: 120, confidence: 0.9, metadata: {} },
      ];

      const events: MarketEvent[] = [];

      const results = await symbolicEngine.infer(signals, events);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.matched)).toBe(true);
    });

    it('should apply forward chaining', async () => {
      const initialFacts = {
        avgSignalValue: 10,
        avgConfidence: 0.8,
      };

      const results = await symbolicEngine.forwardChain(initialFacts);

      expect(results.marketSentiment).toBe('bullish');
      expect(results.actionRecommendation).toBe('consider_buy');
    });

    it('should apply backward chaining', async () => {
      const facts = {
        avgSignalValue: 10,
        avgConfidence: 0.8,
      };

      const result = await symbolicEngine.backwardChain('marketSentiment', facts);

      expect(result).toBe(true);
      expect(facts.marketSentiment).toBe('bullish');
    });
  });

  describe('Ontology Management', () => {
    it('should add and retrieve entities', () => {
      const entity = {
        id: 'test-entity',
        type: 'concept',
        label: 'Test Entity',
        properties: {},
        relationships: [],
      };

      symbolicEngine.addEntity(entity);
      const retrieved = symbolicEngine.getEntity('test-entity');

      expect(retrieved).toEqual(entity);
    });

    it('should find entities by type', () => {
      const entities = symbolicEngine.findEntitiesByType('concept');
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should manage relationships', () => {
      symbolicEngine.addRelationship('price', 'volume', {
        type: 'correlates-with',
        target: 'volume',
        properties: {},
      });

      const related = symbolicEngine.getRelatedEntities('price', 'correlates-with');
      expect(related.some(e => e.id === 'volume')).toBe(true);
    });
  });
});
