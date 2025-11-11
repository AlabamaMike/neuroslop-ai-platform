import { LLMService } from './llmService';
import { KnowledgeGraph } from './knowledgeGraph';
import { DataAggregator } from '../data/dataAggregator';
import { ReasoningEngine } from '../reasoning/reasoningEngine';
import { SignalGenerator } from '../reasoning/signalGenerator';
import { PlatformConfig } from '../utils/types';
import { logger } from '../utils/logger';

export class NeuroSlopPlatform {
  private llmService: LLMService;
  private knowledgeGraph: KnowledgeGraph;
  private dataAggregator: DataAggregator;
  private reasoningEngine: ReasoningEngine;
  private signalGenerator: SignalGenerator;

  constructor(config: PlatformConfig) {
    this.llmService = new LLMService(config.anthropicApiKey);
    this.knowledgeGraph = new KnowledgeGraph(
      config.neo4jUri,
      config.neo4jUser,
      config.neo4jPassword
    );
    this.dataAggregator = new DataAggregator();
    this.reasoningEngine = new ReasoningEngine(this.llmService, this.knowledgeGraph);
    this.signalGenerator = new SignalGenerator(this.reasoningEngine);
    logger.info('NeuroSlop Platform initialized');
  }

  async analyze(symbol: string): Promise<unknown> {
    logger.info(`Analyzing symbol: ${symbol}`);
    const data = await this.dataAggregator.fetchAllData(symbol);
    const reasoning = await this.reasoningEngine.reason(data);
    const signal = await this.signalGenerator.generate(symbol, reasoning);
    return signal;
  }

  async close(): Promise<void> {
    await this.knowledgeGraph.close();
    logger.info('NeuroSlop Platform closed');
  }
}
