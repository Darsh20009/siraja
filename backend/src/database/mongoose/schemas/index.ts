/**
 * Barrel export of every Mongoose schema in the Siraja database.
 * Structure only — no services/repositories/controllers here.
 *
 * Intended consumption (when a module is implemented):
 *   MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
 * or via `mongooseModels` in `./models.ts` for bulk registration.
 */

export * from './base.schema';
export * from './base-global.schema';

// Identity & access
export * from './tenant.schema';
export * from './tenant-settings.schema';
export * from './user.schema';
export * from './role.schema';
export * from './permission.schema';
export * from './user-permission.schema';

// Auth & sessions (Phase 4)
export * from './refresh-token.schema';
export * from './device.schema';
export * from './verification-token.schema';
export * from './password-history.schema';
export * from './login-attempt.schema';

// People
export * from './student.schema';
export * from './parent.schema';
export * from './sheikh.schema';
export * from './supervisor.schema';

// Academic structure
export * from './group.schema';
export * from './session.schema';
export * from './attendance.schema';

// Quran progress
export * from './memorization-record.schema';
export * from './review-record.schema';
export * from './quran-mistake.schema';
export * from './exam.schema';
export * from './assignment.schema';

// Communication
export * from './notification.schema';
export * from './push-subscription.schema';
export * from './support-ticket.schema';
export * from './support-message.schema';

// Billing
export * from './subscription.schema';
export * from './plan.schema';
export * from './payment.schema';
export * from './transaction.schema';

// Gamification
export * from './achievement.schema';
export * from './badge.schema';

// AI (Phase 11 — AI Learning Intelligence Architecture)
export * from './ai-request.schema';
export * from './ai-report.schema';
export * from './ai-usage-ledger.schema';

// Platform observability
export * from './audit-log.schema';
export * from './activity-log.schema';
export * from './system-settings.schema';

// People Domain (Phase 6) — assignment history
export * from './student-enrollment.schema';

// Memorization & Review Engine (Phase 7)
export * from './student-progress.schema';

// Attendance, Exams, Assignments & Reporting Engine (Phase 8)
export * from './assessment.schema';

// Quran Foundation Engine (Phase 5) — surahs/ayahs/tafsir/metadata are
// platform-global reference content; bookmarks/last-read/notes are
// tenant + user scoped personal data.
export * from './surah.schema';
export * from './ayah.schema';
export * from './juz.schema';
export * from './quran-page.schema';
export * from './tafsir.schema';
export * from './quran-bookmark.schema';
export * from './quran-last-read.schema';
export * from './quran-note.schema';

// Smart Mushaf Engine (Phase 9) — per-ayah performance/heatmap and
// teacher-authored ayah notes. Mistakes overlay and the heatmap view
// reuse the Phase 7 `quran_mistakes` collection and this module's own
// `ayah_performance` collection respectively — no schema of their own.
export * from './ayah-performance.schema';
export * from './ayah-note.schema';

// Communication & Notification Platform (Phase 10)
export * from './notification-template.schema';
export * from './message-thread.schema';
export * from './message.schema';
export * from './announcement.schema';
export * from './user-preferences.schema';


// Gamification, Rewards & Engagement (Phase 12D)
export * from './gamification-config.schema';
export * from './point-transaction.schema';
export * from './student-points.schema';
export * from './streak.schema';
export * from './achievement-definition.schema';
export * from './student-achievement.schema';
export * from './badge-definition.schema';
export * from './student-badge.schema';
export * from './leaderboard-entry.schema';
export * from './reward-rule.schema';
