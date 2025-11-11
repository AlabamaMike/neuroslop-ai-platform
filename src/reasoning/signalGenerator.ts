import { ReasoningEngine } from './reasoningEngine';
import { Signal, ReasoningStep } from '../utils/types';
import { logger } from '../utils/logger';

export class SignalGenerator {
  constructor(private reasoningEngine: ReasoningEngine) {}

  async generate(symbol: string, reasoning: ReasoningStep[]): Promise<Signal> {
    logger.info(`Generating signal for ${symbol}`);

    // Simplified signal generation
    const confidence = reasoning.reduce((sum, step) => sum + step.confidence, 0) / reasoning.length;

    return {
      id: `signal-${Date.now()}`,
      symbol,
      type: confidence > 0.7 ? 'buy' : confidence < 0.3 ? 'sell' : 'hold',
      strength: Math.abs(confidence - 0.5) * 2,
      confidence,
      reasoning: reasoning.map((step) => step.reasoning),
      sources: ['llm', 'knowledge-graph'],
      timestamp: new Date().toISOString(),
    };
  }
}
