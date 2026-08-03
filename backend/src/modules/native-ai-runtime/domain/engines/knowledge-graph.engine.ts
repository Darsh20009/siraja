import type {
  KnowledgeEdge,
  KnowledgeGraphSnapshot,
  KnowledgeNode,
  KnowledgeRelation,
} from '../entities/knowledge-graph.entity';

/**
 * KnowledgeGraphEngine — in-memory directed graph of Quran learning concepts.
 *
 * Used to:
 * - Surface prerequisite learning objectives before introducing new material.
 * - Identify which tajweed rules are related to a student's current mistakes.
 * - Compute a relevance score when ranking recommendations.
 *
 * Seeded with a built-in Quran taxonomy at construction time;
 * callers may add tenant-specific nodes afterwards.
 *
 * Pure class: no NestJS metadata, no side effects, no I/O.
 */
export class KnowledgeGraphEngine {
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly adjacency = new Map<string, KnowledgeEdge[]>();

  constructor() {
    this.buildQuranKnowledgeGraph();
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  addEdge(edge: KnowledgeEdge): void {
    if (!this.adjacency.has(edge.from)) {
      this.adjacency.set(edge.from, []);
    }
    this.adjacency.get(edge.from)!.push(edge);
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  getNeighbors(id: string, relation?: KnowledgeRelation): KnowledgeNode[] {
    const edges = this.adjacency.get(id) ?? [];
    const filtered = relation ? edges.filter((e) => e.relation === relation) : edges;
    return filtered.map((e) => this.nodes.get(e.to)).filter((n): n is KnowledgeNode => n !== undefined);
  }

  /**
   * BFS shortest path from `from` to `to`.  Returns an empty array when no
   * path exists.
   */
  findPath(from: string, to: string): KnowledgeNode[] {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return [];
    if (from === to) return [this.nodes.get(from)!];

    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: from, path: [from] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const edges = this.adjacency.get(id) ?? [];
      for (const edge of edges) {
        const nextPath = [...path, edge.to];
        if (edge.to === to) {
          return nextPath.map((nodeId) => this.nodes.get(nodeId)!).filter(Boolean);
        }
        if (!visited.has(edge.to)) {
          queue.push({ id: edge.to, path: nextPath });
        }
      }
    }
    return [];
  }

  /** Get all nodes connected to `nodeId` via a specific relation (1-hop). */
  getRelated(nodeId: string, relation: KnowledgeRelation): KnowledgeNode[] {
    return this.getNeighbors(nodeId, relation);
  }

  /**
   * Compute a relevance score 0–100 for a set of node ids.
   * Nodes with more incoming edges (higher in-degree) are considered more central.
   */
  computeRelevanceScore(nodeIds: string[]): number {
    if (nodeIds.length === 0) return 0;

    const inDegree = new Map<string, number>();
    for (const edges of this.adjacency.values()) {
      for (const edge of edges) {
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      }
    }

    const maxDegree = Math.max(...Array.from(inDegree.values()), 1);
    const totalScore = nodeIds.reduce((sum, id) => sum + (inDegree.get(id) ?? 0), 0);
    return Math.min(100, Math.round((totalScore / (nodeIds.length * maxDegree)) * 100));
  }

  /** Snapshot the current graph state (nodes + edges). */
  toSnapshot(): KnowledgeGraphSnapshot {
    const edges: KnowledgeEdge[] = [];
    for (const edgeList of this.adjacency.values()) {
      edges.push(...edgeList);
    }
    return {
      nodes: Array.from(this.nodes.values()),
      edges,
      nodeCount: this.nodes.size,
      edgeCount: edges.length,
      capturedAt: new Date(),
    };
  }

  // ── Seed: built-in Quran taxonomy ─────────────────────────────────────────

  /**
   * Seeds the graph with a core Quran learning taxonomy:
   * - Difficulty tiers (easy → advanced)
   * - Core tajweed concepts and their prerequisites
   * - Key mistake patterns and the tajweed rules they relate to
   */
  buildQuranKnowledgeGraph(): void {
    // Difficulty tiers
    this.addNode({ id: 'tier.beginner', type: 'difficulty_tier', label: 'Beginner', attributes: { level: 1 } });
    this.addNode({ id: 'tier.intermediate', type: 'difficulty_tier', label: 'Intermediate', attributes: { level: 2 } });
    this.addNode({ id: 'tier.advanced', type: 'difficulty_tier', label: 'Advanced', attributes: { level: 3 } });

    this.addEdge({ from: 'tier.beginner', to: 'tier.intermediate', relation: 'precedes', weight: 1.0 });
    this.addEdge({ from: 'tier.intermediate', to: 'tier.advanced', relation: 'precedes', weight: 1.0 });

    // Core tajweed concepts
    const tajweedConcepts: Array<[string, string]> = [
      ['tajweed.makharij', 'Makhārij al-Ḥurūf (Letter Articulation)'],
      ['tajweed.sifaat', 'Ṣifāt al-Ḥurūf (Letter Attributes)'],
      ['tajweed.noon_rules', 'Noon & Tanwīn Rules'],
      ['tajweed.meem_rules', 'Meem Sākin Rules'],
      ['tajweed.madd', 'Madd (Prolongation)'],
      ['tajweed.qalqala', 'Qalqala (Echo)'],
      ['tajweed.tafkhim_tarqiq', 'Tafkhīm & Tarqīq (Heavy/Light)'],
      ['tajweed.waqf_ibtida', 'Waqf & Ibtidā (Pause & Start)'],
    ];

    for (const [id, label] of tajweedConcepts) {
      this.addNode({ id, type: 'tajweed_rule', label, attributes: {} });
    }

    // Prerequisites: makharij and sifaat must precede all other rules
    for (const [id] of tajweedConcepts.slice(2)) {
      this.addEdge({ from: 'tajweed.makharij', to: id, relation: 'requires', weight: 0.8 });
      this.addEdge({ from: 'tajweed.sifaat', to: id, relation: 'requires', weight: 0.7 });
    }

    // Noon rules relate to meem rules
    this.addEdge({ from: 'tajweed.noon_rules', to: 'tajweed.meem_rules', relation: 'related_to', weight: 0.6 });
    // Qalqala relates to tafkhim
    this.addEdge({ from: 'tajweed.qalqala', to: 'tajweed.tafkhim_tarqiq', relation: 'related_to', weight: 0.5 });

    // Common mistake patterns
    const mistakePatterns: Array<[string, string, string]> = [
      ['mistake.word_substitution', 'Word Substitution', 'tajweed.makharij'],
      ['mistake.elongation_error', 'Elongation Error', 'tajweed.madd'],
      ['mistake.nasalization_error', 'Nasalization Error', 'tajweed.noon_rules'],
      ['mistake.tajweed_violation', 'Tajweed Violation', 'tajweed.makharij'],
      ['mistake.omission', 'Word Omission', 'tajweed.waqf_ibtida'],
    ];

    for (const [id, label, relatedTajweed] of mistakePatterns) {
      this.addNode({ id, type: 'mistake_pattern', label, attributes: {} });
      this.addEdge({ from: id, to: relatedTajweed, relation: 'related_to', weight: 0.9 });
    }

    // Learning objectives
    this.addNode({ id: 'obj.consistent_pace', type: 'learning_objective', label: 'Maintain consistent weekly pace', attributes: {} });
    this.addNode({ id: 'obj.review_discipline', type: 'learning_objective', label: 'Regular spaced review', attributes: {} });
    this.addNode({ id: 'obj.tajweed_mastery', type: 'learning_objective', label: 'Tajweed rule mastery', attributes: {} });

    this.addEdge({ from: 'obj.review_discipline', to: 'obj.consistent_pace', relation: 'reinforces', weight: 0.8 });
    this.addEdge({ from: 'obj.tajweed_mastery', to: 'obj.consistent_pace', relation: 'reinforces', weight: 0.7 });
  }
}
