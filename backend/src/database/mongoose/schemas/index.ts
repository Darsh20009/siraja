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

// AI
export * from './ai-request.schema';
export * from './ai-report.schema';

// Platform observability
export * from './audit-log.schema';
export * from './activity-log.schema';
export * from './system-settings.schema';
