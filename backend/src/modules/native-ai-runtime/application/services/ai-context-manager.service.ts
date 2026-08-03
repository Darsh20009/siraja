import { Injectable } from '@nestjs/common';
import type { AiContext } from '../../domain/entities/ai-context.entity';

/**
 * AiContextManagerService — creates, stores, and destroys per-request AI
 * contexts that carry tenant/user identity through the pipeline.
 *
 * Contexts are in-memory only; they reset on process restart.
 * The owning controller or use-case must call `destroy()` after the
 * request completes to avoid unbounded memory growth.
 */
@Injectable()
export class AiContextManagerService {
  private readonly contexts = new Map<string, AiContext>();
  private idCounter = 0;

  /**
   * Create a new AiContext and store it in the in-memory registry.
   *
   * @param tenantId   - Caller's tenant.
   * @param userId     - Authenticated user's sub claim.
   * @param role       - Primary role (sheikh | student | parent | admin …).
   * @param sessionId  - AI session this context belongs to.
   * @param studentId  - Present when the operation targets a specific student.
   */
  create(
    tenantId: string,
    userId: string,
    role: string,
    sessionId: string,
    studentId?: string,
  ): AiContext {
    const contextId = `ctx_${++this.idCounter}_${Date.now()}`;
    const context: AiContext = {
      contextId,
      tenantId,
      userId,
      role,
      studentId,
      sessionId,
      requestedAt: new Date(),
      metadata: {},
    };
    this.contexts.set(contextId, context);
    return context;
  }

  /** Retrieve a context by id.  Returns undefined when not found. */
  get(contextId: string): AiContext | undefined {
    return this.contexts.get(contextId);
  }

  /** Merge additional metadata into an existing context. */
  update(contextId: string, metadata: Record<string, unknown>): void {
    const ctx = this.contexts.get(contextId);
    if (ctx) {
      Object.assign(ctx.metadata, metadata);
    }
  }

  /**
   * Remove the context from memory.  Should be called at the end of every
   * request to prevent leaks.
   */
  destroy(contextId: string): void {
    this.contexts.delete(contextId);
  }

  /** Current number of live contexts (diagnostic / test helper). */
  get size(): number {
    return this.contexts.size;
  }
}
