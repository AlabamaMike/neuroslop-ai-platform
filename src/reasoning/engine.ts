/**
 * Main Neurosymbolic Reasoning Engine
 * Integrates neural, symbolic, and causal components
 */

import type {
  ReasoningConfig,
  ReasoningContext,
  ReasoningResult,
  Insight,
  Prediction,
  Recommendation,
  Episode,
  Skill,
} from './types.js';
import { createAgentDBClient, type AgentDBClient } from './agentdb-client.js';
import { createNeuralEngine, type NeuralEngine } from './neural.js';
import { createSymbolicEngine, type SymbolicEngine } from './symbolic.js';
import { createCausalEngine, type CausalEngine } from './causal.js';

export class NeurosymbolicReasoningEngine {
  private config: ReasoningConfig;
  private agentDB: AgentDBClient;
  private neuralEngine: NeuralEngine;
  private symbolicEngine: SymbolicEngine;
  private causalEngine: CausalEngine;
  private initialized: boolean = false;

  constructor(config: ReasoningConfig) {
    this.config = config;

    // Initialize AgentDB client
    this.agentDB = createAgentDBClient({
      dbPath: config.agentdb.dbPath,
      dimension: config.agentdb.dimension,
      preset: config.agentdb.preset,
    });

    // Initialize neural engine
    this.neuralEngine = createNeuralEngine(
      {
        embeddingModel: config.neural.embeddingModel,
        dimension: config.agentdb.dimension,
        similarityThreshold: config.neural.similarityThreshold,
        maxResults: config.neural.maxResults,
      },
      this.agentDB
    );

    // Initialize symbolic engine
    this.symbolicEngine = createSymbolicEngine({
      enableRuleEngine: config.symbolic.enableRuleEngine,
      enableOntology: config.symbolic.enableOntology,
      maxInferenceDepth: config.symbolic.maxInferenceDepth,
    });

    // Initialize causal engine
    this.causalEngine = createCausalEngine(
      {
        minConfidence: config.causal.minConfidence,
        maxPathLength: config.causal.maxPathLength,
        enableLearning: config.causal.enableLearning,
      },
      this.agentDB
    );
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Initialize the reasoning engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.agentDB.initialize();
    this.initialized = true;
  }

  /**
   * Shutdown the reasoning engine
   */
  async shutdown(): Promise<void> {
    await this.agentDB.close();
    this.initialized = false;
  }

  // ============================================================================
  // Main Reasoning Pipeline
  // ============================================================================

  /**
   * Perform neurosymbolic reasoning on market data
   * Combines neural, symbolic, and causal approaches
   */
  async reason(context: ReasoningContext): Promise<ReasoningResult> {
    if (!this.initialized) {
      throw new Error('Reasoning engine not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const insights: Insight[] = [];
    const predictions: Prediction[] = [];
    const recommendations: Recommendation[] = [];

    // ========================================
    // 1. Neural Processing
    // ========================================

    // Embed signals for semantic search
    const embeddings = await this.neuralEngine.batchEmbedSignals(context.signals);
    await this.neuralEngine.storeEmbeddings(embeddings);

    // Detect patterns
    const patterns = await this.neuralEngine.detectPatterns(context.signals);

    // Add pattern insights
    for (const pattern of patterns) {
      insights.push({
        id: `pattern-${pattern.id}`,
        type: 'pattern',
        description: `Detected ${pattern.type} pattern: ${pattern.name}`,
        confidence: pattern.confidence,
        evidence: [`Support: ${pattern.support}, Features: ${JSON.stringify(pattern.features)}`],
        timestamp: new Date(),
      });
    }

    // Match against known patterns
    const patternMatches = await this.neuralEngine.matchPatterns(context.signals);
    for (const match of patternMatches.slice(0, 3)) {
      // Top 3 matches
      insights.push({
        id: `match-${Date.now()}-${Math.random()}`,
        type: 'pattern',
        description: `Similar to historical pattern: ${match.pattern.name}`,
        confidence: match.similarity,
        evidence: [`Similarity: ${match.similarity.toFixed(2)}`],
        timestamp: new Date(),
      });
    }

    // ========================================
    // 2. Symbolic Reasoning
    // ========================================

    // Apply rule-based inference
    const inferences = await this.symbolicEngine.infer(
      context.signals,
      context.events,
      context.metadata
    );

    // Add symbolic insights
    for (const inference of inferences) {
      if (inference.matched) {
        insights.push({
          id: `rule-${Date.now()}-${Math.random()}`,
          type: 'correlation',
          description: inference.explanation,
          confidence: inference.confidence,
          evidence: [`Rule: ${inference.rule}`],
          timestamp: new Date(),
        });

        // Extract recommendations from conclusions
        for (const conclusion of inference.conclusions) {
          if (conclusion.field === 'actionRecommendation') {
            recommendations.push({
              id: `rec-${Date.now()}-${Math.random()}`,
              action: String(conclusion.value),
              rationale: inference.explanation,
              confidence: inference.confidence,
              priority: 5,
              expectedOutcome: 'Alignment with market signals',
            });
          }
        }
      }
    }

    // ========================================
    // 3. Causal Inference
    // ========================================

    // Discover causal relationships
    const causalEdges = await this.causalEngine.discoverCausalRelationships(
      context.signals,
      context.events
    );

    // Add causal insights
    for (const edge of causalEdges.slice(0, 5)) {
      // Top 5 causal relationships
      insights.push({
        id: `causal-${edge.id}`,
        type: 'causal',
        description: `${edge.source} causes ${edge.target} (strength: ${edge.strength.toFixed(2)})`,
        confidence: edge.confidence,
        evidence: edge.evidence,
        timestamp: new Date(),
      });

      // Generate predictions based on causal relationships
      const predictions_for_edge = await this.causalEngine.predictOutcome(
        edge.source,
        1.0 // Assuming unit change
      );

      for (const pred of predictions_for_edge) {
        predictions.push({
          id: `pred-${Date.now()}-${Math.random()}`,
          target: pred.target,
          horizon: 3600, // 1 hour
          value: pred.predictedValue,
          confidence: pred.confidence,
          method: 'causal',
          explanation: `Based on causal edge: ${edge.source} -> ${edge.target}`,
        });
      }
    }

    // ========================================
    // 4. Anomaly Detection
    // ========================================

    // Check for anomalies in signal patterns
    const features = this.neuralEngine.extractFeatures(context.signals);
    if (features.std && features.mean && features.std / Math.abs(features.mean) > 1.5) {
      insights.push({
        id: `anomaly-${Date.now()}`,
        type: 'anomaly',
        description: 'High volatility detected in market signals',
        confidence: 0.85,
        evidence: [`Coefficient of variation: ${(features.std / Math.abs(features.mean)).toFixed(2)}`],
        timestamp: new Date(),
      });

      recommendations.push({
        id: `rec-anomaly-${Date.now()}`,
        action: 'review_risk_exposure',
        rationale: 'Increased market volatility suggests higher risk',
        confidence: 0.85,
        priority: 8,
        expectedOutcome: 'Risk mitigation',
      });
    }

    // ========================================
    // 5. Multi-Source Fusion
    // ========================================

    // Combine insights from different sources
    const fusedConfidence = this.computeFusedConfidence(insights);

    // Sort insights by confidence
    insights.sort((a, b) => b.confidence - a.confidence);

    // Sort predictions by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);

    // Sort recommendations by priority and confidence
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.confidence - a.confidence;
    });

    const executionTime = Date.now() - startTime;

    return {
      insights: insights.slice(0, 20), // Top 20 insights
      predictions: predictions.slice(0, 10), // Top 10 predictions
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      confidence: fusedConfidence,
      executionTime,
      metadata: {
        signalCount: context.signals.length,
        eventCount: context.events.length,
        patternsDetected: patterns.length,
        causalEdgesFound: causalEdges.length,
      },
    };
  }

  // ============================================================================
  // Reflexion and Learning
  // ============================================================================

  /**
   * Store an episode for learning
   */
  async storeEpisode(episode: Episode): Promise<void> {
    if (!this.config.reflexion.enableLearning) {
      return;
    }

    await this.agentDB.storeEpisode(episode);

    // Learn from episode patterns
    await this.neuralEngine.learnFromEpisodes([episode]);
  }

  /**
   * Query similar past episodes
   */
  async queryEpisodes(
    state: Record<string, unknown>,
    limit: number = 10
  ): Promise<Episode[]> {
    return await this.neuralEngine.findSimilarEpisodes(state, limit);
  }

  /**
   * Store a learned skill
   */
  async storeSkill(skill: Skill): Promise<void> {
    await this.agentDB.storeSkill(skill);
  }

  /**
   * Get learned skills
   */
  async getSkills(limit: number = 20): Promise<Skill[]> {
    return await this.agentDB.getSkills('successRate', limit);
  }

  /**
   * Get learning metrics
   */
  async getLearningMetrics(): Promise<{
    episodesProcessed: number;
    patternsDiscovered: number;
    skillsLearned: number;
    averageReward: number;
  }> {
    return await this.agentDB.computeLearningMetrics();
  }

  // ============================================================================
  // Knowledge Graph Operations
  // ============================================================================

  /**
   * Build knowledge graph from insights
   */
  async buildKnowledgeGraph(insights: Insight[]): Promise<void> {
    for (const insight of insights) {
      if (insight.type === 'causal') {
        // Causal insights are already in the graph
        continue;
      }

      // Add insight as a node in the ontology
      const entity = {
        id: insight.id,
        type: insight.type,
        label: insight.description,
        properties: {
          confidence: insight.confidence,
          timestamp: insight.timestamp.toISOString(),
        },
        relationships: [],
      };

      this.symbolicEngine.addEntity(entity);
    }
  }

  /**
   * Query the ontology
   */
  getOntologyEntity(entityId: string) {
    return this.symbolicEngine.getEntity(entityId);
  }

  /**
   * Get causal graph
   */
  async getCausalGraph() {
    return await this.agentDB.getCausalGraph();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Compute fused confidence from multiple insights
   */
  private computeFusedConfidence(insights: Insight[]): number {
    if (insights.length === 0) {
      return 0;
    }

    // Weighted average by insight type
    const weights: Record<string, number> = {
      causal: 1.0,
      pattern: 0.8,
      anomaly: 0.9,
      correlation: 0.7,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const insight of insights) {
      const weight = weights[insight.type] || 0.5;
      weightedSum += insight.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    return await this.agentDB.getStatistics();
  }
}

// Factory function
export function createReasoningEngine(config: ReasoningConfig): NeurosymbolicReasoningEngine {
  return new NeurosymbolicReasoningEngine(config);
}

// Export default configuration
export const defaultConfig: ReasoningConfig = {
  agentdb: {
    dbPath: './agentdb.db',
    dimension: 1536,
    preset: 'medium',
  },
  neural: {
    embeddingModel: 'text-embedding-ada-002',
    similarityThreshold: 0.7,
    maxResults: 10,
  },
  symbolic: {
    enableRuleEngine: true,
    enableOntology: true,
    maxInferenceDepth: 5,
  },
  causal: {
    minConfidence: 0.5,
    maxPathLength: 5,
    enableLearning: true,
  },
  reflexion: {
    enableLearning: true,
    retentionPeriod: 30, // days
    minRewardThreshold: 0.0,
  },
};
