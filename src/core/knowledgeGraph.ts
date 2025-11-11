import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from '../utils/logger';
import { KnowledgeGraphNode, KnowledgeGraphRelationship } from '../utils/types';

export class KnowledgeGraph {
  private driver: Driver;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async addNode(node: KnowledgeGraphNode): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        'CREATE (n:Node {id: $id, type: $type, label: $label, properties: $properties})',
        node
      );
    } finally {
      await session.close();
    }
  }

  async addRelationship(relationship: KnowledgeGraphRelationship): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        'MATCH (a {id: $source}), (b {id: $target}) CREATE (a)-[r:$type $properties]->(b)',
        relationship
      );
    } finally {
      await session.close();
    }
  }

  async query(cypher: string, params = {}): Promise<unknown[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((record) => record.toObject());
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
