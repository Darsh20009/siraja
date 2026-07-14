# Phase 12B — Learning Intelligence Core

**Status:** Architecture design  
**Date:** 2026-07-14  
**Depends on:** Phase 7 (Memorization Engine), Phase 9 (Smart Mushaf), Phase 11 (AI Orchestrator), Phase 12A (Platform Foundation)

---

## Overview

Phase 12B elevates Siraja from a record-keeping platform into a true learning intelligence system. Every piece of scored or evaluated content feeds deterministic algorithms — no LLM involvement in scoring, matching, or mistake detection. The AI layer (Moonshot) remains advisory-only, receiving *pre-digested* signals from the deterministic engines rather than raw data.

The phase is organized around three priorities:

| Priority | Deliverables |
|---|---|
| P1 | Ayah Performance Auto-Update, Mastery Score Engine, Weakness Heatmap |
| P2 | SM-2 Revision Engine, Forecast Engine Upgrade |
| P3 | Quran Matching Engine, Deterministic Mistake Detection Engine |

---

## 1. Ayah Performance Auto-Update Architecture

### Current State (Phase 9)

Three hooks already exist and are wired fire-and-forget from domain events:

```
ApproveMemorizationRecord → ayahPerformanceRepo.recordMemorization(...)
CreateReviewRecord         → ayahPerformanceRepo.recordRevision(...)
LogMistake                 → ayahPerformanceRepo.recordMistake(...)
```

Each hook does a `findOneAndUpdate` with `upsert: true` on the `(tenantId, student, surahNumber, ayahNumber)` compound index. The current scoring is: memorize → set score by grade table, revise → average toward grade target, mistake → subtract 10.

### Phase 12B Changes

The hooks remain the same call sites. The change is in what gets computed inside those hooks — and two new schema fields added to `AyahPerformance`:

```typescript
// New fields added to AyahPerformanceSchema
masteryScore: number;   // 0–100 composite score (replaces confidenceScore as primary signal)
smEasinessFactor: number; // SM-2 EF, init 2.5, range [1.3, 2.5]
smInterval: number;       // SM-2 current interval in days (0 = not scheduled yet)
smRepetitions: number;    // SM-2 consecutive successful reviews without failure
smNextReviewDue: Date | null; // when SM-2 says next revision is due
```

`confidenceScore` is kept for backwards compatibility and UI rendering but is now computed from `masteryScore` rather than being the primary value.

### Write Path

```
recordMemorization(grade)
  → SM-2Engine.onSuccess(grade)         → updates smEF, smInterval, smRepetitions, smNextReviewDue
  → MasteryScoreEngine.compute(ayah)    → updates masteryScore
  → confidenceScore = masteryScore      (backward compat alias)
  → heatmapLevel = computeHeatmapLevel(status, masteryScore)
  → $set all fields atomically in one findOneAndUpdate

recordRevision(retentionGrade)
  → SM-2Engine.onReview(retentionGrade) → updates SM-2 fields
  → MasteryScoreEngine.compute(ayah)    → updates masteryScore
  → heatmapLevel recomputed
  → atomic $set

recordMistake()
  → SM-2Engine.onMistake()              → resets smRepetitions to 0, smInterval to 1
  → MasteryScoreEngine.applyMistakePenalty(ayah)
  → heatmapLevel recomputed
  → atomic $set
```

All writes are single `findOneAndUpdate` operations — no two-phase read/modify/write races because Mongo's `$set` with the computed values is sent atomically.

### Idempotency

The hooks are fire-and-forget (`.catch(() => {})`). If a hook fails mid-flight, the next event for the same ayah will recompute and overwrite. Because the inputs (grade, count, timestamps) are monotonically increasing, a retry never produces a worse outcome than a skip — eventual consistency is acceptable for the learning signal.

---

## 2. Mastery Score Engine Design

### Purpose

A single 0–100 composite signal that represents how well a student knows a specific ayah. Unlike `confidenceScore` (a simple numeric) the mastery score is multi-factor and time-aware.

### Formula

```
masteryScore = round(
  W_base     * baseScore(grade)        +   // 40%
  W_recency  * recencyFactor(lastActivity) +  // 30%
  W_mistakes * mistakePenalty(mistakeCount) + // 20%
  W_revision * revisionBonus(revisionCount)   // 10%
)
```

Weights: `W_base=0.40, W_recency=0.30, W_mistakes=0.20, W_revision=0.10`

**baseScore(grade)**  

| EvaluationGrade | Score |
|---|---|
| EXCELLENT | 95 |
| VERY_GOOD | 85 |
| GOOD | 70 |
| ACCEPTABLE | 55 |
| WEAK | 30 |
| none / memorized without grade | 60 |

**recencyFactor(lastActivity: Date | null): 0–100**

```
daysSince = (now - lastActivity) / 86_400_000
factor    = 100 * exp(-daysSince / TAU)   where TAU = 30 (half-life ≈ 21 days)
```

If never memorized → factor = 0. Exponential decay means an ayah memorized 30 days ago without review is at `100 * e^(-1) ≈ 37`. After 90 days without review it is `100 * e^(-3) ≈ 5`.

**mistakePenalty(mistakeCount): 0–100**

```
penalty = min(mistakeCount * 8, 80)   // 0–80 range
factor  = 100 - penalty               // 20–100 range
```

**revisionBonus(revisionCount): 0–100**

```
bonus = min(revisionCount * 5, 50)   // 0–50 range
factor = 50 + bonus                  // 50–100 range
```

All four factors are clamped to [0, 100] before combining. The final `masteryScore` is `clamp(round(combined), 0, 100)`.

### Placement

`MasteryScoreEngine` is a pure-function service (no DB access, no side effects) in `backend/src/shared/learning/mastery-score.engine.ts`. It is injected into `AyahPerformanceRepository` via standard NestJS DI. Being pure, it is trivially unit-testable.

### Threshold Mapping

| masteryScore | AyahPerformanceStatus | HeatmapLevel |
|---|---|---|
| — (NOT_STARTED) | NOT_STARTED | null |
| 0–39 | WEAK | WEAK |
| 40–64 | NEEDS_REVIEW | NEEDS_REVIEW |
| 65–84 | MEMORIZED | GOOD |
| 85–100 | MEMORIZED | EXCELLENT |

---

## 3. Weakness Heatmap Design

### Purpose

Given a student, return a ranked list of their weakest ayahs / surahs / juzs — input for both the AI advisory layer (which surahs to focus on) and the SM-2 scheduler (which ayahs are overdue).

### Data Source

`AyahPerformance` documents for the student, already materialised. No aggregation query needed on read — the heatmap data is already in the `heatmapLevel` field of each document.

### WeaknessHeatmapService

```typescript
class WeaknessHeatmapService {
  // Returns top-N weakest ayahs by masteryScore ascending
  getWeakestAyahs(tenantId, studentId, limit = 20): Promise<WeakAyah[]>

  // Returns weakness summary per surah (average masteryScore, weak count)
  getSurahWeaknessSummary(tenantId, studentId): Promise<SurahWeakness[]>

  // Returns ayahs where SM-2 nextReviewDue <= now (overdue revisions)
  getOverdueRevisions(tenantId, studentId): Promise<AyahPerformanceRecord[]>
}
```

**WeakAyah**
```typescript
{ surahNumber, ayahNumber, masteryScore, heatmapLevel, mistakeCount, revisionCount, smNextReviewDue, daysSinceLastActivity }
```

**SurahWeakness**
```typescript
{ surahNumber, totalTracked, weakCount, needsReviewCount, averageMasteryScore, overduCount }
```

### Heatmap Level Upgrade Path

`heatmapLevel` already exists in the schema and is recomputed at every write by `computeHeatmapLevel`. The weakness heatmap in Phase 12B adds:
1. **Per-surah rollup** — aggregate `heatmapLevel` across all tracked ayahs in each surah
2. **Overdue detection** — cross-reference `smNextReviewDue` with `now()`
3. **Juz rollup** — group by juz number (from `Ayah.juzNumber` reference)

The juz rollup requires a lookup against the `ayahs` collection (to get `juzNumber` for each `(surahNumber, ayahNumber)`). This is the only join in the service. It is done at read time (acceptable — weakness queries are low frequency, results cached at controller level with a 5-minute TTL).

### Caching

`WeaknessHeatmapService.getSurahWeaknessSummary` is the most expensive call (full student scan). Cache strategy:

```
key   = `weakness:${tenantId}:${studentId}`
TTL   = 5 minutes
store = in-process Map<string, { data, expiresAt }>
```

Simple in-process TTL cache is sufficient for Phase 12B. A Redis layer can replace it later without API change (cache-behind same interface).

---

## 4. SM-2 Revision Engine Design

### SM-2 Algorithm (Anki variant)

Based on the SuperMemo SM-2 algorithm with the Anki quality-grade mapping:

```
Grade mapping (from EvaluationGrade → SM-2 quality q ∈ [0,5]):
  EXCELLENT  → 5
  VERY_GOOD  → 4
  GOOD       → 3
  ACCEPTABLE → 2
  WEAK       → 1
  (mistake)  → 0

EF update (only when q >= 3):
  EF_new = max(1.3, EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

Interval update:
  q < 2  → repetitions = 0, interval = 1 day
  q == 2 → repetitions unchanged, interval = max(1, floor(interval * 1.2))  (partial credit)
  q >= 3 →
    repetitions = 0 → interval = 1
    repetitions = 1 → interval = 6
    repetitions >= 2 → interval = round(previous_interval * EF)
    repetitions += 1

nextReviewDue = today + interval days
```

### Sm2Engine Service

```typescript
class Sm2Engine {
  // Called when memorization or successful review recorded
  onSuccess(
    current: Sm2State,
    grade: EvaluationGrade
  ): Sm2State

  // Called when mistake recorded (forces interval back to 1, no EF change)
  onMistake(current: Sm2State): Sm2State

  // Returns default SM-2 state for a fresh ayah
  initialState(): Sm2State
}

interface Sm2State {
  smEasinessFactor: number;   // default 2.5
  smInterval: number;         // 0 until first success
  smRepetitions: number;      // 0
  smNextReviewDue: Date | null;
}
```

`Sm2Engine` is a pure-function service (no DB, no side effects). Inputs and outputs are plain value objects. It lives in `backend/src/shared/learning/sm2.engine.ts`.

### Integration Point

`AyahPerformanceRepository.recordMemorization` and `recordRevision` call `Sm2Engine.onSuccess(currentState, grade)` to get the next state, then store it atomically in the same `findOneAndUpdate` payload. `recordMistake` calls `Sm2Engine.onMistake(currentState)`.

The current state is either read from the existing document (via a `findOne` before the update, or via the `findOneAndUpdate` result if using `new: false` for the pre-image) or passed as parameters. Because the repository already does `findOneAndUpdate(..., { new: true, upsert: true })`, the pre-image needs to be fetched separately. To avoid a round-trip, the SM-2 fields are passed to the `$set` payload by computing state from the *current document* returned in the initial `findOne` that already happens in `recordMistake` (which reads `existing` before updating).

For `recordMemorization` and `recordRevision`, the existing document is fetched inside the hook; the SM-2 state is computed from that document's fields before the `$set`.

### SM-2 Scheduler Endpoint

```
GET /api/v1/smart-mushaf/revisions/due
→ WeaknessHeatmapService.getOverdueRevisions(tenantId, studentId)
→ Returns: AyahPerformanceRecord[] where smNextReviewDue <= now
```

RBAC: `smart_mushaf.read` (students, sheikhs, supervisors all have this).

---

## 5. Forecast Engine Upgrade Strategy

### Current Forecast (Phase 7)

Simple linear extrapolation from `memorization_records`:
- Count active days in last 30 days
- Compute `dailyPaceAyahs = totalAyahsLast30 / activeDays`
- `estimatedCompletionDate = today + remainingAyahs / dailyPaceAyahs`
- `consistencyScore = activeDays / 30 * 100`

This is pace-only. It does not account for retention (an ayah memorized poorly may need re-memorization) or revision burden.

### Phase 12B Upgrades

Add five new fields to the `CompletionForecast` response:

```typescript
interface CompletionForecastV2 extends CompletionForecast {
  // SM-2 aware
  overdueRevisionCount: number;          // ayahs where smNextReviewDue <= today
  revisionBurdenScore: number;           // 0–100: 0 = no backlog, 100 = overwhelming
  adjustedCompletionDate: string | null; // date accounting for revision burden
  adjustedDaysRemaining: number | null;  // days with revision overhead included

  // Mastery-aware
  stronglyMemorizedCount: number;   // masteryScore >= 85
  weaklyMemorizedCount: number;     // masteryScore < 55 but status = MEMORIZED
  retentionRisk: 'low' | 'medium' | 'high'; // based on overdue + weak counts
}
```

**Revision burden model:**

```
burdenScore = min(100, (overdueCount / max(1, totalMemorized)) * 200)

adjustedDailyCapacity = dailyPaceAyahs * max(0.3, 1 - burdenScore / 200)

adjustedDaysRemaining = remainingAyahs / adjustedDailyCapacity
```

Logic: heavy revision backlog reduces effective new-memorization capacity. At `burdenScore = 100` (backlog = 50% of memorized material), capacity is halved.

**RetentionRisk:**

```
if overdueCount / totalMemorized < 0.05 → 'low'
if overdueCount / totalMemorized < 0.20 → 'medium'
else → 'high'
```

### No Schema Changes

The forecast is computed on-the-fly from existing `AyahPerformance` data. `GetCompletionForecastUseCase` gets a new `AyahPerformanceRepository` dependency to pull mastery/SM-2 summary data.

---

## 6. Quran Matching Engine Design

### Purpose

Given a free-form Arabic text string (e.g. from a voice-to-text transcript or a UI text field), find the most likely matching ayah(s) from the Quran corpus. Used for:
- Recitation matching (which ayah is the student reciting?)
- Smart mistake detection (compare recited text to reference ayah)
- Search-as-you-type (used by the existing QuranSearch module)

**No LLM dependency.** Entirely deterministic.

### Normalization Pipeline

Arabic text must be normalized before any comparison. The same normalization is applied to both the query input and the reference corpus.

```typescript
// backend/src/shared/quran/arabic-normalizer.util.ts

function normalize(text: string): string {
  return text
    // 1. Remove all tashkeel (diacritics + superscript alef + shadda + sukun)
    .replace(/[\u064B-\u065F\u0670]/g, '')

    // 2. Remove tatweel (Arabic kashida ـ)
    .replace(/\u0640/g, '')

    // 3. Normalize alef variants → bare alef ا
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')   // أ إ آ ٱ → ا

    // 4. Normalize alef maqsura → ya ى → ي
    .replace(/\u0649/g, '\u064A')

    // 5. Normalize ta marbuta → ha ة → ه
    .replace(/\u0629/g, '\u0647')

    // 6. Normalize hamza on waw ؤ → و, hamza on ya ئ → ي
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')

    // 7. Normalize standalone hamza to alef
    .replace(/\u0621/g, '\u0627')

    // 8. Remove punctuation and non-Arabic characters
    .replace(/[^\u0600-\u06FF\s]/g, '')

    // 9. Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
```

The `arabicTextNormalized` field in the `Ayah` schema uses steps 1–2 from the seeder (tashkeel + tatweel removal). Phase 12B extends normalization to steps 3–9 for matching. The seeder normalization is **not** changed (it's indexed); instead the matcher applies the extended pipeline to the query.

### Matching Strategy — Three Tiers

**Tier 1: Exact normalized match (fastest)**
```
normalizedQuery === ayah.arabicTextNormalized
→ confidence: 1.0
```

**Tier 2: MongoDB text index search (fast, recall-focused)**
```
db.ayahs.find({ $text: { $search: queryTokens } }, { score: { $meta: 'textScore' } })
       .sort({ score: { $meta: 'textScore' } })
       .limit(20)
→ confidence derived from textScore normalization
```

**Tier 3: Levenshtein distance (precise, recall-reranking)**

Apply word-level Levenshtein edit distance between the normalized query and each Tier 2 candidate:

```
similarity = 1 - (editDistance / max(queryLen, candidateLen))
```

where `queryLen` and `candidateLen` are word counts, and `editDistance` is the word-level Levenshtein distance (each operation = 1 word substitution, insertion, or deletion).

Final score: `0.6 * tier2Score + 0.4 * similarity`

### QuranMatcherService

```typescript
class QuranMatcherService {
  async matchAyah(
    query: string,
    options?: { topN?: number; minConfidence?: number }
  ): Promise<AyahMatch[]>
}

interface AyahMatch {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  confidence: number;        // 0.0–1.0
  matchTier: 'exact' | 'text-index' | 'fuzzy';
  editDistance?: number;
}
```

Default: `topN=5, minConfidence=0.5`.

### Character-Level Levenshtein Implementation

Pure TypeScript, no external dependencies. Wagner–Fischer DP algorithm:

```typescript
function levenshtein(a: string[], b: string[]): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}
```

Word-level: tokenize both strings on whitespace, then apply `levenshtein(queryWords, candidateWords)`. This is O(m×n) per candidate — fast enough for ≤20 candidates from Tier 2.

### Scalability Note

Tier 1 and Tier 2 are bounded by MongoDB's index performance (O(log n) + O(k) recall). Tier 3 is bounded by Tier 2's output size (max 20). Total per-request cost is dominated by the MongoDB text search — well under 50ms at platform scale.

---

## 7. Deterministic Mistake Detection Design

### Purpose

Given a **recited text** (student's recitation, as a string) and a **reference ayah** (the correct Quran text), deterministically classify the mistakes without any LLM involvement.

### Input Contract

```typescript
interface MistakeDetectionInput {
  recitedText: string;   // raw, may have tashkeel
  referenceText: string; // canonical Quran text, may have tashkeel
}

interface DetectedMistake {
  type: MistakeType;
  severity: MistakeSeverity;
  wordIndex: number;      // 0-based index in reference word list
  recitedWord?: string;   // what was said (if substitution)
  referenceWord: string;  // what should have been said
  editDistance?: number;  // character-level distance (for WRONG_WORD)
}
```

### Detection Algorithm

**Step 1 — Normalize both inputs** using the same Arabic normalizer.

**Step 2 — Tokenize** into word arrays: `refWords = normalize(referenceText).split(' ')`, similarly for recited.

**Step 3 — Word-level alignment via LCS (Longest Common Subsequence)** to find the optimal alignment between recited and reference word sequences.

**Step 4 — Classify gaps in alignment:**

```
For each position in reference not matched:
  → MISSING_WORD (severity: MINOR if 1 word, MODERATE if 2-3, MAJOR if 4+)

For each recited word not matched to reference:
  → Find closest reference word by character-level Levenshtein
  → if editDistance == 0 and the word appears elsewhere in reference:
      → REPEATED_WORD or ORDER_MISTAKE (check order)
  → if editDistance <= 2:
      → WRONG_WORD severity: MINOR
  → if editDistance > 2:
      → WRONG_WORD severity: MODERATE
  → if recited position is significantly out-of-sequence:
      → ORDER_MISTAKE severity: MAJOR

For each run of consecutive missing reference words:
  → If entire consecutive ayah-length block missing:
      → SKIPPED_AYAH (severity: MAJOR)
```

**Step 5 — Deduplication:** A word can only be classified once. SKIPPED_AYAH takes priority over MISSING_WORD for the same span.

### MistakeDetectorService

```typescript
class MistakeDetectorService {
  detect(input: MistakeDetectionInput): DetectedMistake[]

  // Convenience: summarize as the existing LogMistakeDto format
  toLogDtos(
    detected: DetectedMistake[],
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    recordId: string,
  ): LogMistakeDto[]
}
```

The service outputs a list of `DetectedMistake`. The caller (a sheikh using a recitation recording UI) can confirm/discard before the mistakes are committed to the database via the existing `LogMistakeUseCase`. **The detector never writes to the database itself.**

### API Endpoint

```
POST /api/v1/smart-mushaf/detect-mistakes
Body: { recitedText: string, surahNumber: number, ayahNumber: number }
Response: { detectedMistakes: DetectedMistake[], referenceText: string, normalizedRecited: string }
```

RBAC: `smart_mushaf.create` (sheikhs have this permission).

This endpoint is stateless — it performs detection and returns the result for the sheikh to review. The sheikh then confirms and submits via the existing `POST /api/v1/mistakes` endpoint.

---

## 8. AI Integration Boundaries

### Deterministic Layer (Phase 12B — no LLM)

| Feature | Implementation | LLM? |
|---|---|---|
| Mastery score computation | `MasteryScoreEngine` — pure math | ❌ |
| SM-2 interval scheduling | `Sm2Engine` — pure algorithm | ❌ |
| Weakness identification | `WeaknessHeatmapService` — DB query + sort | ❌ |
| Forecast upgrade | `GetCompletionForecastUseCase` — math | ❌ |
| Arabic text normalization | `ArabicNormalizerUtil` — regex | ❌ |
| Ayah matching | `QuranMatcherService` — text index + Levenshtein | ❌ |
| Mistake detection | `MistakeDetectorService` — LCS + edit distance | ❌ |

### AI Layer (Phase 11 — Moonshot, advisory)

The Phase 11 AI module reads the *signals* produced by the deterministic layer to generate human-readable narratives. It never computes scores or makes scheduling decisions.

| AI Use Case | Input (deterministic signal) | Output |
|---|---|---|
| MistakeInsight | `getFrequency()` by `MistakeType` | Narrative analysis + training suggestions |
| RevisionRecommendation | `WeaknessHeatmapService` output | Recommended surah/ayah focus areas |
| MemorizationRecommendation | `CompletionForecastV2` | Pacing advice |
| ForecastExplanation | `CompletionForecastV2` | Natural language explanation of the forecast |

**The boundary rule:** The AI module may read from any deterministic service. No deterministic service reads from the AI module. This is a one-way dependency graph.

### Phase 12B AI Enhancements

Two new AI prompts are added that use Phase 12B signals:

1. **WeaknessReport**: Feeds `SurahWeakness[]` into the Moonshot orchestrator → returns a prioritized Arabic-learning plan.
2. **SM-2 Rationale**: Feeds overdue revision list + retentionRisk into Moonshot → returns a motivational review schedule explanation.

Both are added to `AiController` as new endpoints but share the existing `AiInsightOrchestratorService` for cost control and caching.

---

## 9. Scalability Considerations

### Write Path

**Materialised pattern maintained:** All learning signals update the `ayah_performance` document in-place. No fan-out to secondary collections. At 1M students × 6,236 ayahs = 6.2B documents (eventual). Current compound index `(tenantId, student, surahNumber, ayahNumber)` remains correct.

At scale, each `recordMemorization` / `recordRevision` / `recordMistake` call is:
- 1 `findOne` (to read current SM-2 state)
- 1 `findOneAndUpdate` with upsert (to write new state)

These are always indexed lookups — O(log n) regardless of collection size.

**Optimization for scale:** When a memorization/review record covers many ayahs (e.g. a full juz = ~200 ayahs), `resolveAyahsInRange` issues one `findBySurah` per surah, then N `findOneAndUpdate` calls. At scale, these N writes can be batched into a `bulkWrite`. The interface should be extended with a `bulkRecord` method for this purpose (Phase 12B implements the single-write path; bulk path is a future optimization marked with `// TODO: bulkWrite for large ranges`).

### Read Path

**Weakness heatmap:** The `findByStudent` query returns all tracked ayahs for a student. At 6,236 ayahs per student, this is a max of ~6,236 documents per query — manageable. The index `(tenantId, student, surahNumber)` supports this.

**Forecast:** Reads `StudentProgress` (1 document) + `AyahPerformance` aggregate query (1 aggregation pipeline). Both are indexed. Result is cached per-request at the controller level.

**Quran matching:** Bounded by the Tier 2 candidate set (max 20 documents). Total computation is O(20 × m × n) for Levenshtein where m, n ≤ 50 words — microseconds.

### Cache Strategy

| Cache point | TTL | Key | Scope |
|---|---|---|---|
| Weakness summary | 5 min | `weakness:${tenantId}:${studentId}` | In-process Map |
| Forecast | 2 min | `forecast:${tenantId}:${studentId}` | In-process Map |
| Overdue revisions | 1 min | `overdue:${tenantId}:${studentId}` | In-process Map |
| Quran text (normalized) | Permanent | Module-level `Map<globalAyahNumber, normalized>` | In-process, loaded once |

A `SimpleTtlCache<T>` generic utility is introduced in `backend/src/shared/cache/simple-ttl.cache.ts` so all services share the same implementation.

### Event-Driven Readiness

The fire-and-forget hooks (`ayahPerformanceRepo.record*`) are already de-coupled from the HTTP response. When BullMQ is introduced (Phase 13), each hook becomes a job dispatch instead of an inline `Promise`. The API contract of `AyahPerformanceRepository` does not change — only the implementation switches from inline async to `queue.add(...)`. This is the seam designed for future event-driven extraction.

### Queue-Friendly Design

Every engine method is stateless and takes fully-resolved inputs (no request context, no user session). This means any method can be invoked from a queue worker without modification.

---

## 10. Testing Strategy

### Unit Tests (pure functions — 100% coverage target)

| Service | Test file | Strategy |
|---|---|---|
| `MasteryScoreEngine` | `mastery-score.engine.spec.ts` | Exhaustive grade × recency × mistake combinations; verify clamp behavior |
| `Sm2Engine` | `sm2.engine.spec.ts` | Standard SM-2 test vectors from literature; verify EF bounds; failure reset |
| `ArabicNormalizerUtil` | `arabic-normalizer.util.spec.ts` | Unicode code points for each normalization step; round-trip tests |
| `MistakeDetectorService` | `mistake-detector.spec.ts` | Known recitation mistakes: missing word, wrong word, skipped ayah, order mistake; empty input; identical input |
| `SimpleTtlCache` | `simple-ttl.cache.spec.ts` | Set/get, TTL expiry (mock Date.now), overwrite, eviction |

### Integration Tests (DB mocked via jest)

| Service | Test file | Strategy |
|---|---|---|
| `AyahPerformanceRepository` | `ayah-performance.repository.spec.ts` | Mock Model; verify SM-2 + mastery fields written atomically |
| `WeaknessHeatmapService` | `weakness-heatmap.service.spec.ts` | Mock repo; verify sort order, overdue detection, surah rollup |
| `QuranMatcherService` | `quran-matcher.service.spec.ts` | Mock AyahRepository; verify tier selection, confidence scoring |
| `GetCompletionForecastUseCase` | Update existing forecast spec | Add SM-2 fields to mock data; verify burden score, retention risk |

### RBAC Tests

`detect-mistakes` endpoint: `smart_mushaf.create` gate — only SHEIKH/TENANT_ADMIN/SUPER_ADMIN can call it. Test via decorator metadata reflection (same pattern as `tenants.controller.rbac.spec.ts`).

### Milestone Gates (run at each priority boundary)

```bash
npx tsc --noEmit          # 0 errors required
npx jest --no-coverage    # all suites green
# then restart workflow and verify boot log
```

---

## Module Placement

```
backend/src/
  shared/
    learning/
      mastery-score.engine.ts       ← P1
      sm2.engine.ts                 ← P2
    quran/
      arabic-normalizer.util.ts     ← P3
    cache/
      simple-ttl.cache.ts           ← P1 (used by WeaknessHeatmapService)
  modules/
    ayah-performance/               ← extend schema + repo (P1, P2)
    smart-mushaf/                   ← add detect-mistakes endpoint (P3)
      application/
        use-cases/
          detect-mistakes.use-case.ts
          get-overdue-revisions.use-case.ts    ← P2
          get-weakness-summary.use-case.ts     ← P1
    forecast/                       ← upgrade use-case (P2)
      application/
        use-cases/
          get-completion-forecast.use-case.ts  ← extend
```

---

## Schema Changes Summary

### `ayah_performance` collection — new fields

```typescript
@Prop({ type: Number, default: 0, min: 0, max: 100 })
masteryScore: number;

@Prop({ type: Number, default: 2.5 })
smEasinessFactor: number;

@Prop({ type: Number, default: 0, min: 0 })
smInterval: number;           // days

@Prop({ type: Number, default: 0, min: 0 })
smRepetitions: number;

@Prop({ type: Date, default: null })
smNextReviewDue: Date | null;
```

New index: `{ tenantId: 1, student: 1, smNextReviewDue: 1 }` — supports efficient "overdue revisions" queries.

**Migration:** No migration needed. `default` values on existing documents are applied by Mongoose on read. The `smNextReviewDue` field being null means "not yet scheduled" — handled correctly by all new queries.

---

*Architecture approved. Implementation begins with Priority 1.*
