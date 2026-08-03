import { KnowledgeGraphEngine } from './knowledge-graph.engine';
import type { KnowledgeNode } from '../entities/knowledge-graph.entity';

describe('KnowledgeGraphEngine', () => {
  let engine: KnowledgeGraphEngine;

  beforeEach(() => {
    engine = new KnowledgeGraphEngine();
  });

  // ── Seed ──────────────────────────────────────────────────────────────────

  describe('buildQuranKnowledgeGraph (seed)', () => {
    it('seeds nodes at construction', () => {
      const snapshot = engine.toSnapshot();
      expect(snapshot.nodeCount).toBeGreaterThan(0);
    });

    it('seeds edges at construction', () => {
      const snapshot = engine.toSnapshot();
      expect(snapshot.edgeCount).toBeGreaterThan(0);
    });

    it('includes tajweed_rule nodes', () => {
      const snapshot = engine.toSnapshot();
      const tajweedNodes = snapshot.nodes.filter((n) => n.type === 'tajweed_rule');
      expect(tajweedNodes.length).toBeGreaterThan(0);
    });

    it('includes difficulty_tier nodes', () => {
      const snapshot = engine.toSnapshot();
      const tiers = snapshot.nodes.filter((n) => n.type === 'difficulty_tier');
      expect(tiers.length).toBeGreaterThan(0);
    });

    it('includes mistake_pattern nodes', () => {
      const snapshot = engine.toSnapshot();
      const patterns = snapshot.nodes.filter((n) => n.type === 'mistake_pattern');
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  // ── addNode ───────────────────────────────────────────────────────────────

  describe('addNode', () => {
    it('makes the node retrievable by getNode', () => {
      const node: KnowledgeNode = {
        id: 'custom.node',
        type: 'concept',
        label: 'Custom Concept',
        attributes: {},
      };
      engine.addNode(node);
      expect(engine.getNode('custom.node')).toEqual(node);
    });

    it('returns undefined for unknown node id', () => {
      expect(engine.getNode('does.not.exist')).toBeUndefined();
    });
  });

  // ── addEdge + getNeighbors ─────────────────────────────────────────────────

  describe('addEdge / getNeighbors', () => {
    it('makes the target reachable via getNeighbors', () => {
      engine.addNode({ id: 'src', type: 'concept', label: 'S', attributes: {} });
      engine.addNode({ id: 'tgt', type: 'concept', label: 'T', attributes: {} });
      engine.addEdge({ from: 'src', to: 'tgt', relation: 'related_to', weight: 0.8 });

      const neighbors = engine.getNeighbors('src');
      expect(neighbors.some((n) => n.id === 'tgt')).toBe(true);
    });

    it('filters by relation when supplied', () => {
      engine.addNode({ id: 'a', type: 'concept', label: 'A', attributes: {} });
      engine.addNode({ id: 'b', type: 'concept', label: 'B', attributes: {} });
      engine.addNode({ id: 'c', type: 'concept', label: 'C', attributes: {} });
      engine.addEdge({ from: 'a', to: 'b', relation: 'requires', weight: 1.0 });
      engine.addEdge({ from: 'a', to: 'c', relation: 'related_to', weight: 0.5 });

      const requires = engine.getNeighbors('a', 'requires');
      expect(requires.some((n) => n.id === 'b')).toBe(true);
      expect(requires.some((n) => n.id === 'c')).toBe(false);
    });

    it('returns empty array for a node with no outgoing edges', () => {
      engine.addNode({ id: 'isolated', type: 'concept', label: 'Iso', attributes: {} });
      expect(engine.getNeighbors('isolated')).toHaveLength(0);
    });
  });

  // ── findPath ──────────────────────────────────────────────────────────────

  describe('findPath', () => {
    it('finds a direct path between connected nodes', () => {
      const snapshot = engine.toSnapshot();
      const tierBeginner = snapshot.nodes.find((n) => n.id === 'tier.beginner');
      const tierIntermediate = snapshot.nodes.find((n) => n.id === 'tier.intermediate');
      if (tierBeginner && tierIntermediate) {
        const path = engine.findPath('tier.beginner', 'tier.intermediate');
        expect(path.length).toBeGreaterThan(0);
        expect(path[0].id).toBe('tier.beginner');
        expect(path[path.length - 1].id).toBe('tier.intermediate');
      }
    });

    it('returns empty array for non-existent source', () => {
      const path = engine.findPath('ghost.node', 'tier.beginner');
      expect(path).toHaveLength(0);
    });

    it('returns single-node array when from === to', () => {
      const path = engine.findPath('tier.beginner', 'tier.beginner');
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe('tier.beginner');
    });
  });

  // ── computeRelevanceScore ─────────────────────────────────────────────────

  describe('computeRelevanceScore', () => {
    it('returns 0 for an empty node list', () => {
      expect(engine.computeRelevanceScore([])).toBe(0);
    });

    it('returns a number in [0, 100]', () => {
      const snapshot = engine.toSnapshot();
      const nodeIds = snapshot.nodes.slice(0, 3).map((n) => n.id);
      const score = engine.computeRelevanceScore(nodeIds);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ── toSnapshot ────────────────────────────────────────────────────────────

  describe('toSnapshot', () => {
    it('nodeCount equals actual number of nodes', () => {
      const snapshot = engine.toSnapshot();
      expect(snapshot.nodeCount).toBe(snapshot.nodes.length);
    });

    it('edgeCount equals actual number of edges', () => {
      const snapshot = engine.toSnapshot();
      expect(snapshot.edgeCount).toBe(snapshot.edges.length);
    });

    it('capturedAt is a Date', () => {
      expect(engine.toSnapshot().capturedAt).toBeInstanceOf(Date);
    });
  });
});
