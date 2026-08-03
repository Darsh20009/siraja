/**
 * KnowledgeGraph domain entities — in-memory concept graph used by the
 * KnowledgeGraphEngine to store and traverse Quran learning relationships.
 */
export type KnowledgeNodeType =
  | 'concept'
  | 'tajweed_rule'
  | 'mistake_pattern'
  | 'surah_group'
  | 'difficulty_tier'
  | 'learning_objective';

export interface KnowledgeNode {
  readonly id: string;
  readonly type: KnowledgeNodeType;
  readonly label: string;
  readonly attributes: Record<string, unknown>;
}

export type KnowledgeRelation =
  | 'requires'       // A must be learned before B
  | 'related_to'     // general semantic relatedness
  | 'conflicts_with' // mistakes in A often appear in B
  | 'reinforces'     // practising A strengthens B
  | 'part_of'        // A is a component of B
  | 'precedes';      // A appears before B in the Quran

export interface KnowledgeEdge {
  readonly from: string;
  readonly to: string;
  readonly relation: KnowledgeRelation;
  /** Strength 0–1; higher = stronger relationship. */
  readonly weight: number;
}

export interface KnowledgeGraphSnapshot {
  readonly nodes: KnowledgeNode[];
  readonly edges: KnowledgeEdge[];
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly capturedAt: Date;
}
