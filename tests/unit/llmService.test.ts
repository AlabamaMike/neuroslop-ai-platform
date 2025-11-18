import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from '@/core/llmService';
import { mockAnthropicAPI } from '@tests/fixtures/mocks';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => mockAnthropicAPI),
}));

describe('LLMService', () => {
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService('test-api-key');
  });

  describe('generateResponse', () => {
    it('should generate a response from the LLM', async () => {
      const response = await llmService.generateResponse('Test prompt');
      expect(response).toBe('Based on the analysis, the market sentiment is bullish...');
      expect(mockAnthropicAPI.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          max_tokens: expect.any(Number),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Test prompt',
            }),
          ]),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockAnthropicAPI.messages.create.mockRejectedValueOnce(new Error('API Error'));
      await expect(llmService.generateResponse('Test')).rejects.toThrow('API Error');
    });
  });

  describe('analyze', () => {
    it('should analyze data and return sentiment and confidence', async () => {
      const result = await llmService.analyze({ test: 'data' });
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('confidence');
      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
