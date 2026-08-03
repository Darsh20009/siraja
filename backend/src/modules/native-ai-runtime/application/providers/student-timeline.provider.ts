import { Injectable } from '@nestjs/common';
import type {
  StudentTimeline,
  StudentTimelineEvent,
  TimelineEventType,
  TimelineEventSignificance,
} from '../../domain/entities/student-timeline.entity';
import { KnowledgeGraphEngine } from '../../domain/engines/knowledge-graph.engine';
import { PipelineRules } from '../../domain/rules/pipeline.rules';

export interface RawTimelineEvent {
  type: TimelineEventType;
  timestamp: Date;
  data: Record<string, unknown>;
  significance?: TimelineEventSignificance;
}

/**
 * StudentTimelineProvider — builds and AI-annotates a student's learning
 * event timeline.
 *
 * Responsibilities:
 * - Build a StudentTimeline from raw event data.
 * - Annotate significant events with AI-generated observations using the
 *   KnowledgeGraphEngine.
 * - Aggregate event breakdowns for dashboard display.
 *
 * Deterministic, in-process.
 */
@Injectable()
export class StudentTimelineProvider {
  private readonly knowledgeGraph = new KnowledgeGraphEngine();
  private idCounter = 0;

  /**
   * Build a timeline from a raw event list.
   * Events are sorted chronologically; only the most recent
   * MAX_TIMELINE_EVENTS are retained.
   */
  build(
    studentId: string,
    tenantId: string,
    rawEvents: RawTimelineEvent[],
    features: Record<string, number> = {},
  ): StudentTimeline {
    const sorted = [...rawEvents]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-PipelineRules.MAX_TIMELINE_EVENTS);

    const events: StudentTimelineEvent[] = sorted.map((raw) => {
      const event: StudentTimelineEvent = {
        eventId: `evt_${++this.idCounter}_${Date.now()}`,
        studentId,
        tenantId,
        type: raw.type,
        timestamp: raw.timestamp,
        data: raw.data,
        significance: raw.significance ?? this.inferSignificance(raw),
      };
      return event;
    });

    // Annotate significant events with AI observations
    const annotated = this.annotateWithAi(events, features);

    return this.buildTimeline(studentId, tenantId, annotated);
  }

  /**
   * Add a new event to an existing timeline (returns a new timeline object).
   */
  addEvent(
    timeline: StudentTimeline,
    raw: RawTimelineEvent,
    features: Record<string, number> = {},
  ): StudentTimeline {
    const event: StudentTimelineEvent = {
      eventId: `evt_${++this.idCounter}_${Date.now()}`,
      studentId: timeline.studentId,
      tenantId: timeline.tenantId,
      type: raw.type,
      timestamp: raw.timestamp,
      data: raw.data,
      significance: raw.significance ?? this.inferSignificance(raw),
    };

    const [annotatedEvent] = this.annotateWithAi([event], features);
    const updated = [...timeline.events, annotatedEvent]
      .slice(-PipelineRules.MAX_TIMELINE_EVENTS);

    return this.buildTimeline(timeline.studentId, timeline.tenantId, updated);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private annotateWithAi(
    events: StudentTimelineEvent[],
    features: Record<string, number>,
  ): StudentTimelineEvent[] {
    return events.map((event) => {
      if (event.significance !== 'high') return event;
      const annotation = this.generateAnnotation(event, features);
      return { ...event, aiAnnotation: annotation };
    });
  }

  private generateAnnotation(
    event: StudentTimelineEvent,
    features: Record<string, number>,
  ): string {
    const velocity = features['velocity'] ?? 0;
    const retention = features['retentionRate'] ?? 100;

    switch (event.type) {
      case 'milestone_reached':
        return `Milestone achieved with ${velocity.toFixed(1)} ayahs/week pace and ${retention.toFixed(0)}% retention.`;
      case 'risk_flag_raised':
        return `Risk flag raised. Current retention: ${retention.toFixed(0)}%. Immediate review recommended.`;
      case 'tajweed_improvement':
        return `Tajweed improvement detected. Score increased to ${(features['tajweedScore'] ?? 0).toFixed(0)}.`;
      case 'tajweed_regression':
        return `Tajweed regression detected. Score dropped to ${(features['tajweedScore'] ?? 0).toFixed(0)}. Focused practice needed.`;
      case 'absence_detected': {
        const days = features['daysSinceLastSession'] ?? 0;
        return `Session gap of ${days} days detected. Knowledge graph suggests reviewing ${this.getRelatedConcept()}.`;
      }
      default:
        return '';
    }
  }

  private getRelatedConcept(): string {
    const snapshot = this.knowledgeGraph.toSnapshot();
    const obj = snapshot.nodes.find((n) => n.type === 'learning_objective');
    return obj?.label ?? 'previously memorized material';
  }

  private inferSignificance(raw: RawTimelineEvent): TimelineEventSignificance {
    const highSignificanceTypes: TimelineEventType[] = [
      'milestone_reached',
      'risk_flag_raised',
      'tajweed_regression',
    ];
    const mediumSignificanceTypes: TimelineEventType[] = [
      'recommendation_issued',
      'adaptive_plan_generated',
      'absence_detected',
      'tajweed_improvement',
    ];
    if (highSignificanceTypes.includes(raw.type)) return 'high';
    if (mediumSignificanceTypes.includes(raw.type)) return 'medium';
    return 'low';
  }

  private buildTimeline(
    studentId: string,
    tenantId: string,
    events: StudentTimelineEvent[],
  ): StudentTimeline {
    const breakdown: Partial<Record<TimelineEventType, number>> = {};
    for (const e of events) {
      breakdown[e.type] = (breakdown[e.type] ?? 0) + 1;
    }
    const periodStart = events[0]?.timestamp ?? new Date();
    const periodEnd = events[events.length - 1]?.timestamp ?? new Date();

    return {
      studentId,
      tenantId,
      events,
      periodStart,
      periodEnd,
      totalEvents: events.length,
      eventBreakdown: breakdown,
    };
  }
}
