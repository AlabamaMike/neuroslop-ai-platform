import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalGenerator } from '@/reasoning/signalGenerator';
import { ReasoningEngine } from '@/reasoning/reasoningEngine';
import { mockReasoningStep } from '@tests/fixtures/mockData';

describe('SignalGenerator', () => {
  let signalGenerator: SignalGenerator;
  let mockReasoningEngine: ReasoningEngine;

  beforeEach(() => {
    mockReasoningEngine = {} as ReasoningEngine;
    signalGenerator = new SignalGenerator(mockReasoningEngine);
  });

  describe('generate', () => {
    it('should generate a signal from reasoning steps', async () => {
      const signal = await signalGenerator.generate('AAPL', [mockReasoningStep]);
      expect(signal).toHaveProperty('id');
      expect(signal).toHaveProperty('symbol', 'AAPL');
      expect(signal).toHaveProperty('type');
      expect(signal).toHaveProperty('strength');
      expect(signal).toHaveProperty('confidence');
      expect(signal).toHaveProperty('reasoning');
      expect(signal).toHaveProperty('sources');
      expect(signal).toHaveProperty('timestamp');
    });

    it('should generate buy signal for high confidence', async () => {
      const highConfidenceStep = { ...mockReasoningStep, confidence: 0.9 };
      const signal = await signalGenerator.generate('AAPL', [highConfidenceStep]);
      expect(signal.type).toBe('buy');
      expect(signal.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should generate sell signal for low confidence', async () => {
      const lowConfidenceStep = { ...mockReasoningStep, confidence: 0.2 };
      const signal = await signalGenerator.generate('AAPL', [lowConfidenceStep]);
      expect(signal.type).toBe('sell');
      expect(signal.confidence).toBeLessThanOrEqual(0.3);
    });

    it('should generate hold signal for medium confidence', async () => {
      const medConfidenceStep = { ...mockReasoningStep, confidence: 0.5 };
      const signal = await signalGenerator.generate('AAPL', [medConfidenceStep]);
      expect(signal.type).toBe('hold');
    });
  });
});
