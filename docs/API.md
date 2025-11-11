# API Documentation

## Table of Contents

- [NeuroSlopPlatform](#neuroslopplatform)
- [LLMService](#llmservice)
- [KnowledgeGraph](#knowledgegraph)
- [DataAggregator](#dataaggregator)
- [ReasoningEngine](#reasoningengine)
- [SignalGenerator](#signalgenerator)
- [Types](#types)

## NeuroSlopPlatform

Main entry point for the platform.

### Constructor

```typescript
constructor(config: PlatformConfig)
```

#### Parameters

- `config`: Configuration object
  - `anthropicApiKey`: Anthropic API key
  - `neo4jUri`: Neo4j database URI
  - `neo4jUser`: Neo4j username
  - `neo4jPassword`: Neo4j password
  - `logLevel`: (optional) Log level (default: 'info')
  - `maxReasoningSteps`: (optional) Maximum reasoning steps
  - `confidenceThreshold`: (optional) Confidence threshold for signals

### Methods

#### analyze(symbol: string)

Performs complete analysis for a given stock symbol.

```typescript
async analyze(symbol: string): Promise<Signal>
```

**Parameters:**
- `symbol`: Stock symbol (e.g., 'AAPL', 'GOOGL')

**Returns:** Promise<Signal> - Generated signal with confidence and reasoning

**Example:**
```typescript
const signal = await platform.analyze('AAPL');
console.log(signal.type); // 'buy' | 'sell' | 'hold'
console.log(signal.confidence); // 0.0 - 1.0
```

#### close()

Closes all connections and cleans up resources.

```typescript
async close(): Promise<void>
```

---

## LLMService

Handles interactions with Large Language Models (Anthropic Claude).

### Constructor

```typescript
constructor(apiKey: string)
```

### Methods

#### generateResponse(prompt: string, maxTokens?: number)

Generates a text response from the LLM.

```typescript
async generateResponse(prompt: string, maxTokens?: number): Promise<string>
```

**Parameters:**
- `prompt`: Input prompt
- `maxTokens`: (optional) Maximum tokens to generate (default: 1024)

**Returns:** Promise<string> - Generated text

#### analyze(data: unknown)

Analyzes data and returns sentiment and confidence.

```typescript
async analyze(data: unknown): Promise<{ sentiment: number; confidence: number }>
```

**Parameters:**
- `data`: Data to analyze

**Returns:** Object with sentiment (-1 to 1) and confidence (0 to 1)

---

## KnowledgeGraph

Manages the Neo4j knowledge graph database.

### Constructor

```typescript
constructor(uri: string, user: string, password: string)
```

### Methods

#### addNode(node: KnowledgeGraphNode)

Adds a node to the knowledge graph.

```typescript
async addNode(node: KnowledgeGraphNode): Promise<void>
```

**Parameters:**
- `node`: Node object with id, type, label, and properties

#### addRelationship(relationship: KnowledgeGraphRelationship)

Adds a relationship between nodes.

```typescript
async addRelationship(relationship: KnowledgeGraphRelationship): Promise<void>
```

**Parameters:**
- `relationship`: Relationship object with id, type, source, target, and properties

#### query(cypher: string, params?: object)

Executes a Cypher query.

```typescript
async query(cypher: string, params?: object): Promise<unknown[]>
```

**Parameters:**
- `cypher`: Cypher query string
- `params`: (optional) Query parameters

**Returns:** Array of query results

#### close()

Closes the database connection.

```typescript
async close(): Promise<void>
```

---

## DataAggregator

Aggregates data from multiple sources.

### Methods

#### fetchMarketData(symbol: string)

Fetches market data for a symbol.

```typescript
async fetchMarketData(symbol: string): Promise<MarketData>
```

#### fetchNews(symbol: string)

Fetches news articles related to a symbol.

```typescript
async fetchNews(symbol: string): Promise<NewsArticle[]>
```

#### fetchSocialData(symbol: string)

Fetches social media posts related to a symbol.

```typescript
async fetchSocialData(symbol: string): Promise<SocialPost[]>
```

#### fetchAllData(symbol: string)

Fetches all data sources in parallel.

```typescript
async fetchAllData(symbol: string): Promise<{
  market: MarketData;
  news: NewsArticle[];
  social: SocialPost[];
}>
```

---

## ReasoningEngine

Performs neurosymbolic reasoning on data.

### Constructor

```typescript
constructor(llmService: LLMService, knowledgeGraph: KnowledgeGraph)
```

### Methods

#### reason(data: unknown)

Performs multi-step reasoning on input data.

```typescript
async reason(data: unknown): Promise<ReasoningStep[]>
```

**Returns:** Array of reasoning steps with confidence scores

---

## SignalGenerator

Generates trading signals from reasoning results.

### Constructor

```typescript
constructor(reasoningEngine: ReasoningEngine)
```

### Methods

#### generate(symbol: string, reasoning: ReasoningStep[])

Generates a trading signal.

```typescript
async generate(symbol: string, reasoning: ReasoningStep[]): Promise<Signal>
```

**Parameters:**
- `symbol`: Stock symbol
- `reasoning`: Array of reasoning steps

**Returns:** Trading signal with type, confidence, and reasoning

---

## Types

### MarketData

```typescript
interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}
```

### NewsArticle

```typescript
interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment?: number;
  relevance?: number;
}
```

### SocialPost

```typescript
interface SocialPost {
  id: string;
  platform: string;
  content: string;
  author: string;
  score: number;
  comments: number;
  timestamp: string;
  sentiment?: number;
}
```

### Signal

```typescript
interface Signal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold';
  strength: number;
  confidence: number;
  reasoning: string[];
  sources: string[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

### ReasoningStep

```typescript
interface ReasoningStep {
  id: string;
  type: string;
  input: unknown;
  output: unknown;
  reasoning: string;
  confidence: number;
  timestamp: string;
}
```

### PlatformConfig

```typescript
interface PlatformConfig {
  anthropicApiKey: string;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  logLevel?: string;
  maxReasoningSteps?: number;
  confidenceThreshold?: number;
}
```

## Error Handling

All async methods may throw errors. Always use try-catch blocks:

```typescript
try {
  const signal = await platform.analyze('AAPL');
} catch (error) {
  console.error('Analysis failed:', error);
}
```

## Rate Limiting

Be aware of API rate limits:
- Anthropic API: Varies by plan
- Market data APIs: Typically 5-60 requests per minute
- Neo4j: Connection pool limits

## Best Practices

1. Always call `platform.close()` when done
2. Use environment variables for sensitive data
3. Implement proper error handling
4. Monitor API usage and costs
5. Cache results when appropriate
6. Use batch operations for multiple symbols
