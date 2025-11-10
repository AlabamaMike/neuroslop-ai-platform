import { vi } from 'vitest';
import {
  mockMarketData,
  mockNewsArticle,
  mockSocialPost,
  mockLLMResponse,
} from './mockData';

// Mock Anthropic API
export const mockAnthropicAPI = {
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: mockLLMResponse.content }],
      model: mockLLMResponse.model,
      usage: mockLLMResponse.usage,
      stop_reason: mockLLMResponse.stopReason,
    }),
  },
};

// Mock Neo4j Driver
export const mockNeo4jSession = {
  run: vi.fn().mockResolvedValue({
    records: [],
  }),
  close: vi.fn().mockResolvedValue(undefined),
};

export const mockNeo4jDriver = {
  session: vi.fn().mockReturnValue(mockNeo4jSession),
  close: vi.fn().mockResolvedValue(undefined),
  verifyConnectivity: vi.fn().mockResolvedValue(undefined),
};

// Mock Axios for API calls
export const mockAxios = {
  get: vi.fn().mockResolvedValue({
    data: mockMarketData,
    status: 200,
  }),
  post: vi.fn().mockResolvedValue({
    data: { success: true },
    status: 200,
  }),
};

// Mock Data Source
export class MockDataSource {
  async fetchMarketData(symbol: string): Promise<typeof mockMarketData> {
    return Promise.resolve({ ...mockMarketData, symbol });
  }

  async fetchNews(symbol: string): Promise<typeof mockNewsArticle[]> {
    return Promise.resolve([mockNewsArticle]);
  }

  async fetchSocialData(symbol: string): Promise<typeof mockSocialPost[]> {
    return Promise.resolve([mockSocialPost]);
  }
}

// Mock Knowledge Graph
export class MockKnowledgeGraph {
  async addNode(node: unknown): Promise<void> {
    return Promise.resolve();
  }

  async addRelationship(relationship: unknown): Promise<void> {
    return Promise.resolve();
  }

  async query(cypher: string): Promise<unknown[]> {
    return Promise.resolve([]);
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }
}

// Mock LLM Service
export class MockLLMService {
  async generateResponse(prompt: string): Promise<string> {
    return Promise.resolve(mockLLMResponse.content);
  }

  async analyze(data: unknown): Promise<{ sentiment: number; confidence: number }> {
    return Promise.resolve({ sentiment: 0.85, confidence: 0.82 });
  }
}

// Mock Logger
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
