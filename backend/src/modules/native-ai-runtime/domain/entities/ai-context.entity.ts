/**
 * AiContext — captures the caller's identity and tenant scope for a single
 * AI runtime operation.  Created by AiContextManagerService at the start of
 * every request and destroyed when the request completes.
 */
export interface AiContext {
  /** UUID v4 assigned at creation. */
  readonly contextId: string;
  readonly tenantId: string;
  readonly userId: string;
  /** Caller's primary role (sheikh | student | parent | supervisor | admin). */
  readonly role: string;
  /** Present when the operation is scoped to a specific student. */
  readonly studentId?: string;
  /** AI session this context belongs to. */
  readonly sessionId: string;
  readonly requestedAt: Date;
  /** Free-form bag for pipeline steps to attach intermediate data. */
  metadata: Record<string, unknown>;
}
