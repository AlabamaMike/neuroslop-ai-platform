/**
 * Example usage of the neurosymbolic reasoning engine
 */

import { createReasoningEngine, defaultConfig } from './engine.js';
import type { MarketSignal, MarketEvent, ReasoningContext } from './types.js';

async function main() {
  // Initialize the reasoning engine
  const engine = createReasoningEngine(defaultConfig);
  await engine.initialize();

  console.log('Neurosymbolic Reasoning Engine initialized!');

  // Create sample market signals
  const signals: MarketSignal[] = [
    {
      id: 'sig1',
      timestamp: new Date(),
      source: 'exchange-1',
      type: 'price',
      symbol: 'BTC',
      value: 45000,
      confidence: 0.95,
      metadata: { exchange: 'Binance' },
    },
    {
      id: 'sig2',
      timestamp: new Date(Date.now() + 1000),
      source: 'exchange-1',
      type: 'volume',
      symbol: 'BTC',
      value: 1500,
      confidence: 0.9,
      metadata: { exchange: 'Binance' },
    },
    {
      id: 'sig3',
      timestamp: new Date(Date.now() + 2000),
      source: 'sentiment-analyzer',
      type: 'sentiment',
      symbol: 'BTC',
      value: 0.7,
      confidence: 0.85,
      metadata: { source: 'Twitter' },
    },
  ];

  // Create sample market events
  const events: MarketEvent[] = [
    {
      id: 'event1',
      timestamp: new Date(Date.now() - 60000),
      eventType: 'regulation_announcement',
      impact: 'high',
      symbols: ['BTC', 'ETH'],
      description: 'New crypto regulation announced',
      metadata: { country: 'US' },
    },
  ];

  // Create reasoning context
  const context: ReasoningContext = {
    signals,
    events,
    timestamp: new Date(),
    metadata: { market: 'crypto' },
  };

  // Perform reasoning
  console.log('Performing neurosymbolic reasoning...');
  const result = await engine.reason(context);

  // Display results
  console.log('\nReasoning Results:');
  console.log('==================');
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Execution Time: ${result.executionTime}ms`);

  console.log('\nInsights:');
  for (const insight of result.insights.slice(0, 5)) {
    console.log(`  - [${insight.type}] ${insight.description}`);
    console.log(`    Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
  }

  console.log('\nPredictions:');
  for (const prediction of result.predictions.slice(0, 3)) {
    console.log(`  - ${prediction.target}: ${prediction.value.toFixed(2)}`);
    console.log(`    Method: ${prediction.method}, Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
  }

  console.log('\nRecommendations:');
  for (const rec of result.recommendations) {
    console.log(`  - [Priority ${rec.priority}] ${rec.action}`);
    console.log(`    Rationale: ${rec.rationale}`);
    console.log(`    Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
  }

  // Store an episode for learning
  await engine.storeEpisode({
    id: 'ep1',
    timestamp: new Date(),
    state: { signals: signals.length, events: events.length },
    action: 'analyze',
    outcome: 'insights_generated',
    reward: result.confidence,
    reflection: `Generated ${result.insights.length} insights with ${(result.confidence * 100).toFixed(1)}% confidence`,
    metadata: {},
  });

  // Get learning metrics
  const metrics = await engine.getLearningMetrics();
  console.log('\nLearning Metrics:');
  console.log(`  Episodes: ${metrics.episodesProcessed}`);
  console.log(`  Patterns: ${metrics.patternsDiscovered}`);
  console.log(`  Skills: ${metrics.skillsLearned}`);

  // Shutdown
  await engine.shutdown();
  console.log('\nEngine shutdown complete.');
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
