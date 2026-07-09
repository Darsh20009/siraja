/**
 * Resource types that resource-ownership validation can be checked
 * against (see `common/guards/resource-ownership.guard.ts` and
 * `core/domain/authorization/ownership-resolver.interface.ts`).
 *
 * Deliberately a subset of `PermissionCategory` — only resources that
 * have a meaningful "who owns/may touch this specific instance" rule
 * need an entry here (e.g. `billing`/`settings` are gated by permission
 * + tenant scope alone, never by per-instance ownership).
 */
export enum ResourceType {
  USER = 'user',
  STUDENT = 'student',
  PARENT = 'parent',
  SHEIKH = 'sheikh',
  SUPERVISOR = 'supervisor',
  GROUP = 'group',
  SESSION = 'session',
  ATTENDANCE = 'attendance',
  MEMORIZATION_RECORD = 'memorization_record',
  REVIEW_RECORD = 'review_record',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
}
