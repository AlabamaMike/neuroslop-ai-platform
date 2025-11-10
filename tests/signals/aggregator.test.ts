/**
 * Data Aggregator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DataAggregator,
  MockDataSource,
} from '../../src/signals/aggregator.js';
import { DataSourceType } from '../../src/signals/types.js';

describe('DataAggregator', () => {
  let aggregator: DataAggregator;

  beforeEach(() => {
    aggregator = new DataAggregator();
  });

  describe('registerSource', () => {
    it('should register a data source', () => {
      const mockSource = new MockDataSource(DataSourceType.REDDIT);
      aggregator.registerSource(mockSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: {},
      });

      const config = aggregator.getSourceConfiguration(DataSourceType.REDDIT);
      expect(config).toBeDefined();
      expect(config?.type).toBe(DataSourceType.REDDIT);
      expect(config?.enabled).toBe(true);
    });

    it('should register multiple sources', () => {
      const redditSource = new MockDataSource(DataSourceType.REDDIT);
      const twitterSource = new MockDataSource(DataSourceType.TWITTER);

      aggregator.registerSource(redditSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: {},
      });

      aggregator.registerSource(twitterSource, {
        type: DataSourceType.TWITTER,
        enabled: true,
        config: {},
      });

      const configs = aggregator.getAllSourceConfigurations();
      expect(configs).toHaveLength(2);
    });
  });

  describe('aggregate', () => {
    beforeEach(() => {
      const redditSource = new MockDataSource(DataSourceType.REDDIT);
      const twitterSource = new MockDataSource(DataSourceType.TWITTER);

      aggregator.registerSource(redditSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: {},
      });

      aggregator.registerSource(twitterSource, {
        type: DataSourceType.TWITTER,
        enabled: true,
        config: {},
      });
    });

    it('should aggregate data from multiple sources', async () => {
      const dataPoints = await aggregator.aggregate({
        sources: [DataSourceType.REDDIT, DataSourceType.TWITTER],
        timeWindow: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        minDataPoints: 1,
      });

      expect(dataPoints.length).toBeGreaterThan(0);
      expect(
        dataPoints.some((dp) => dp.sourceType === DataSourceType.REDDIT)
      ).toBe(true);
      expect(
        dataPoints.some((dp) => dp.sourceType === DataSourceType.TWITTER)
      ).toBe(true);
    });

    it('should filter by time window', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const dataPoints = await aggregator.aggregate({
        sources: [DataSourceType.REDDIT],
        timeWindow: {
          start: oneDayAgo,
          end: now,
        },
        minDataPoints: 1,
      });

      dataPoints.forEach((dp) => {
        expect(dp.timestamp.getTime()).toBeGreaterThanOrEqual(
          oneDayAgo.getTime()
        );
        expect(dp.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should use cache for repeated requests', async () => {
      const config = {
        sources: [DataSourceType.REDDIT],
        timeWindow: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        minDataPoints: 1,
      };

      const data1 = await aggregator.aggregate(config);
      const data2 = await aggregator.aggregate(config);

      // Should return same data from cache
      expect(data1).toEqual(data2);
    });

    it('should skip disabled sources', async () => {
      aggregator.toggleSource(DataSourceType.TWITTER, false);

      const dataPoints = await aggregator.aggregate({
        sources: [DataSourceType.REDDIT, DataSourceType.TWITTER],
        timeWindow: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        minDataPoints: 1,
      });

      expect(
        dataPoints.every((dp) => dp.sourceType !== DataSourceType.TWITTER)
      ).toBe(true);
    });
  });

  describe('configuration management', () => {
    it('should update source configuration', () => {
      const mockSource = new MockDataSource(DataSourceType.REDDIT);
      aggregator.registerSource(mockSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: { test: 'old' },
      });

      const updated = aggregator.updateSourceConfiguration(
        DataSourceType.REDDIT,
        {
          config: { test: 'new' },
        }
      );

      expect(updated).toBe(true);

      const config = aggregator.getSourceConfiguration(DataSourceType.REDDIT);
      expect(config?.config.test).toBe('new');
    });

    it('should toggle source enabled state', () => {
      const mockSource = new MockDataSource(DataSourceType.REDDIT);
      aggregator.registerSource(mockSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: {},
      });

      aggregator.toggleSource(DataSourceType.REDDIT, false);

      const config = aggregator.getSourceConfiguration(DataSourceType.REDDIT);
      expect(config?.enabled).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockSource = new MockDataSource(DataSourceType.REDDIT);
      aggregator.registerSource(mockSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: {},
      });

      await aggregator.aggregate({
        sources: [DataSourceType.REDDIT],
        timeWindow: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        minDataPoints: 1,
      });

      aggregator.clearCache();

      const stats = aggregator.getStatistics();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('checkSourcesHealth', () => {
    it('should check health of all sources', async () => {
      const mockSource = new MockDataSource(DataSourceType.REDDIT);
      aggregator.registerSource(mockSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: {},
      });

      const health = await aggregator.checkSourcesHealth();

      expect(health).toBeDefined();
      expect(health[DataSourceType.REDDIT]).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return aggregator statistics', () => {
      const mockSource = new MockDataSource(DataSourceType.REDDIT);
      aggregator.registerSource(mockSource, {
        type: DataSourceType.REDDIT,
        enabled: true,
        config: {},
      });

      const stats = aggregator.getStatistics();

      expect(stats.totalSources).toBe(1);
      expect(stats.enabledSources).toBe(1);
      expect(stats.cacheSize).toBe(0);
    });
  });
});
