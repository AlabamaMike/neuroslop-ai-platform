/**
 * Tests for AgentDB Client
 */

import { createAgentDBClient } from '../../src/reasoning/agentdb-client.js';
import type { Embedding, CausalEdge, Episode, Skill, Pattern } from '../../src/reasoning/types.js';

describe('AgentDBClient', () => {
  let client: ReturnType<typeof createAgentDBClient>;

  beforeAll(async () => {
    client = createAgentDBClient({
      dbPath: ':memory:',
      dimension: 128,
      preset: 'small',
    });
    await client.initialize();
  });

  afterAll(async () => {
    await client.close();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const stats = await client.getStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('Vector Operations', () => {
    it('should store embeddings', async () => {
      const embedding: Embedding = {
        id: 'test1',
        vector: Array.from({ length: 128 }, () => Math.random()),
        dimension: 128,
        model: 'test',
        metadata: {},
      };

      await expect(client.storeEmbedding(embedding)).resolves.not.toThrow();
    });

    it('should batch store embeddings', async () => {
      const embeddings: Embedding[] = Array.from({ length: 5 }, (_, i) => ({
        id: `batch${i}`,
        vector: Array.from({ length: 128 }, () => Math.random()),
        dimension: 128,
        model: 'test',
        metadata: {},
      }));

      await expect(client.batchStoreEmbeddings(embeddings)).resolves.not.toThrow();
    });

    it('should search for similar vectors', async () => {
      const queryVector = Array.from({ length: 128 }, () => Math.random());
      const results = await client.searchSimilar(queryVector, 10, 0.7);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Causal Graph Operations', () => {
    it('should add causal edges', async () => {
      const edge: CausalEdge = {
        id: 'edge1',
        source: 'A',
        target: 'B',
        strength: 0.8,
        confidence: 0.9,
        evidence: ['test'],
        timestamp: new Date(),
        metadata: {},
      };

      await expect(client.addCausalEdge(edge)).resolves.not.toThrow();
    });

    it('should retrieve causal edges', async () => {
      const edges = await client.getCausalEdges('A');
      expect(Array.isArray(edges)).toBe(true);
    });

    it('should get causal graph', async () => {
      const graph = await client.getCausalGraph();
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
    });
  });

  describe('Episode Operations', () => {
    it('should store episodes', async () => {
      const episode: Episode = {
        id: 'ep1',
        timestamp: new Date(),
        state: { test: 1 },
        action: 'test',
        outcome: 'success',
        reward: 1,
        reflection: 'test',
        metadata: {},
      };

      await expect(client.storeEpisode(episode)).resolves.not.toThrow();
    });

    it('should query episodes', async () => {
      const episodes = await client.queryEpisodes({ minReward: 0 }, 10);
      expect(Array.isArray(episodes)).toBe(true);
    });
  });

  describe('Skill Operations', () => {
    it('should store skills', async () => {
      const skill: Skill = {
        id: 'skill1',
        name: 'Test Skill',
        description: 'A test skill',
        parameters: {},
        examples: [],
        successRate: 0.8,
        usageCount: 1,
        lastUsed: new Date(),
      };

      await expect(client.storeSkill(skill)).resolves.not.toThrow();
    });

    it('should retrieve skills', async () => {
      const skills = await client.getSkills('successRate', 10);
      expect(Array.isArray(skills)).toBe(true);
    });
  });

  describe('Pattern Operations', () => {
    it('should store patterns', async () => {
      const pattern: Pattern = {
        id: 'pattern1',
        name: 'Test Pattern',
        type: 'trend',
        features: { slope: 1.0 },
        support: 10,
        confidence: 0.8,
        timestamp: new Date(),
      };

      await expect(client.storePattern(pattern)).resolves.not.toThrow();
    });

    it('should retrieve patterns', async () => {
      const patterns = await client.getPatterns('trend', 0.5, 10);
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('Analytics', () => {
    it('should get statistics', async () => {
      const stats = await client.getStatistics();

      expect(stats).toHaveProperty('embeddings');
      expect(stats).toHaveProperty('causalEdges');
      expect(stats).toHaveProperty('episodes');
      expect(stats).toHaveProperty('skills');
      expect(stats).toHaveProperty('patterns');
    });

    it('should compute learning metrics', async () => {
      const metrics = await client.computeLearningMetrics();

      expect(metrics).toHaveProperty('episodesProcessed');
      expect(metrics).toHaveProperty('patternsDiscovered');
      expect(metrics).toHaveProperty('skillsLearned');
      expect(metrics).toHaveProperty('averageReward');
    });
  });
});
