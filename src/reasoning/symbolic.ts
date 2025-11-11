/**
 * Symbolic Reasoning Engine
 * Handles logic rules, ontology, and rule-based inference
 */

import type {
  LogicRule,
  Condition,
  Conclusion,
  InferenceResult,
  OntologyEntity,
  Relationship,
  MarketSignal,
  MarketEvent,
} from './types.js';

export interface SymbolicConfig {
  enableRuleEngine: boolean;
  enableOntology: boolean;
  maxInferenceDepth: number;
}

export class SymbolicEngine {
  private config: SymbolicConfig;
  private rules: Map<string, LogicRule> = new Map();
  private ontology: Map<string, OntologyEntity> = new Map();

  constructor(config: SymbolicConfig) {
    this.config = config;
    this.initializeDefaultRules();
    this.initializeOntology();
  }

  // ============================================================================
  // Rule Management
  // ============================================================================

  /**
   * Add a logic rule to the rule base
   */
  addRule(rule: LogicRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): LogicRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): LogicRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  // ============================================================================
  // Rule-Based Inference
  // ============================================================================

  /**
   * Apply rules to market data and infer conclusions
   */
  async infer(
    signals: MarketSignal[],
    events: MarketEvent[],
    context: Record<string, unknown> = {}
  ): Promise<InferenceResult[]> {
    if (!this.config.enableRuleEngine) {
      return [];
    }

    const results: InferenceResult[] = [];
    const workingMemory = this.buildWorkingMemory(signals, events, context);

    // Sort rules by priority (higher first)
    const sortedRules = Array.from(this.rules.values()).sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of sortedRules) {
      const result = this.evaluateRule(rule, workingMemory);
      results.push(result);

      // If rule matched, update working memory with conclusions
      if (result.matched) {
        for (const conclusion of result.conclusions) {
          this.applyConclusion(workingMemory, conclusion);
        }
      }
    }

    return results;
  }

  /**
   * Forward chaining inference (data-driven)
   */
  async forwardChain(
    initialFacts: Record<string, unknown>,
    maxDepth?: number
  ): Promise<Record<string, unknown>> {
    const depth = maxDepth || this.config.maxInferenceDepth;
    const facts = { ...initialFacts };
    let iteration = 0;

    while (iteration < depth) {
      let changed = false;
      iteration++;

      for (const rule of this.rules.values()) {
        const result = this.evaluateRule(rule, facts);
        
        if (result.matched) {
          for (const conclusion of result.conclusions) {
            const oldValue = facts[conclusion.field];
            this.applyConclusion(facts, conclusion);
            if (oldValue !== facts[conclusion.field]) {
              changed = true;
            }
          }
        }
      }

      // If no changes were made, we've reached a fixed point
      if (!changed) {
        break;
      }
    }

    return facts;
  }

  /**
   * Backward chaining inference (goal-driven)
   */
  async backwardChain(
    goal: string,
    facts: Record<string, unknown>
  ): Promise<boolean> {
    // Check if goal is already in facts
    if (facts[goal] !== undefined) {
      return true;
    }

    // Find rules that could prove the goal
    const relevantRules = Array.from(this.rules.values()).filter((rule) =>
      rule.conclusions.some((c) => c.field === goal)
    );

    for (const rule of relevantRules) {
      // Try to prove all conditions
      let allConditionsMet = true;

      for (const condition of rule.conditions) {
        if (!this.evaluateCondition(condition, facts)) {
          // Try to prove this condition recursively
          const proved = await this.backwardChain(condition.field, facts);
          if (!proved) {
            allConditionsMet = false;
            break;
          }
        }
      }

      // If all conditions met, apply conclusions
      if (allConditionsMet) {
        for (const conclusion of rule.conclusions) {
          this.applyConclusion(facts, conclusion);
        }
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // Ontology Management
  // ============================================================================

  /**
   * Add an entity to the ontology
   */
  addEntity(entity: OntologyEntity): void {
    this.ontology.set(entity.id, entity);
  }

  /**
   * Get an entity from the ontology
   */
  getEntity(entityId: string): OntologyEntity | undefined {
    return this.ontology.get(entityId);
  }

  /**
   * Find entities by type
   */
  findEntitiesByType(type: string): OntologyEntity[] {
    return Array.from(this.ontology.values()).filter((e) => e.type === type);
  }

  /**
   * Get related entities
   */
  getRelatedEntities(entityId: string, relationshipType?: string): OntologyEntity[] {
    const entity = this.ontology.get(entityId);
    if (!entity) {
      return [];
    }

    const related: OntologyEntity[] = [];
    for (const rel of entity.relationships) {
      if (!relationshipType || rel.type === relationshipType) {
        const target = this.ontology.get(rel.target);
        if (target) {
          related.push(target);
        }
      }
    }

    return related;
  }

  /**
   * Check if two entities are related
   */
  areEntitiesRelated(
    entity1Id: string,
    entity2Id: string,
    relationshipType?: string
  ): boolean {
    const entity1 = this.ontology.get(entity1Id);
    if (!entity1) {
      return false;
    }

    return entity1.relationships.some(
      (rel) =>
        rel.target === entity2Id && (!relationshipType || rel.type === relationshipType)
    );
  }

  /**
   * Add a relationship between entities
   */
  addRelationship(fromId: string, toId: string, relationship: Relationship): void {
    const entity = this.ontology.get(fromId);
    if (!entity) {
      throw new Error('Entity ' + fromId + ' not found');
    }

    // Check if relationship already exists
    const exists = entity.relationships.some(
      (r) => r.target === toId && r.type === relationship.type
    );

    if (!exists) {
      entity.relationships.push(relationship);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Build working memory from market data
   */
  private buildWorkingMemory(
    signals: MarketSignal[],
    events: MarketEvent[],
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const memory: Record<string, unknown> = { ...context };

    // Add signals to memory
    memory.signals = signals;
    memory.signalCount = signals.length;

    // Calculate aggregate signal metrics
    if (signals.length > 0) {
      const values = signals.map((s) => s.value);
      const confidences = signals.map((s) => s.confidence);

      memory.avgSignalValue = values.reduce((a, b) => a + b, 0) / values.length;
      memory.maxSignalValue = Math.max(...values);
      memory.minSignalValue = Math.min(...values);
      memory.avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

      // Count signals by type
      const signalsByType: Record<string, number> = {};
      for (const signal of signals) {
        signalsByType[signal.type] = (signalsByType[signal.type] || 0) + 1;
      }
      memory.signalsByType = signalsByType;
    }

    // Add events to memory
    memory.events = events;
    memory.eventCount = events.length;

    // Count events by impact
    if (events.length > 0) {
      const eventsByImpact: Record<string, number> = {};
      for (const event of events) {
        eventsByImpact[event.impact] = (eventsByImpact[event.impact] || 0) + 1;
      }
      memory.eventsByImpact = eventsByImpact;
    }

    return memory;
  }

  /**
   * Evaluate a single rule against working memory
   */
  private evaluateRule(rule: LogicRule, workingMemory: Record<string, unknown>): InferenceResult {
    // Check if all conditions are satisfied
    const allConditionsMet = rule.conditions.every((condition) =>
      this.evaluateCondition(condition, workingMemory)
    );

    return {
      rule: rule.name,
      matched: allConditionsMet,
      conclusions: allConditionsMet ? rule.conclusions : [],
      confidence: allConditionsMet ? rule.confidence : 0,
      explanation: this.generateExplanation(rule, allConditionsMet, workingMemory),
    };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: Condition, memory: Record<string, unknown>): boolean {
    const fieldValue = memory[condition.field];

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > (condition.value as number);
      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= (condition.value as number);
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < (condition.value as number);
      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= (condition.value as number);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'contains':
        return (
          typeof fieldValue === 'string' &&
          typeof condition.value === 'string' &&
          fieldValue.includes(condition.value)
        );
      default:
        return false;
    }
  }

  /**
   * Apply a conclusion to working memory
   */
  private applyConclusion(memory: Record<string, unknown>, conclusion: Conclusion): void {
    switch (conclusion.action) {
      case 'set':
        memory[conclusion.field] = conclusion.value;
        break;
      case 'increment':
        if (typeof memory[conclusion.field] === 'number' && typeof conclusion.value === 'number') {
          memory[conclusion.field] = (memory[conclusion.field] as number) + conclusion.value;
        } else {
          memory[conclusion.field] = conclusion.value;
        }
        break;
      case 'flag':
        memory[conclusion.field] = true;
        break;
    }
  }

  /**
   * Generate explanation for rule evaluation
   */
  private generateExplanation(
    rule: LogicRule,
    matched: boolean,
    memory: Record<string, unknown>
  ): string {
    if (matched) {
      const conditionDescriptions = rule.conditions.map((c) => {
        const value = memory[c.field];
        return c.field + ' ' + c.operator + ' ' + c.value + ' (actual: ' + value + ')';
      });
      return 'Rule "' + rule.name + '" matched: ' + conditionDescriptions.join(', ');
    } else {
      const failedConditions = rule.conditions.filter(
        (c) => !this.evaluateCondition(c, memory)
      );
      return 'Rule "' + rule.name + '" did not match. Failed conditions: ' + failedConditions.map((c) => c.field + ' ' + c.operator + ' ' + c.value).join(', ');
    }
  }

  /**
   * Initialize default market rules
   */
  private initializeDefaultRules(): void {
    // Rule 1: High confidence bullish signal
    this.addRule({
      id: 'bullish-signal',
      name: 'Bullish Market Signal',
      conditions: [
        { field: 'avgSignalValue', operator: 'gt', value: 0 },
        { field: 'avgConfidence', operator: 'gte', value: 0.7 },
      ],
      conclusions: [
        { field: 'marketSentiment', value: 'bullish', action: 'set' },
        { field: 'actionRecommendation', value: 'consider_buy', action: 'set' },
      ],
      confidence: 0.8,
      priority: 10,
    });

    // Rule 2: High confidence bearish signal
    this.addRule({
      id: 'bearish-signal',
      name: 'Bearish Market Signal',
      conditions: [
        { field: 'avgSignalValue', operator: 'lt', value: 0 },
        { field: 'avgConfidence', operator: 'gte', value: 0.7 },
      ],
      conclusions: [
        { field: 'marketSentiment', value: 'bearish', action: 'set' },
        { field: 'actionRecommendation', value: 'consider_sell', action: 'set' },
      ],
      confidence: 0.8,
      priority: 10,
    });

    // Rule 3: High impact event detected
    this.addRule({
      id: 'high-impact-event',
      name: 'High Impact Event',
      conditions: [{ field: 'eventCount', operator: 'gt', value: 0 }],
      conclusions: [
        { field: 'volatilityExpected', value: true, action: 'set' },
        { field: 'riskLevel', value: 'elevated', action: 'set' },
      ],
      confidence: 0.9,
      priority: 15,
    });

    // Rule 4: Multiple signal confirmation
    this.addRule({
      id: 'signal-confirmation',
      name: 'Multiple Signal Confirmation',
      conditions: [{ field: 'signalCount', operator: 'gte', value: 3 }],
      conclusions: [
        { field: 'signalConfirmation', value: true, action: 'set' },
        { field: 'confidenceBoost', value: 0.1, action: 'increment' },
      ],
      confidence: 0.75,
      priority: 5,
    });

    // Rule 5: Low confidence warning
    this.addRule({
      id: 'low-confidence',
      name: 'Low Confidence Warning',
      conditions: [{ field: 'avgConfidence', operator: 'lt', value: 0.5 }],
      conclusions: [
        { field: 'warning', value: 'low_confidence', action: 'set' },
        { field: 'actionRecommendation', value: 'hold', action: 'set' },
      ],
      confidence: 0.9,
      priority: 20,
    });
  }

  /**
   * Initialize ontology with market concepts
   */
  private initializeOntology(): void {
    if (!this.config.enableOntology) {
      return;
    }

    // Market concepts
    this.addEntity({
      id: 'market',
      type: 'concept',
      label: 'Market',
      properties: { description: 'Financial market entity' },
      relationships: [],
    });

    this.addEntity({
      id: 'signal',
      type: 'concept',
      label: 'Market Signal',
      properties: { description: 'Indicator of market direction' },
      relationships: [{ type: 'affects', target: 'market', properties: {} }],
    });

    this.addEntity({
      id: 'price',
      type: 'metric',
      label: 'Price',
      properties: { unit: 'currency' },
      relationships: [
        { type: 'is-a', target: 'signal', properties: {} },
        { type: 'indicates', target: 'market', properties: {} },
      ],
    });

    this.addEntity({
      id: 'volume',
      type: 'metric',
      label: 'Volume',
      properties: { unit: 'quantity' },
      relationships: [
        { type: 'is-a', target: 'signal', properties: {} },
        { type: 'confirms', target: 'price', properties: {} },
      ],
    });

    this.addEntity({
      id: 'sentiment',
      type: 'metric',
      label: 'Sentiment',
      properties: { range: [-1, 1] },
      relationships: [
        { type: 'is-a', target: 'signal', properties: {} },
        { type: 'influences', target: 'market', properties: {} },
      ],
    });

    this.addEntity({
      id: 'trend',
      type: 'pattern',
      label: 'Trend',
      properties: { types: ['upward', 'downward', 'sideways'] },
      relationships: [{ type: 'emerges-from', target: 'price', properties: {} }],
    });
  }
}

// Factory function
export function createSymbolicEngine(config: SymbolicConfig): SymbolicEngine {
  return new SymbolicEngine(config);
}
