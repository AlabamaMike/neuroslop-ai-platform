import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReasoningEngine } from '@/reasoning/reasoningEngine';
import { MockLLMService, MockKnowledgeGraph } from '@tests/fixtures/mocks';
import { mockMarketData } from '@tests/fixtures/mockData';

describe('ReasoningEngine', () => {
  let reasoningEngine: ReasoningEngine;
  let mockLLM: MockLLMService;
  let mockKG: MockKnowledgeGraph;

  beforeEach(() => {
    mockLLM = new MockLLMService();
    mockKG = new MockKnowledgeGraph();
    reasoningEngine = new ReasoningEngine(mockLLM as any, mockKG as any);
  });

  describe('reason', () => {
    it('should perform reasoning on input data', async () => {
      const steps = await reasoningEngine.reason(mockMarketData);
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('id');
      expect(steps[0]).toHaveProperty('type');
      expect(steps[0]).toHaveProperty('reasoning');
      expect(steps[0]).toHaveProperty('confidence');
    });

    it('should return reasoning steps with confidence scores', async () => {
      const steps = await reasoningEngine.reason(mockMarketData);
      steps.forEach((step) => {
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});
