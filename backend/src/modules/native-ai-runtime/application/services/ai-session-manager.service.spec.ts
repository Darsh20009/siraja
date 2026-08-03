import { AiSessionManagerService } from './ai-session-manager.service';

describe('AiSessionManagerService', () => {
  let manager: AiSessionManagerService;

  beforeEach(() => {
    manager = new AiSessionManagerService();
  });

  // ── createSession ─────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('creates a session with the correct tenantId and userId', () => {
      const session = manager.createSession('tenant1', 'user1');
      expect(session.tenantId).toBe('tenant1');
      expect(session.userId).toBe('user1');
    });

    it('returns an "active" session', () => {
      expect(manager.createSession('t', 'u').status).toBe('active');
    });

    it('starts with operationCount = 0', () => {
      expect(manager.createSession('t', 'u').operationCount).toBe(0);
    });

    it('generates unique sessionIds', () => {
      const s1 = manager.createSession('t', 'u');
      const s2 = manager.createSession('t', 'u');
      expect(s1.sessionId).not.toBe(s2.sessionId);
    });
  });

  // ── getSession ────────────────────────────────────────────────────────────

  describe('getSession', () => {
    it('retrieves a created session by id', () => {
      const session = manager.createSession('t', 'u');
      expect(manager.getSession(session.sessionId)).toBe(session);
    });

    it('returns undefined for an unknown sessionId', () => {
      expect(manager.getSession('ghost_id')).toBeUndefined();
    });
  });

  // ── updateActivity ────────────────────────────────────────────────────────

  describe('updateActivity', () => {
    it('increments operationCount', () => {
      const session = manager.createSession('t', 'u');
      manager.updateActivity(session.sessionId, 'analyze');
      manager.updateActivity(session.sessionId, 'analyze');
      expect(session.operationCount).toBe(2);
    });

    it('tracks operation type in features', () => {
      const session = manager.createSession('t', 'u');
      manager.updateActivity(session.sessionId, 'risk_compute');
      expect(session.features['risk_compute']).toBe(1);
    });

    it('is a no-op for an unknown sessionId', () => {
      expect(() => manager.updateActivity('ghost', 'op')).not.toThrow();
    });
  });

  // ── closeSession ──────────────────────────────────────────────────────────

  describe('closeSession', () => {
    it('marks the session as closed', () => {
      const session = manager.createSession('t', 'u');
      manager.closeSession(session.sessionId);
      expect(session.status).toBe('closed');
    });
  });

  // ── getActiveSessions ─────────────────────────────────────────────────────

  describe('getActiveSessions', () => {
    it('returns sessions for the specified tenant only', () => {
      manager.createSession('tenant_a', 'u1');
      manager.createSession('tenant_b', 'u2');
      const sessions = manager.getActiveSessions('tenant_a');
      expect(sessions.every((s) => s.tenantId === 'tenant_a')).toBe(true);
    });

    it('excludes closed sessions', () => {
      const session = manager.createSession('t', 'u');
      manager.closeSession(session.sessionId);
      expect(manager.getActiveSessions('t')).toHaveLength(0);
    });
  });

  // ── getSessionStats ───────────────────────────────────────────────────────

  describe('getSessionStats', () => {
    it('reports correct totalSessions', () => {
      manager.createSession('t', 'u');
      manager.createSession('t', 'u');
      const stats = manager.getSessionStats('t');
      expect(stats.totalSessions).toBe(2);
    });

    it('calculates averageOperationsPerSession correctly', () => {
      const s1 = manager.createSession('t', 'u');
      manager.updateActivity(s1.sessionId, 'op');
      manager.updateActivity(s1.sessionId, 'op');
      manager.createSession('t', 'u'); // 0 ops
      const stats = manager.getSessionStats('t');
      expect(stats.averageOperationsPerSession).toBe(1); // (2 + 0) / 2
    });
  });
});
