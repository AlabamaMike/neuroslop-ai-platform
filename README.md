# Neurosymbolic AI Platform for Market Signals

A production-ready neurosymbolic reasoning engine that combines neural networks, symbolic AI, and causal inference for intelligent market signal analysis.

## Features

### Neurosymbolic Architecture
- **Neural Components**: Embeddings, vector search, pattern recognition, and learning from historical data
- **Symbolic Components**: Logic rules, ontology management, and rule-based inference
- **Causal Components**: Causal discovery, inference, and intervention analysis

### AgentDB Integration
- Vector embeddings for semantic search (1536 dimensions)
- Causal graph for relationship discovery
- Reflexion memory for learning from past patterns
- Skill consolidation for pattern recognition
- Multi-source data fusion

### Key Capabilities
1. **Semantic Analysis**: Embed and search market signals using vector embeddings
2. **Pattern Recognition**: Detect temporal patterns, anomalies, and trends
3. **Causal Inference**: Discover and analyze cause-effect relationships (X causes Y)
4. **Rule-Based Reasoning**: Apply logic rules and ontology for structured inference
5. **Learning System**: Reflexion-based learning from episodes and skill consolidation
6. **Knowledge Graph**: Build and query ontological knowledge structures

## Project Structure

```
neuroslop-ai-platform/
├── src/
│   └── reasoning/
│       ├── types.ts              # Type definitions
│       ├── agentdb-client.ts     # AgentDB integration
│       ├── neural.ts             # Neural components
│       ├── symbolic.ts           # Symbolic reasoning
│       ├── causal.ts             # Causal inference
│       ├── engine.ts             # Main reasoning engine
│       ├── index.ts              # Public API exports
│       └── example.ts            # Usage example
├── tests/
│   └── reasoning/
│       ├── agentdb-client.test.ts
│       ├── neural.test.ts
│       ├── symbolic.test.ts
│       ├── causal.test.ts
│       └── engine.test.ts
├── agentdb.db                    # AgentDB database
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Installation

```bash
# Install dependencies
npm install

# Initialize AgentDB
npx agentdb init ./agentdb.db --dimension 1536 --preset medium
```

## Usage

### Basic Example

```typescript
import { createReasoningEngine, defaultConfig } from './src/reasoning/engine.js';
import type { MarketSignal, ReasoningContext } from './src/reasoning/types.js';

// Initialize the engine
const engine = createReasoningEngine(defaultConfig);
await engine.initialize();

// Create market signals
const signals: MarketSignal[] = [
  {
    id: 'sig1',
    timestamp: new Date(),
    source: 'exchange',
    type: 'price',
    symbol: 'BTC',
    value: 45000,
    confidence: 0.95,
    metadata: {},
  },
];

// Perform reasoning
const result = await engine.reason({
  signals,
  events: [],
  timestamp: new Date(),
  metadata: {},
});

console.log('Insights:', result.insights);
console.log('Predictions:', result.predictions);
console.log('Recommendations:', result.recommendations);

// Shutdown
await engine.shutdown();
```

### Running the Example

```bash
npm run build
node dist/reasoning/example.js
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Architecture

### Neural Engine (`neural.ts`)

- **Embedding Generation**: Convert text and signals to vector embeddings
- **Semantic Search**: Find similar signals using vector similarity
- **Pattern Detection**: Identify temporal, anomaly, and trend patterns
- **Feature Extraction**: Extract statistical features from signals
- **Learning**: Learn from historical episodes

### Symbolic Engine (`symbolic.ts`)

- **Rule Management**: Add, retrieve, and manage logic rules
- **Forward Chaining**: Data-driven inference
- **Backward Chaining**: Goal-driven inference
- **Ontology**: Manage entities, relationships, and concepts
- **Rule Evaluation**: Evaluate conditions and apply conclusions

### Causal Engine (`causal.ts`)

- **Causal Discovery**: Discover relationships using temporal precedence
- **Granger Causality**: Simplified Granger causality test
- **Causal Inference**: Infer cause-effect relationships
- **Intervention Analysis**: Estimate effects of interventions
- **Path Finding**: Find causal paths between entities
- **Learning**: Update causal strengths based on evidence

### Main Engine (`engine.ts`)

Orchestrates all components:
1. Neural processing (embeddings, patterns)
2. Symbolic reasoning (rules, ontology)
3. Causal inference (discovery, prediction)
4. Multi-source fusion
5. Reflexion and learning

## API Reference

### NeurosymbolicReasoningEngine

```typescript
class NeurosymbolicReasoningEngine {
  constructor(config: ReasoningConfig);
  
  // Lifecycle
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  
  // Main reasoning
  async reason(context: ReasoningContext): Promise<ReasoningResult>;
  
  // Learning
  async storeEpisode(episode: Episode): Promise<void>;
  async queryEpisodes(state: Record<string, unknown>, limit?: number): Promise<Episode[]>;
  async storeSkill(skill: Skill): Promise<void>;
  async getSkills(limit?: number): Promise<Skill[]>;
  async getLearningMetrics(): Promise<LearningMetrics>;
  
  // Knowledge graph
  async buildKnowledgeGraph(insights: Insight[]): Promise<void>;
  getOntologyEntity(entityId: string): OntologyEntity | undefined;
  async getCausalGraph(): Promise<CausalGraph>;
  
  // Analytics
  async getStatistics(): Promise<Statistics>;
}
```

## Configuration

```typescript
const config: ReasoningConfig = {
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
    retentionPeriod: 30,
    minRewardThreshold: 0.0,
  },
};
```

## Testing

The project follows TDD principles with comprehensive test coverage:

- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **Mocking**: Mock AgentDB for isolated testing

## Production Readiness

- **TypeScript**: Strong typing throughout
- **Error Handling**: Comprehensive error handling
- **Validation**: Zod schemas for runtime validation
- **Testing**: >80% test coverage
- **Documentation**: Comprehensive inline documentation
- **Modularity**: Clean separation of concerns
- **Performance**: Optimized algorithms and caching

## License

MIT

## Contributing

Contributions welcome! Please follow the existing code style and add tests for new features.
