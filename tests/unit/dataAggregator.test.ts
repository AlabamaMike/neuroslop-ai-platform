import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataAggregator } from '@/data/dataAggregator';
import { mockMarketData } from '@tests/fixtures/mockData';

describe('DataAggregator', () => {
  let dataAggregator: DataAggregator;

  beforeEach(() => {
    dataAggregator = new DataAggregator();
  });

  describe('fetchMarketData', () => {
    it('should fetch market data for a symbol', async () => {
      const data = await dataAggregator.fetchMarketData('AAPL');
      expect(data).toHaveProperty('symbol', 'AAPL');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('volume');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('fetchNews', () => {
    it('should fetch news articles for a symbol', async () => {
      const news = await dataAggregator.fetchNews('AAPL');
      expect(Array.isArray(news)).toBe(true);
    });
  });

  describe('fetchSocialData', () => {
    it('should fetch social media posts for a symbol', async () => {
      const social = await dataAggregator.fetchSocialData('AAPL');
      expect(Array.isArray(social)).toBe(true);
    });
  });

  describe('fetchAllData', () => {
    it('should fetch all data sources in parallel', async () => {
      const data = await dataAggregator.fetchAllData('AAPL');
      expect(data).toHaveProperty('market');
      expect(data).toHaveProperty('news');
      expect(data).toHaveProperty('social');
      expect(data.market.symbol).toBe('AAPL');
      expect(Array.isArray(data.news)).toBe(true);
      expect(Array.isArray(data.social)).toBe(true);
    });
  });
});
