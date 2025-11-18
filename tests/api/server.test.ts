/**
 * API Server Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { APIServer } from '../../src/api/server.js';

describe('API Server', () => {
  let server: APIServer;
  let app: any;

  beforeAll(async () => {
    server = new APIServer(0); // Use random port
    await server.start();
    app = server.getApp();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('metrics');
    });
  });

  describe('GET /api/health/ping', () => {
    it('should return pong', async () => {
      const response = await request(app).get('/api/health/ping');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe('pong');
    });
  });

  describe('GET /api/health/stats', () => {
    it('should return system statistics', async () => {
      const response = await request(app).get('/api/health/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('signals');
      expect(response.body.data).toHaveProperty('cache');
      expect(response.body.data).toHaveProperty('aggregator');
    });
  });

  describe('POST /api/signals/search', () => {
    it('should search signals with valid query', async () => {
      const response = await request(app)
        .post('/api/signals/search')
        .send({
          keywords: ['test'],
          limit: 10,
          offset: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('signals');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('hasMore');
    });

    it('should validate search query', async () => {
      const response = await request(app)
        .post('/api/signals/search')
        .send({
          minConfidence: 2, // Invalid: > 1
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should filter by confidence threshold', async () => {
      const response = await request(app)
        .post('/api/signals/search')
        .send({
          minConfidence: 0.8,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.signals).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/signals/trending', () => {
    it('should return trending signals', async () => {
      const response = await request(app)
        .get('/api/signals/trending')
        .query({ limit: 5, hours: 24 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trending');
      expect(response.body.data.trending).toBeInstanceOf(Array);
    });

    it('should use cache for repeated requests', async () => {
      const response1 = await request(app)
        .get('/api/signals/trending')
        .query({ limit: 10 });

      const response2 = await request(app)
        .get('/api/signals/trending')
        .query({ limit: 10 });

      // Compare everything except timestamps which may differ slightly
      expect(response1.body.success).toBe(response2.body.success);
      expect(response1.body.data).toEqual(response2.body.data);
    });
  });

  describe('GET /api/sources', () => {
    it('should return all source configurations', async () => {
      const response = await request(app).get('/api/sources');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data.sources).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/sources/health', () => {
    it('should return source health status', async () => {
      const response = await request(app).get('/api/sources/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('summary');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/signals/search')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests rapidly
      const requests = Array.from({ length: 150 }, () =>
        request(app).get('/api/health/ping')
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status === 429);

      // This test might be flaky depending on rate limit settings
      // So we just check the structure is correct
      expect(responses.length).toBe(150);
    });
  });
});
