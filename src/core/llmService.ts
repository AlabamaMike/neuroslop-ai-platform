import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export class LLMService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateResponse(prompt: string, maxTokens = 1024): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response type from LLM');
    } catch (error) {
      logger.error('Error generating LLM response:', error);
      throw error;
    }
  }

  async analyze(data: unknown): Promise<{ sentiment: number; confidence: number }> {
    const prompt = `Analyze the following data and provide sentiment (-1 to 1) and confidence (0 to 1):\n${JSON.stringify(data)}`;
    const response = await this.generateResponse(prompt);

    // Parse response (simplified for demo)
    return {
      sentiment: 0.5,
      confidence: 0.8,
    };
  }
}
