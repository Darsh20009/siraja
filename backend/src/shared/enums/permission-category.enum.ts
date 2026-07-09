/**
 * Permission categories — the resource domains that permissions are
 * scoped to. Mirrors the aggregates established in Phase 2's database
 * blueprint, plus cross-cutting categories (reports, settings, ai).
 */
export enum PermissionCategory {
  USERS = 'users',
  STUDENTS = 'students',
  PARENTS = 'parents',
  SHEIKHS = 'sheikhs',
  SUPERVISORS = 'supervisors',
  GROUPS = 'groups',
  SESSIONS = 'sessions',
  ATTENDANCE = 'attendance',
  MEMORIZATION = 'memorization',
  REVIEWS = 'reviews',
  EXAMS = 'exams',
  ASSIGNMENTS = 'assignments',
  NOTIFICATIONS = 'notifications',
  REPORTS = 'reports',
  SUPPORT = 'support',
  BILLING = 'billing',
  AI = 'ai',
  SETTINGS = 'settings',
}
