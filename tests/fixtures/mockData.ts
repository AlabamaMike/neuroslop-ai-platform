export const mockMarketData = {
  symbol: 'AAPL',
  price: 150.25,
  change: 2.5,
  changePercent: 1.69,
  volume: 50000000,
  timestamp: '2024-01-15T10:30:00Z',
  open: 148.5,
  high: 151.0,
  low: 147.8,
  close: 150.25,
};

export const mockNewsArticle = {
  id: 'news-123',
  title: 'Apple Announces New Product Line',
  content: 'Apple Inc. announced a revolutionary new product line today...',
  source: 'TechNews',
  url: 'https://example.com/news/123',
  publishedAt: '2024-01-15T09:00:00Z',
  sentiment: 0.85,
  relevance: 0.92,
};

export const mockSocialPost = {
  id: 'post-456',
  platform: 'reddit',
  content: 'Just bought more AAPL shares. Bullish on the new product line!',
  author: 'trader123',
  score: 150,
  comments: 45,
  timestamp: '2024-01-15T10:15:00Z',
  sentiment: 0.75,
};

export const mockSignal = {
  id: 'signal-789',
  symbol: 'AAPL',
  type: 'buy',
  strength: 0.88,
  confidence: 0.82,
  reasoning: [
    'Positive sentiment in recent news',
    'Strong social media engagement',
    'Technical indicators show upward trend',
  ],
  sources: ['news', 'social', 'technical'],
  timestamp: '2024-01-15T10:30:00Z',
  metadata: {
    priceTarget: 160.0,
    timeframe: '1-3 months',
    riskLevel: 'medium',
  },
};

export const mockKnowledgeGraphNode = {
  id: 'node-123',
  type: 'entity',
  label: 'Apple Inc.',
  properties: {
    symbol: 'AAPL',
    sector: 'Technology',
    industry: 'Consumer Electronics',
  },
};

export const mockKnowledgeGraphRelationship = {
  id: 'rel-456',
  type: 'INFLUENCED_BY',
  source: 'node-123',
  target: 'node-456',
  properties: {
    strength: 0.85,
    type: 'sentiment',
  },
};

export const mockLLMResponse = {
  content: 'Based on the analysis, the market sentiment is bullish...',
  model: 'claude-3-sonnet',
  usage: {
    inputTokens: 100,
    outputTokens: 150,
  },
  stopReason: 'end_turn',
};

export const mockReasoningStep = {
  id: 'step-1',
  type: 'analysis',
  input: { symbol: 'AAPL', data: mockMarketData },
  output: { sentiment: 0.85, confidence: 0.82 },
  reasoning: 'Price shows strong upward momentum with high volume',
  confidence: 0.82,
  timestamp: '2024-01-15T10:30:00Z',
};

export const mockAPIResponse = {
  success: true,
  data: mockSignal,
  timestamp: '2024-01-15T10:30:00Z',
  metadata: {
    requestId: 'req-123',
    processingTime: 125,
  },
};

export const mockErrorResponse = {
  success: false,
  error: {
    code: 'INVALID_SYMBOL',
    message: 'The provided symbol is not valid',
    details: { symbol: 'INVALID' },
  },
  timestamp: '2024-01-15T10:30:00Z',
};
