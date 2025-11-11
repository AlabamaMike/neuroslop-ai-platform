/**
 * Causal Inference Engine
 * Discovers and analyzes causal relationships between market signals and events
 */

import type {
  CausalEdge,
  CausalGraph,
  CausalInferenceResult,
  CausalNode,
  MarketSignal,
  MarketEvent,
} from './types.js';
import type { AgentDBClient } from './agentdb-client.js';

export interface CausalConfig {
  minConfidence: number;
  maxPathLength: number;
  enableLearning: boolean;
}

export class CausalEngine {
  private config: CausalConfig;
  private agentDB: AgentDBClient;
  private localGraph: CausalGraph = { nodes: [], edges: [] };

  constructor(config: CausalConfig, agentDB: AgentDBClient) {
    this.config = config;
    this.agentDB = agentDB;
  }

  // ============================================================================
  // Causal Discovery
  // ============================================================================

  /**
   * Discover causal relationships from time-series data
   * Uses correlation, temporal precedence, and statistical tests
   */
  async discoverCausalRelationships(
    signals: MarketSignal[],
    events: MarketEvent[]
  ): Promise<CausalEdge[]> {
    const discoveredEdges: CausalEdge[] = [];

    // Group signals by symbol
    const signalsBySymbol = this.groupSignalsBySymbol(signals);

    // For each symbol, analyze temporal relationships
    for (const [symbol, symbolSignals] of Object.entries(signalsBySymbol)) {
      // Sort by timestamp
      symbolSignals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Look for temporal patterns (X precedes Y)
      const edges = await this.discoverTemporalCausality(symbolSignals, symbol);
      discoveredEdges.push(...edges);
    }

    // Discover event-to-signal causality
    const eventEdges = await this.discoverEventCausality(events, signals);
    discoveredEdges.push(...eventEdges);

    // Filter by confidence threshold
    const filteredEdges = discoveredEdges.filter(
      (edge) => edge.confidence >= this.config.minConfidence
    );

    // Store in AgentDB
    for (const edge of filteredEdges) {
      await this.agentDB.addCausalEdge(edge);
      this.addEdgeToLocalGraph(edge);
    }

    return filteredEdges;
  }

  /**
   * Discover temporal causality (Granger causality-inspired)
   */
  private async discoverTemporalCausality(
    signals: MarketSignal[],
    symbol: string
  ): Promise<CausalEdge[]> {
    const edges: CausalEdge[] = [];

    // Look for patterns where signal type X predicts signal type Y
    const signalsByType = new Map<string, MarketSignal[]>();
    for (const signal of signals) {
      if (!signalsByType.has(signal.type)) {
        signalsByType.set(signal.type, []);
      }
      signalsByType.get(signal.type)!.push(signal);
    }

    const types = Array.from(signalsByType.keys());

    // Test each pair of signal types
    for (let i = 0; i < types.length; i++) {
      for (let j = 0; j < types.length; j++) {
        if (i === j) continue;

        const typeX = types[i];
        const typeY = types[j];

        const xSignals = signalsByType.get(typeX)!;
        const ySignals = signalsByType.get(typeY)!;

        // Check if X signals precede Y signals
        const causalStrength = this.computeGrangerCausality(xSignals, ySignals);

        if (Math.abs(causalStrength) > 0.3) {
          edges.push({
            id: `causal-${symbol}-${typeX}-${typeY}-${Date.now()}`,
            source: `${symbol}:${typeX}`,
            target: `${symbol}:${typeY}`,
            strength: causalStrength,
            confidence: Math.min(Math.abs(causalStrength), 0.95),
            evidence: [`Temporal precedence analysis of ${xSignals.length} signals`],
            timestamp: new Date(),
            metadata: { symbol, sourceType: typeX, targetType: typeY },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Discover event-to-signal causality
   */
  private async discoverEventCausality(
    events: MarketEvent[],
    signals: MarketSignal[]
  ): Promise<CausalEdge[]> {
    const edges: CausalEdge[] = [];

    for (const event of events) {
      // Find signals that occurred after this event
      const postEventSignals = signals.filter(
        (s) =>
          s.timestamp.getTime() > event.timestamp.getTime() &&
          s.timestamp.getTime() < event.timestamp.getTime() + 3600000 && // Within 1 hour
          event.symbols.includes(s.symbol)
      );

      if (postEventSignals.length > 0) {
        // Calculate correlation between event impact and signal values
        const avgSignalChange = this.calculateAverageChange(postEventSignals);
        const impactScore = this.getImpactScore(event.impact);

        const strength = avgSignalChange * impactScore;

        if (Math.abs(strength) > 0.2) {
          edges.push({
            id: `event-causal-${event.id}-${Date.now()}`,
            source: `event:${event.eventType}`,
            target: `signals:${event.symbols.join(',')}`,
            strength,
            confidence: Math.min(Math.abs(strength) * 1.2, 0.95),
            evidence: [
              `Event ${event.eventType} followed by ${postEventSignals.length} signals`,
            ],
            timestamp: new Date(),
            metadata: { eventId: event.id, eventType: event.eventType },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Compute Granger causality-like measure
   * Simplified version: does X help predict Y?
   */
  private computeGrangerCausality(
    xSignals: MarketSignal[],
    ySignals: MarketSignal[]
  ): number {
    if (xSignals.length < 2 || ySignals.length < 2) {
      return 0;
    }

    let precedenceCount = 0;
    let totalPairs = 0;

    // For each Y signal, check if it was preceded by an X signal
    for (const ySignal of ySignals) {
      const precedingXSignals = xSignals.filter(
        (x) =>
          x.timestamp.getTime() < ySignal.timestamp.getTime() &&
          x.timestamp.getTime() > ySignal.timestamp.getTime() - 3600000 // Within 1 hour
      );

      if (precedingXSignals.length > 0) {
        // Check if X values correlate with Y values
        const avgXValue = precedingXSignals.reduce((sum, x) => sum + x.value, 0) / precedingXSignals.length;
        if ((avgXValue > 0 && ySignal.value > 0) || (avgXValue < 0 && ySignal.value < 0)) {
          precedenceCount++;
        }
      }
      totalPairs++;
    }

    return totalPairs > 0 ? precedenceCount / totalPairs : 0;
  }

  // ============================================================================
  // Causal Inference
  // ============================================================================

  /**
   * Infer causal relationship between two entities
   */
  async inferCausality(
    cause: string,
    effect: string
  ): Promise<CausalInferenceResult | null> {
    // Find path from cause to effect in the causal graph
    const path = await this.findCausalPath(cause, effect);

    if (path.length === 0) {
      return null;
    }

    // Compute aggregate strength and confidence
    let totalStrength = 1;
    let minConfidence = 1;

    for (const edge of path) {
      totalStrength *= edge.strength;
      minConfidence = Math.min(minConfidence, edge.confidence);
    }

    return {
      cause,
      effect,
      strength: totalStrength,
      confidence: minConfidence,
      path: path.map((e) => e.source + ' -> ' + e.target),
      explanation: this.generateCausalExplanation(cause, effect, path),
    };
  }

  /**
   * Find all causal paths between two nodes
   */
  async findCausalPath(source: string, target: string): Promise<CausalEdge[]> {
    // Get edges from AgentDB
    const edges = await this.agentDB.findCausalPath(
      source,
      target,
      this.config.maxPathLength
    );

    return edges;
  }

  /**
   * Get direct causal effects of a node
   */
  async getDirectEffects(nodeId: string): Promise<CausalEdge[]> {
    return await this.agentDB.getCausalEdges(nodeId);
  }

  /**
   * Predict outcome based on causal relationships
   */
  async predictOutcome(
    cause: string,
    causeValue: number
  ): Promise<{ target: string; predictedValue: number; confidence: number }[]> {
    const directEffects = await this.getDirectEffects(cause);
    const predictions: { target: string; predictedValue: number; confidence: number }[] = [];

    for (const edge of directEffects) {
      const predictedValue = causeValue * edge.strength;
      predictions.push({
        target: edge.target,
        predictedValue,
        confidence: edge.confidence,
      });
    }

    return predictions;
  }

  // ============================================================================
  // Intervention Analysis
  // ============================================================================

  /**
   * Estimate effect of intervention (do-calculus inspired)
   * What would happen if we intervene and set X to a value?
   */
  async estimateInterventionEffect(
    interventionNode: string,
    interventionValue: number,
    targetNode: string
  ): Promise<{ effect: number; confidence: number }> {
    // Find causal path
    const path = await this.findCausalPath(interventionNode, targetNode);

    if (path.length === 0) {
      return { effect: 0, confidence: 0 };
    }

    // Propagate intervention through causal path
    let effect = interventionValue;
    let confidence = 1;

    for (const edge of path) {
      effect *= edge.strength;
      confidence = Math.min(confidence, edge.confidence);
    }

    return { effect, confidence };
  }

  /**
   * Find confounding variables
   */
  async findConfounders(
    causeNode: string,
    effectNode: string
  ): Promise<string[]> {
    const confounders: string[] = [];
    const graph = await this.agentDB.getCausalGraph();

    // A confounder is a common cause of both causeNode and effectNode
    for (const node of graph.nodes) {
      const affectsCause = graph.edges.some(
        (e) => e.source === node.id && e.target === causeNode
      );
      const affectsEffect = graph.edges.some(
        (e) => e.source === node.id && e.target === effectNode
      );

      if (affectsCause && affectsEffect) {
        confounders.push(node.id);
      }
    }

    return confounders;
  }

  // ============================================================================
  // Learning and Updating
  // ============================================================================

  /**
   * Update causal edge strength based on new evidence
   */
  async updateCausalStrength(
    edgeId: string,
    observedOutcome: number,
    expectedOutcome: number
  ): Promise<void> {
    if (!this.config.enableLearning) {
      return;
    }

    // Simple learning rate
    const learningRate = 0.1;

    // Get current edge
    const edges = this.localGraph.edges.filter((e) => e.id === edgeId);
    if (edges.length === 0) {
      return;
    }

    const edge = edges[0];

    // Update strength based on prediction error
    const error = observedOutcome - expectedOutcome;
    const adjustment = learningRate * error;

    const newStrength = Math.max(-1, Math.min(1, edge.strength + adjustment));
    const newConfidence = Math.min(0.99, edge.confidence + 0.01); // Increase confidence with evidence

    await this.agentDB.updateCausalStrength(
      edgeId,
      newStrength,
      newConfidence,
      [...edge.evidence, `Updated with observed outcome: ${observedOutcome}`]
    );

    // Update local graph
    edge.strength = newStrength;
    edge.confidence = newConfidence;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Group signals by symbol
   */
  private groupSignalsBySymbol(
    signals: MarketSignal[]
  ): Record<string, MarketSignal[]> {
    const grouped: Record<string, MarketSignal[]> = {};

    for (const signal of signals) {
      if (!grouped[signal.symbol]) {
        grouped[signal.symbol] = [];
      }
      grouped[signal.symbol].push(signal);
    }

    return grouped;
  }

  /**
   * Calculate average value change
   */
  private calculateAverageChange(signals: MarketSignal[]): number {
    if (signals.length === 0) return 0;
    const sum = signals.reduce((acc, s) => acc + s.value, 0);
    return sum / signals.length;
  }

  /**
   * Convert impact level to numeric score
   */
  private getImpactScore(impact: 'high' | 'medium' | 'low'): number {
    switch (impact) {
      case 'high':
        return 1.0;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.3;
    }
  }

  /**
   * Add edge to local graph
   */
  private addEdgeToLocalGraph(edge: CausalEdge): void {
    this.localGraph.edges.push(edge);

    // Add nodes if not exist
    if (!this.localGraph.nodes.find((n) => n.id === edge.source)) {
      this.localGraph.nodes.push({
        id: edge.source,
        name: edge.source,
        type: 'signal',
        metadata: {},
      });
    }

    if (!this.localGraph.nodes.find((n) => n.id === edge.target)) {
      this.localGraph.nodes.push({
        id: edge.target,
        name: edge.target,
        type: 'signal',
        metadata: {},
      });
    }
  }

  /**
   * Generate explanation for causal inference
   */
  private generateCausalExplanation(
    cause: string,
    effect: string,
    path: CausalEdge[]
  ): string {
    if (path.length === 1) {
      return `${cause} directly causes ${effect} with strength ${path[0].strength.toFixed(2)}`;
    }

    const pathDescription = path
      .map((e) => `${e.source} -> ${e.target} (${e.strength.toFixed(2)})`)
      .join(', ');

    return `${cause} causes ${effect} through path: ${pathDescription}`;
  }

  /**
   * Get the local causal graph
   */
  getGraph(): CausalGraph {
    return this.localGraph;
  }
}

// Factory function
export function createCausalEngine(
  config: CausalConfig,
  agentDB: AgentDBClient
): CausalEngine {
  return new CausalEngine(config, agentDB);
}
