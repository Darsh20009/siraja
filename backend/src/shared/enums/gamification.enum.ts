/**
 * Gamification, Rewards & Engagement — Phase 12D enums.
 * All values are stored as strings in MongoDB.
 */

/** Activities that generate points for a student. */
export enum PointActivityType {
  MEMORIZATION_COMPLETION = 'memorization_completion',
  REVISION_COMPLETION = 'revision_completion',
  ATTENDANCE = 'attendance',
  EXAM_SUCCESS = 'exam_success',
  DAILY_STREAK = 'daily_streak',
  WEEKLY_STREAK = 'weekly_streak',
  MONTHLY_STREAK = 'monthly_streak',
  AI_SESSION = 'ai_session',
  COMMUNITY_PARTICIPATION = 'community_participation',
}

/** Predefined achievement types seeded per tenant. */
export enum AchievementType {
  FIRST_MEMORIZATION = 'first_memorization',
  FIRST_KHATMAH = 'first_khatmah',
  STREAK_7_DAYS = 'streak_7_days',
  STREAK_30_DAYS = 'streak_30_days',
  STREAK_100_DAYS = 'streak_100_days',
  PERFECT_ATTENDANCE = 'perfect_attendance',
  REVISION_CHAMPION = 'revision_champion',
  MEMORIZATION_CHAMPION = 'memorization_champion',
  TEACHER_CHOICE_AWARD = 'teacher_choice_award',
}

/** Badge rarity / prestige tier. */
export enum BadgeTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

/** How a badge is awarded. */
export enum BadgeType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  SEASONAL = 'seasonal',
  EVENT_BASED = 'event_based',
}

/** Entity type for a leaderboard entry. */
export enum LeaderboardEntityType {
  STUDENT = 'student',
  CIRCLE = 'circle',
  SHEIKH = 'sheikh',
  TENANT = 'tenant',
}

/** Time window for leaderboard rankings. */
export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ALL_TIME = 'all_time',
}

/** Age group buckets — drive frontend UX adaptations. */
export enum AgeGroup {
  CHILD = 'child',   // < 13
  TEEN = 'teen',     // 13–17
  ADULT = 'adult',   // 18–59
  SENIOR = 'senior', // 60+
}

/** The condition type of a configurable reward rule. */
export enum RewardRuleConditionType {
  ATTENDANCE_DAYS = 'attendance_days',
  MEMORIZATION_POINTS = 'memorization_points',
  REVISION_POINTS = 'revision_points',
  TOTAL_POINTS = 'total_points',
  STREAK_DAYS = 'streak_days',
  ACHIEVEMENT_COUNT = 'achievement_count',
  BADGE_COUNT = 'badge_count',
}

/**
 * Badge / achievement category (used in badge.schema for display grouping).
 * Kept separate from AchievementType intentionally — type = unique identity,
 * category = broad display group.
 */
export enum AchievementCategory {
  MEMORIZATION = 'memorization',
  ATTENDANCE = 'attendance',
  STREAK = 'streak',
  REVISION = 'revision',
  SPECIAL = 'special',
}

/** The action a reward rule takes when its condition is met. */
export enum RewardRuleActionType {
  AWARD_BADGE = 'award_badge',
  AWARD_ACHIEVEMENT = 'award_achievement',
  AWARD_POINTS = 'award_points',
}
