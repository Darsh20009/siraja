/**
 * StudentTimeline — longitudinal sequence of AI-annotated learning events
 * for a single student.
 */
export type TimelineEventType =
  | 'memorization_session'
  | 'review_session'
  | 'mistake_detected'
  | 'milestone_reached'
  | 'risk_flag_raised'
  | 'recommendation_issued'
  | 'adaptive_plan_generated'
  | 'absence_detected'
  | 'tajweed_improvement'
  | 'tajweed_regression';

export type TimelineEventSignificance = 'low' | 'medium' | 'high';

export interface StudentTimelineEvent {
  readonly eventId: string;
  readonly studentId: string;
  readonly tenantId: string;
  readonly type: TimelineEventType;
  readonly timestamp: Date;
  /** Domain-specific payload; shape varies per event type. */
  readonly data: Record<string, unknown>;
  /** Optional plain-language AI annotation attached to this event. */
  aiAnnotation?: string;
  readonly significance: TimelineEventSignificance;
}

export interface StudentTimeline {
  readonly studentId: string;
  readonly tenantId: string;
  readonly events: StudentTimelineEvent[];
  /** ISO start of the covered period. */
  readonly periodStart: Date;
  /** ISO end of the covered period. */
  readonly periodEnd: Date;
  /** Total number of events. */
  readonly totalEvents: number;
  /** Counts broken down by event type. */
  readonly eventBreakdown: Partial<Record<TimelineEventType, number>>;
}
