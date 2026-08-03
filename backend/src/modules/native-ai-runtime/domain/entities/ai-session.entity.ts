/**
 * AiSession — tracks a logical user session with the AI runtime.
 * Sessions are in-memory only; they reset on process restart.
 */
export type AiSessionStatus = 'active' | 'idle' | 'closed';

export interface AiSession {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly startedAt: Date;
  lastActivityAt: Date;
  /** Total number of AI operations executed during this session. */
  operationCount: number;
  status: AiSessionStatus;
  /** Accumulated feature deltas built up across operations in this session. */
  features: Record<string, number>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  idleSessions: number;
  averageOperationsPerSession: number;
}
