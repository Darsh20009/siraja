# Siraja Intelligence Platform — Architecture

**Phase 13A: Local Rule-Based Intelligence Layer**

> All computation is deterministic TypeScript running in-process. No external AI service, no LLM, no network call is made. The platform is advisory-only: intelligence outputs never mutate authoritative data.

---

## 1. Overview

The Intelligence Platform is a read-only layer that aggregates data from existing Siraja modules and produces actionable diagnostics, recommendations, and forecasts. It is implemented as an independent `IntelligenceModule` that imports repositories from other modules without exporting any write paths.

### Design goals

| Goal | Implementation |
|------|----------------|
| No external AI | Pure TypeScript engines; rule constants in `domain/rules/` |
| Explainability | Every recommendation carries a `triggeredBy` rule key |
| Testability | All engines are plain classes with zero NestJS dependency |
| SOLID / DDD | Domain layer has no infrastructure imports |
| Advisory-only | Use cases are read-only; no repository write calls |
| RBAC-safe | Ownership enforced per-use-case (not only at controller level) |

---

## 2. Module structure

```
src/modules/intelligence/
├── domain/
│   ├── engines/          Pure computation classes
│   │   ├── memorization.engine.ts
│   │   ├── revision.engine.ts
│   │   ├── mistake.engine.ts
│   │   ├── difficulty.engine.ts
│   │   ├── forecast.engine.ts
│   │   ├── analytics.engine.ts
│   │   ├── recommendation.engine.ts
│   │   └── student-profile.engine.ts
│   ├── rules/            Tunable threshold constants
│   │   ├── memorization.rules.ts
│   │   ├── revision.rules.ts
│   │   ├── attendance.rules.ts
│   │   └── tajweed.rules.ts
│   └── entities/         Output type interfaces
│       ├── student-intelligence-profile.entity.ts
│       ├── intelligence-recommendation.entity.ts
│       ├── parent-insight.entity.ts
│       └── sheikh-insight.entity.ts
├── application/
│   ├── use-cases/        Orchestrate repos + engines
│   │   ├── get-student-intelligence-profile.use-case.ts
│   │   ├── get-student-recommendations.use-case.ts
│   │   ├── get-student-intelligence-forecast.use-case.ts
│   │   ├── get-parent-insights.use-case.ts
│   │   └── get-sheikh-insights.use-case.ts
│   └── dtos/             Swagger-annotated HTTP response shapes
│       ├── student-intelligence-profile.dto.ts
│       ├── recommendation.dto.ts
│       ├── intelligence-forecast.dto.ts
│       ├── parent-insight.dto.ts
│       └── sheikh-insight.dto.ts
├── infrastructure/
│   └── controllers/
│       ├── intelligence.controller.ts          /intelligence/students/:id
│       ├── parent-intelligence.controller.ts   /intelligence/parents/:id
│       └── sheikh-intelligence.controller.ts   /intelligence/sheikhs/:id
└── intelligence.module.ts
```

---

## 3. Clean Architecture layers

```
HTTP request
    │
    ▼
[Controller]           infrastructure/  — HTTP parsing, DTO mapping, auth decorators
    │
    ▼
[Use Case]             application/     — RBAC ownership check, repo fan-out, engine orchestration
    │ injects
    ├── [Repository interfaces]         — from imported modules (read-only calls)
    │
    ▼
[Domain Engines]       domain/engines/  — pure functions, no NestJS, no I/O
    │ read
    └── [Domain Rules]  domain/rules/   — static constants, tunable by educators
```

The domain layer has **zero** imports from NestJS or Mongoose. All engines are instantiated with `new Engine()` inside use cases — they are not registered as providers, so they do not appear in the NestJS DI graph. This makes them trivially unit-testable and keeps the DI container lean.

---

## 4. Engines

### 4.1 MemorizationEngine

**Input:** `MemorizationSessionData[]` — one entry per approved memorization record.

**Output:** `MemorizationAnalysis`

**Key computations:**
- `memorizationScore` — weighted composite: `0.40 × gradeQuality + 0.35 × pace + 0.25 × consistency`
- `trend` — compares ayahs/day in the most recent 14 days vs the preceding 14 days; `>10% improvement → improving`, `>10% decline → declining`
- `bestHour` — the hour-of-day bucket with the most evaluations (infers peak performance window)
- `bestDayOfWeek` — day-of-week bucket with most sessions

**Grade weights:** EXCELLENT=100, VERY_GOOD=85, GOOD=70, ACCEPTABLE=55, WEAK=30, ungraded=60 (neutral)

---

### 4.2 RevisionEngine

**Input:** `RevisionSessionData[]`, `AyahSm2Data[]`, `totalAyahsMemorized`

**Output:** `RevisionAnalysis`

**Key computations:**
- `revisionScore` — weighted: `0.45 × retentionGrade + 0.30 × sessionFrequency - 0.25 × overduePenalty`
- `overdueCount` — ayahs whose `smNextReviewDue` is in the past
- `revisionBurdenScore` — `min(100, overdueCount / totalAyahsMemorized × 500)`, clamped; represents the proportion of memorized content awaiting review
- `forgettingRisk` — `low` if overdue ratio < 5%, `medium` if 5–20%, `high` if > 20%
- `onTimeRevisionRate` — sessions completed before their `nextReviewDueAt`

**SM-2 integration:** reads `smNextReviewDue` from `AyahPerformance` documents (computed and stored by Phase 12B's SM-2 engine).

---

### 4.3 MistakeEngine

**Input:** `MistakeData[]`, `totalAyahsMemorized`

**Output:** `MistakeAnalysis`

**Key computations:**
- `resolutionRate` — `resolvedMistakes / totalMistakes × 100`
- `topProblematicSurahs` — top 5 surahs by mistake count, each with dominant type and critical count
- `recurringPatterns` — mistake types appearing ≥ `TajweedRules.RECURRENCE_THRESHOLD` (3) times
- `hasCriticalOpenMistakes` — open mistakes of type SKIPPED_AYAH or ORDER_MISTAKE
- `mistakeRatePerAyah` — used as input to DifficultyEngine

**Note on MistakeType:** the enum covers structural recitation errors (MISSING_WORD, WRONG_WORD, REPEATED_WORD, SKIPPED_AYAH, ORDER_MISTAKE, OTHER). Tajweed-rule categories (makhraj, madd, etc.) are a separate domain and belong in a future Tajweed module.

---

### 4.4 DifficultyEngine

**Input:** `DifficultyInput` — grade distribution, session count, mistake rate, SM-2 easiness factor

**Output:** `DifficultyAnalysis`

**Difficulty index formula (0–100, higher = harder):**
```
difficultyIndex = 0.45 × gradeDifficulty
                + 0.30 × efDifficulty
                + 0.25 × mistakeDifficulty
```
- `gradeDifficulty` — `(1 - averageScore/100) × 100`
- `efDifficulty` — normalised SM-2 easiness factor: `(2.5 - ef) / 1.2 × 100` (EF range 1.3–2.5)
- `mistakeDifficulty` — `mistakeRatePerAyah / (MAX_ACCEPTABLE × 2) × 100`

**Levels:** easy < 25, moderate 25–49, challenging 50–74, difficult ≥ 75

---

### 4.5 ForecastEngine

**Input:** `ForecastInput` — pace, consistency, overdue count, burden score

**Output:** `IntelligenceForecast`

**Two projections:**
1. **Raw** — `⌈remainingAyahs / dailyPaceAyahs⌉` days
2. **Burden-adjusted** — reduces effective capacity: `adjustedCapacity = dailyPace × max(0.30, 1 - burdenScore/200)`. At burden=100, capacity drops to 50% of raw pace.

**Completion risk:**
- `on-track` — consistency ≥ 70 AND pace ≥ TARGET_AYAHS_PER_SESSION (5) AND burden < HIGH (60)
- `at-risk` — consistency ≥ 40 OR burden ≥ HIGH
- `behind` — inactive (pace = 0) or insufficient consistency

**Weekly revision needed** — `⌈overdueCount / 4⌉` (clear backlog in 4 weeks)

---

### 4.6 StudentProfileEngine

**Input:** outputs from all five engines above + raw progress counters

**Output:** `StudentIntelligenceProfile` — the canonical 10-score profile

| Field | Source |
|-------|--------|
| `memorizationScore` | MemorizationEngine |
| `revisionScore` | RevisionEngine |
| `consistencyScore` | `round(min(100, activeDaysLast30/30 × 100))` |
| `attendanceScore` | AttendanceRules thresholds on `attendanceRate` |
| `difficultyIndex` | DifficultyEngine |
| `forgettingRisk` | RevisionEngine |
| `bestMemorizationTime` | hour → window: 5–11 morning, 12–17 afternoon, 18–4 evening |
| `bestRevisionTime` | same mapping from RevisionEngine.bestHour |
| `learningSpeed` | `totalAyahsMemorized / totalSessions` (ayahs/session) |
| `retentionRate` | `retainedAyahs / totalAyahs × 100` (masteryScore ≥ 60) |

---

### 4.7 RecommendationEngine

**Input:** `StudentIntelligenceProfile` + `MistakeAnalysis` + `RevisionAnalysis` + `MemorizationAnalysis`

**Output:** up to 8 `IntelligenceRecommendation[]` ordered high → medium → low priority

**14 named rules (triggeredBy key):**

| Rule key | Priority | Condition |
|----------|----------|-----------|
| `tajweed.critical_open_mistakes` | high | `hasCriticalOpenMistakes` = true |
| `revision.high_forgetting_risk` | high | `forgettingRisk` = high |
| `revision.high_burden` | high | `revisionBurdenScore` ≥ 60 |
| `attendance.critical_rate` | high | `attendanceScore` ≤ SCORE_CRITICAL (15) |
| `memorization.long_inactivity` | high | `activeDaysLast30` = 0 |
| `memorization.weak_grade_dominance` | medium | > 40% of sessions graded WEAK |
| `revision.critical_burden` | medium | `revisionBurdenScore` ≥ 80 |
| `tajweed.high_mistake_rate` | medium | `mistakeRatePerAyah` > MAX_ACCEPTABLE (0.10) |
| `memorization.inactivity` | medium | `activeDaysLast30` = 0 AND memorized > 0 |
| `revision.low_frequency` | medium | `sessionsPerWeek` < IDEAL (3) AND overdue > 0 |
| `tajweed.recurring_pattern` | medium | `recurringPatterns.length` > 0 |
| `attendance.low_rate` | medium | `attendanceScore` = SCORE_LOW (40) |
| `memorization.excellent_pace` | low | `dailyPaceAyahs` ≥ EXCELLENT (10) |
| `memorization.declining_trend` | low | `trend` = declining |
| `profile.ready_to_advance` | low | `memorizationScore` ≥ 75 AND `revisionScore` ≥ 65 AND risk = low |

---

### 4.8 AnalyticsEngine

**Input:** `StudentIntelligenceProfile[]` — all students in a class

**Output:** `ClassAnalytics`

**Key computations:**
- Averages across all 10 profile scores
- `topPerformers` — top 3 by combined score: `0.35×mem + 0.25×rev + 0.20×att + 0.20×con`
- `needsAttention` — students with `forgettingRisk=high`, `attendanceScore < 50`, `memorizationScore < 40`, or `revisionScore < 30`
- `performanceTiers` — excellent (≥85), good (65–84), average (45–64), struggling (<45)

---

## 5. Rule sets

Rules are `Object.freeze()`d constants — they carry no logic. Educators can adjust thresholds here without touching any engine file.

### MemorizationRules
Key thresholds: `TARGET_AYAHS_PER_SESSION=5`, `EXCELLENT_AYAHS_PER_SESSION=10`, `INACTIVITY_THRESHOLD_DAYS=14`, `TREND_WINDOW_DAYS=14`, `TREND_IMPROVEMENT_THRESHOLD=0.10`

Score weights: `WEIGHT_GRADE_QUALITY=0.40`, `WEIGHT_PACE=0.35`, `WEIGHT_CONSISTENCY=0.25`

### RevisionRules
Key thresholds: `OVERDUE_MEDIUM_RISK_DAYS=7`, `OVERDUE_HIGH_RISK_DAYS=21`, `IDEAL_SESSIONS_PER_WEEK=3`, `HIGH_BURDEN_THRESHOLD=60`, `CRITICAL_BURDEN_THRESHOLD=80`, `OVERDUE_RATIO_MEDIUM=0.05`, `OVERDUE_RATIO_HIGH=0.20`

Weights: `WEIGHT_RETENTION_GRADE=0.45`, `WEIGHT_FREQUENCY=0.30`, `WEIGHT_OVERDUE_PENALTY=0.25`

### AttendanceRules
Thresholds: `MIN_RATE_GOOD=80`, `MIN_RATE_ACCEPTABLE=65`, `CRITICAL_RATE=50`

Score map: ≥80→100, ≥65→70, ≥50→40, <50→15

### TajweedRules
`CRITICAL_MISTAKE_TYPES=[SKIPPED_AYAH, ORDER_MISTAKE]`, `SERIOUS_MISTAKE_TYPES=[WRONG_WORD, MISSING_WORD]`, `MAX_ACCEPTABLE_MISTAKE_RATE=0.10`, `RECURRENCE_THRESHOLD=3`, `MIN_RESOLUTION_RATE=70`, `CRITICAL_OPEN_MISTAKES_THRESHOLD=3`

---

## 6. Use cases and data flow

Each use case follows the same pattern:

```
1. Parse roles from AccessTokenPayload
2. Resolve studentId (STUDENT role → findByUserId first)
3. Ownership check (assertCanAccessStudent / direct comparison)
4. Fan-out repository reads (parallel-safe: Promise.all where possible)
5. Instantiate engines (new MemorizationEngine(), etc.)
6. Feed data into engines → collect analysis objects
7. Assemble output entity
8. Return (never write)
```

### Use case summary

| Use case | Reads from | Returns |
|----------|-----------|---------|
| `GetStudentIntelligenceProfileUseCase` | progress, memorization, reviews, mistakes, attendance, ayahPerformance | `StudentIntelligenceProfile` |
| `GetStudentRecommendationsUseCase` | same as above | `{ studentId, generatedAt, recommendations[] }` |
| `GetStudentIntelligenceForecastUseCase` | progress, memorization, ayahPerformance | `IntelligenceForecast & { studentId, generatedAt }` |
| `GetParentInsightsUseCase` | parent → studentIds → per-child profile | `ParentInsight` |
| `GetSheikhInsightsUseCase` | sheikh → students (groupIds) → per-student briefs | `SheikhInsight` |

---

## 7. RBAC model

The `INTELLIGENCE` permission category has two actions:

| Action | Key | Holders |
|--------|-----|---------|
| READ | `intelligence.read` | STUDENT (own), PARENT (own children), SHEIKH (own class), SUPERVISOR, TENANT_ADMIN |
| EXPORT | `intelligence.export` | SHEIKH, SUPERVISOR, TENANT_ADMIN |

Ownership is enforced **inside each use case**, not only at the controller `@RequirePermissions` level. The four-branch pattern (from Phase 7's `GetStudentUseCase`) is applied consistently:

```
TENANT_ADMIN / SUPERVISOR → unrestricted within tenant
SHEIKH   → assertCanAccessStudent checks assignment/circle membership
STUDENT  → studentRepo.findByUserId; profile.id must match requested studentId
PARENT   → parentRepo.findByUserId; parent.studentIds must include studentId
```

---

## 8. API endpoints

All routes are under `/api/v1` and require a valid JWT + `X-Tenant-Slug` header.

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/intelligence/students/:studentId/profile` | `intelligence.read` | Full 10-score intelligence profile |
| GET | `/intelligence/students/:studentId/recommendations` | `intelligence.read` | Up to 8 ranked recommendations |
| GET | `/intelligence/students/:studentId/forecast` | `intelligence.read` | Completion forecast with burden adjustment |
| GET | `/intelligence/parents/:parentId/insights` | `intelligence.read` | Per-child summaries + household aggregate |
| GET | `/intelligence/sheikhs/:sheikhId/insights` | `intelligence.read` | Class analytics + per-student briefs |

Full Swagger documentation is available at `/docs` when the server is running.

---

## 9. Testing

All engines have dedicated `*.spec.ts` files co-located in `domain/engines/`. Tests use plain `new Engine()` instantiation — no NestJS testing module is required.

| File | Coverage focus |
|------|---------------|
| `memorization.engine.spec.ts` | Score computation, trend detection, pace, grade distribution |
| `revision.engine.spec.ts` | Forgetting risk, overdue count, revision score, trend |
| `mistake.engine.spec.ts` | Type/severity breakdown, recurring patterns, critical flags |
| `difficulty.engine.spec.ts` | Grade-based, SM-2, mistake components; difficulty levels |
| `forecast.engine.spec.ts` | Raw vs adjusted dates, completion risk, pace labels |
| `recommendation.engine.spec.ts` | 14 rules, priority ordering, cap at 8 |
| `analytics.engine.spec.ts` | Class averages, performance tiers, top performers |
| `student-profile.engine.spec.ts` | Score pass-through, derived fields, attendance thresholds, edge cases |

Run all intelligence tests:
```bash
cd backend && npx jest --testPathPattern="intelligence" --no-coverage
```

---

## 10. Design decisions

### Engines as plain classes, not NestJS providers
**Why:** Engines are pure functions with no I/O. Registering them as providers would add DI overhead and make tests require `Test.createTestingModule()`. Instantiating with `new` inside use cases is idiomatic for value-object/strategy patterns and keeps tests to three lines of setup.

### One StudentProfileEngine as the single aggregation point
**Why:** Ensures that every downstream consumer (recommendations, forecast, parent insights, sheikh insights) works from identical score values. Eliminates drift where two use cases compute slightly different `consistencyScore` for the same student.

### Rule constants instead of configuration tables
**Why:** The ruleset is stable and educator-facing. A `const` object is type-safe, tree-shakeable, and requires no database read at request time. If dynamic configuration is needed in the future, the rule object can be replaced with a per-tenant config lookup without changing any engine interface.

### Advisory-only boundary (no write paths)
**Why:** Hard product requirement — "AI/intelligence must be an assistant only, never a source of truth." No use case in this module calls any `save()`, `update()`, or `create()` method. This constraint is enforced structurally: `IntelligenceModule` only imports modules that export **read** repositories.

### `estimateAyahsInRange` approximation
Cross-surah ranges use ~10 ayahs/surah as an estimate. This affects `learningSpeed` and `forecast` accuracy for sessions that span multiple surahs. Exact ayah counts require a join against the Quran collection and are deferred to a follow-up phase when the Quran seeder has been confirmed to have run.

---

## 11. Known gaps (non-blocking for Beta)

| Gap | Impact | Planned fix |
|-----|--------|-------------|
| `estimateAyahsInRange` uses ~10 ayahs/surah for cross-surah spans | Slightly inaccurate learning-speed and forecast for multi-surah sessions | Replace with exact Ayah collection count after Quran seeder is guaranteed |
| No caching layer on intelligence profiles | Repeated calls recompute everything from MongoDB | Add in-process TTL cache (matching Phase 12C's `SimpleTtlCache` pattern) in a follow-up |
| Sheikh insights computed sequentially per student | Performance degrades linearly with class size | `Promise.all` fan-out for classes > ~20 students |
