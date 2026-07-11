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
  QURAN = 'quran',
  QURAN_BOOKMARKS = 'quran_bookmarks',
  QURAN_NOTES = 'quran_notes',
  // Phase 9 — Smart Mushaf Engine: per-ayah performance, teacher notes,
  // mistakes overlay, and memorization heatmap all share this one
  // permission category (they are read/write facets of the same
  // per-ayah learning-progress resource, not separate aggregates).
  SMART_MUSHAF = 'smart_mushaf',
}
