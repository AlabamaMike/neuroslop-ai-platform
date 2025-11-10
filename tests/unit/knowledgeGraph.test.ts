import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeGraph } from '@/core/knowledgeGraph';
import { mockNeo4jDriver, mockNeo4jSession } from '@tests/fixtures/mocks';
import { mockKnowledgeGraphNode, mockKnowledgeGraphRelationship } from '@tests/fixtures/mockData';

vi.mock('neo4j-driver', () => ({
  default: {
    driver: vi.fn().mockReturnValue(mockNeo4jDriver),
    auth: {
      basic: vi.fn().mockReturnValue({}),
    },
  },
}));

describe('KnowledgeGraph', () => {
  let knowledgeGraph: KnowledgeGraph;

  beforeEach(() => {
    vi.clearAllMocks();
    knowledgeGraph = new KnowledgeGraph('bolt://localhost:7687', 'neo4j', 'password');
  });

  describe('addNode', () => {
    it('should add a node to the knowledge graph', async () => {
      await knowledgeGraph.addNode(mockKnowledgeGraphNode);
      expect(mockNeo4jSession.run).toHaveBeenCalled();
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });
  });

  describe('addRelationship', () => {
    it('should add a relationship to the knowledge graph', async () => {
      await knowledgeGraph.addRelationship(mockKnowledgeGraphRelationship);
      expect(mockNeo4jSession.run).toHaveBeenCalled();
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should execute a cypher query and return results', async () => {
      mockNeo4jSession.run.mockResolvedValueOnce({
        records: [
          { toObject: () => ({ test: 'data' }) },
        ],
      });

      const results = await knowledgeGraph.query('MATCH (n) RETURN n');
      expect(results).toEqual([{ test: 'data' }]);
      expect(mockNeo4jSession.run).toHaveBeenCalledWith('MATCH (n) RETURN n', {});
    });
  });

  describe('close', () => {
    it('should close the database connection', async () => {
      await knowledgeGraph.close();
      expect(mockNeo4jDriver.close).toHaveBeenCalled();
    });
  });
});
