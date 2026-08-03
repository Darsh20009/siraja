import { Injectable } from '@nestjs/common';
import type { AiSession, SessionStats } from '../../domain/entities/ai-session.entity';
import { PipelineRules } from '../../domain/rules/pipeline.rules';

/**
 * AiSessionManagerService — tracks active AI sessions per tenant.
 *
 * Sessions are in-memory; they do not persist across restarts.
 * Idle/closed sessions are evicted lazily when `getActiveSessions` or
 * `createSession` is called.
 */
@Injectable()
export class AiSessionManagerService {
  private readonly sessions = new Map<string, AiSession>();
  private idCounter = 0;

  // ── Session lifecycle ─────────────────────────────────────────────────────

  /** Create a new AI session for the given tenant + user. */
  createSession(tenantId: string, userId: string): AiSession {
    this.evictExpiredSessions(tenantId);

    const sessionId = `sess_${++this.idCounter}_${Date.now()}`;
    const session: AiSession = {
      sessionId,
      tenantId,
      userId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      operationCount: 0,
      status: 'active',
      features: {},
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /** Retrieve a session.  Returns undefined when not found. */
  getSession(sessionId: string): AiSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Record an operation on the session and update its last-activity timestamp.
   * Marks the session as "active" if it was previously "idle".
   */
  updateActivity(sessionId: string, operation: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lastActivityAt = new Date();
    session.operationCount += 1;
    session.status = 'active';
    // Accumulate feature signals from the operation tag
    session.features[operation] = (session.features[operation] ?? 0) + 1;
  }

  /** Mark a session as closed. */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
    }
  }

  /**
   * Return all non-closed sessions for a tenant.
   * Lazily promotes idle sessions and evicts auto-closed ones.
   */
  getActiveSessions(tenantId: string): AiSession[] {
    this.evictExpiredSessions(tenantId);
    return Array.from(this.sessions.values()).filter(
      (s) => s.tenantId === tenantId && s.status !== 'closed',
    );
  }

  /** Aggregate stats across all sessions for a tenant. */
  getSessionStats(tenantId: string): SessionStats {
    const all = Array.from(this.sessions.values()).filter(
      (s) => s.tenantId === tenantId,
    );
    const active = all.filter((s) => s.status === 'active').length;
    const idle = all.filter((s) => s.status === 'idle').length;
    const totalOps = all.reduce((sum, s) => sum + s.operationCount, 0);

    return {
      totalSessions: all.length,
      activeSessions: active,
      idleSessions: idle,
      averageOperationsPerSession: all.length > 0 ? totalOps / all.length : 0,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Mark stale sessions as idle or closed based on last-activity time.
   * Removes closed sessions when the per-tenant cap is exceeded.
   */
  private evictExpiredSessions(tenantId: string): void {
    const now = Date.now();
    for (const session of this.sessions.values()) {
      if (session.tenantId !== tenantId) continue;
      const ageMs = now - session.lastActivityAt.getTime();
      if (session.status === 'active' && ageMs > PipelineRules.SESSION_IDLE_AFTER_MS) {
        session.status = 'idle';
      }
      if (ageMs > PipelineRules.SESSION_CLOSE_AFTER_MS) {
        session.status = 'closed';
      }
    }

    // Evict oldest closed sessions if cap exceeded
    const tenantSessions = Array.from(this.sessions.values())
      .filter((s) => s.tenantId === tenantId)
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

    if (tenantSessions.length > PipelineRules.MAX_SESSIONS_PER_TENANT) {
      const toEvict = tenantSessions.slice(
        0,
        tenantSessions.length - PipelineRules.MAX_SESSIONS_PER_TENANT,
      );
      for (const s of toEvict) {
        this.sessions.delete(s.sessionId);
      }
    }
  }
}
