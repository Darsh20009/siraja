# Siraja Intelligence Platform — Phase 13A Architecture

## Overview

Phase 13A adds a fully local, rule-based intelligence layer to the Siraja backend.
**No external AI services are called.** Every computation is deterministic TypeScript
running in-process, derived exclusively from data already in the platform's own
MongoDB collections.

---

## Guiding Principle

> *"Local intelligence over external dependency."*

The platform has rich, structured data (memorization records, review records, SM-2
performance, attendance, mistake logs). Phase 13A extracts actionable intelligence
from this data without shipping it to an LLM or calling any third-party endpoint.
This means:

- **Zero API cost** per intelligence request.
- **Zero latency penalty** from external network round-trips.
- **Full explainability** — every score and recommendation has a named rule key.
- **Privacy by default** — student data never leaves the server.

---

## Module Structure

```
src/modules/intelligence/
├── domain/
│   ├── entities/                     # Output type interfaces (no decorators)
│   │   ├── student-intelligence-profile.entity.ts
│   │   ├── intelligence-recommendation.entity.ts
│   │   ├── parent-insight.entity.ts
│   │   └── sheikh-insight.entity.ts
│   ├── rules/                        # Tunable threshold constants (all frozen)
│   │   ├── memorization.rules.ts
│   │   ├── revision.rules.ts
│   │   ├── tajweed.rules.ts
│   │   └── attendance.rules.ts
│   └── engines/                      # Pure computation classes (no NestJS deps)
│       ├── memorization.engine.ts
│       ├── revision.engine.ts
│       ├── mistake.engine.ts
│       ├── difficulty.engine.ts
│       ├── forecast.engine.ts
│       ├── student-profile.engine.ts
│       ├── recommendation.engine.ts
│       └── analytics.engine.ts
├── application/
│   ├── use-cases/                    # Orchestrate fetch + engines
│   │   ├── get-student-intelligence-profile.use-case.ts
│   │   ├── get-student-recommendations.use-case.ts
│   │   ├── get-student-intelligence-forecast.use-case.ts
│   │   ├── get-parent-insights.use-case.ts
│   │   └── get-sheikh-insights.use-case.ts
│   └── dtos/                         # @ApiProperty-annotated response shapes
│       ├── student-intelligence-profile.dto.ts
│       ├── recommendation.dto.ts
│       ├── intelligence-forecast.dto.ts
│       ├── parent-insight.dto.ts
│       └── sheikh-insight.dto.ts
├── infrastructure/
│   └── controllers/
│       ├── intelligence.controller.ts          # /intelligence/students/:id/*
│       ├── parent-intelligence.controller.ts   # /intelligence/parents/:id/insights
│       └── sheikh-intelligence.controller.ts   # /intelligence/sheikhs/:id/insights
└── intelligence.module.ts
```

---

## Computation Engine Graph

```
Memorization Records   ──→  MemorizationEngine   ──→  MemorizationAnalysis
Review Records         ──→  RevisionEngine        ──→  RevisionAnalysis
AyahPerformance (SM-2) ──→  RevisionEngine (sm2)  ──┘
Mistake Records        ──→  MistakeEngine         ──→  MistakeAnalysis
All Above              ──→  DifficultyEngine      ──→  DifficultyAnalysis
All Above + Attendance ──→  StudentProfileEngine  ──→  StudentIntelligenceProfile
StudentProfile + All   ──→  RecommendationEngine  ──→  IntelligenceRecommendation[]
[N] StudentProfiles    ──→  AnalyticsEngine       ──→  ClassAnalytics
Pace + SM-2            ──→  ForecastEngine        ──→  IntelligenceForecast
```

---

## Computed Scores Reference

| Field | Engine | Description |
|---|---|---|
| `memorizationScore` | MemorizationEngine | 40% grade quality, 35% pace vs target, 25% consistency |
| `revisionScore` | RevisionEngine | 45% retention grade, 30% frequency, 25% overdue penalty |
| `consistencyScore` | StudentProfileEngine | activeDaysLast30 / 30 × 100 |
| `attendanceScore` | StudentProfileEngine | Step-function from AttendanceRules thresholds |
| `difficultyIndex` | DifficultyEngine | 45% grade, 30% SM-2 EF, 25% mistake rate |
| `forgettingRisk` | RevisionEngine | overdueCount / totalMemorized ratio |
| `bestMemorizationTime` | StudentProfileEngine | Hour distribution of evaluatedAt timestamps |
| `bestRevisionTime` | StudentProfileEngine | Hour distribution of reviewedAt timestamps |
| `learningSpeed` | StudentProfileEngine | totalAyahsMemorized / totalSessions |
| `retentionRate` | StudentProfileEngine | ayahsWithMastery≥60 / totalAyahPerformanceRecords |

---

## API Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/intelligence/students/:id/profile` | `intelligence.read` | Full 10-score profile |
| GET | `/intelligence/students/:id/recommendations` | `intelligence.read` | Up to 8 ranked recommendations |
| GET | `/intelligence/students/:id/forecast` | `intelligence.read` | Completion forecast with revision burden |
| GET | `/intelligence/parents/:id/insights` | `intelligence.read` | All linked children summary |
| GET | `/intelligence/sheikhs/:id/insights` | `intelligence.read` | Class-level analytics |

---

## RBAC Mapping

| Role | Profile | Recommendations | Forecast | Parent Insights | Sheikh Insights |
|---|---|---|---|---|---|
| STUDENT | Own only | Own only | Own only | — | — |
| PARENT | Own children | Own children | Own children | Own children | — |
| SHEIKH | Assigned students | Assigned | Assigned | — | Own class |
| SUPERVISOR | Any | Any | Any | Any | Any |
| TENANT_ADMIN | Any | Any | Any | Any | Any |

---

## RecommendationEngine Rule Catalogue

| triggeredBy | Priority | Fires When |
|---|---|---|
| `tajweed.critical_open_mistakes` | high | ≥3 critical open mistakes |
| `revision.high_forgetting_risk` | high | forgettingRisk = 'high' |
| `revision.high_burden` | high | revisionBurdenScore ≥ 60 |
| `attendance.critical_rate` | high | attendanceScore ≤ 15 |
| `memorization.inactivity` | high | activeDaysLast30 = 0 AND ayahs > 0 |
| `revision.medium_forgetting_risk` | medium | forgettingRisk = 'medium' |
| `memorization.low_consistency` | medium | activeDaysLast30 < 20 |
| `memorization.below_target_pace` | medium | dailyPace > 0 AND < target(5) |
| `revision.low_frequency` | medium | sessionsPerWeek < 3 |
| `tajweed.recurring_pattern` | medium | same type ≥ 3 times |
| `attendance.low_rate` | medium | attendanceScore = LOW and > CRITICAL |
| `memorization.excellent_pace` | low | pace ≥ excellent AND no high risks |
| `memorization.declining_trend` | low | trend = 'declining' |
| `profile.ready_to_advance` | low | memScore ≥ 75, revScore ≥ 65, low risk |

---

## Tuning Rules

All engine thresholds live in `domain/rules/`. They are `Object.freeze()` constants —
changing a rule propagates through all engines that import it without touching engine
logic. Educators can adjust values without modifying algorithmic code.

---

## No External AI Guarantee

A global grep confirms there are no calls to OpenAI, Anthropic, Gemini, Groq,
Moonshot, DeepSeek, or any HTTP client in the intelligence module. The only
external I/O performed by use cases is MongoDB reads via existing repositories —
the same repositories used throughout the platform.
