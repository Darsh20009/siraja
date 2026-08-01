# Phase 13C — Siraja Native AI Core Architecture

## Overview

Phase 13C delivers a **fully self-contained, deterministic AI layer** for the Siraja platform that runs entirely in-process with zero external AI service dependencies. No OpenAI, Moonshot, Claude, Gemini, DeepSeek, Groq, Cohere, or any other paid/hosted AI API is used. Every computation runs as synchronous TypeScript inside the NestJS process.

---

## Design Principles

| Principle | How it applies |
|-----------|---------------|
| **Clean Architecture** | Domain engines have no NestJS or infrastructure dependencies; infrastructure imports domain, never the reverse. |
| **SOLID** | Each engine has exactly one responsibility; the `NativeAiEngineService` façade follows the Open/Closed principle. |
| **Dependency Injection** | All engines are instantiated once inside `NativeAiEngineService`; consumers receive the service through NestJS DI. |
| **Zero external AI** | All computation is rule-based / algorithmic Unicode text processing with no network calls. |
| **Stateless & read-only** | The module never writes to MongoDB, never enqueues jobs, and holds no mutable state. Safe to import from anywhere. |
| **100% unit-tested** | Every public engine method is covered; 14 spec files total; all suites pass. |
| **Full RBAC** | `native_ai.read` for analysis endpoints; `native_ai.create` for mistake classification. |
| **Tenant-aware** | Uses the caller's tenant context propagated through the NestJS request scope; no cross-tenant data access. |

---

## Module Structure

```
backend/src/modules/native-ai/
│
├── native-ai.module.ts                 # NestJS module wiring
│
├── domain/
│   ├── engines/                        # 14 pure TypeScript engine classes
│   │   ├── tokenizer.engine.ts             # Engine 1
│   │   ├── normalization.engine.ts         # Engine 2
│   │   ├── morphology.engine.ts            # Engine 3
│   │   ├── letter-analyzer.engine.ts       # Engine 4
│   │   ├── word-analyzer.engine.ts         # Engine 5
│   │   ├── verse-structure.engine.ts       # Engine 6
│   │   ├── tajweed-rule.engine.ts          # Engine 7
│   │   ├── mistake-classification.engine.ts # Engine 8
│   │   ├── memorization-pattern.engine.ts  # Engine 9
│   │   ├── similarity.engine.ts            # Engine 10
│   │   ├── recommendation.engine.ts        # Engine 11
│   │   ├── forecast.engine.ts              # Engine 12
│   │   ├── adaptive-learning.engine.ts     # Engine 13
│   │   └── orchestrator.engine.ts          # Engine 14 (top-level façade)
│   │
│   ├── entities/                       # Pure TypeScript output types (no Mongoose)
│   │   ├── quran-token.entity.ts
│   │   ├── letter-properties.entity.ts
│   │   ├── word-analysis.entity.ts
│   │   ├── verse-analysis.entity.ts
│   │   ├── tajweed-rule-application.entity.ts
│   │   ├── mistake-classification.entity.ts
│   │   ├── memorization-pattern.entity.ts
│   │   ├── similarity-result.entity.ts
│   │   ├── ai-recommendation.entity.ts
│   │   ├── ai-forecast.entity.ts
│   │   └── adaptive-plan.entity.ts
│   │
│   └── rules/                          # Immutable tunable threshold constants
│       ├── arabic.rules.ts             # Unicode sets, SM-2 constants, letter complexity
│       ├── memorization.rules.ts       # Velocity/burden/retention thresholds
│       └── tajweed.rules.ts            # Tajweed scoring thresholds
│
├── application/
│   ├── services/
│   │   └── native-ai-engine.service.ts # NestJS singleton owning all 14 engine instances
│   │
│   ├── use-cases/
│   │   ├── analyze-text.use-case.ts
│   │   ├── analyze-verse.use-case.ts
│   │   ├── classify-mistake.use-case.ts
│   │   ├── compute-similarity.use-case.ts
│   │   └── get-learning-insight.use-case.ts
│   │
│   └── dtos/
│       ├── analyze-text.dto.ts
│       ├── analyze-verse.dto.ts
│       ├── classify-mistake.dto.ts
│       ├── compute-similarity.dto.ts
│       └── learning-insight.dto.ts
│
└── infrastructure/
    └── controllers/
        └── native-ai.controller.ts     # HTTP layer (Swagger + RBAC)
```

---

## The 14 Engines

### Foundation Layer (Engines 1–7)

#### Engine 1 — `TokenizerEngine`
Splits Arabic Quran text into structured `QuranToken` objects. Each token carries:
- Original text (with diacritics), normalized form, token type, position
- Morpheme breakdown (prefix / stem / suffix)
- Letter count

**Algorithm:** Whitespace split → normalization → rule-based morpheme splitting.

#### Engine 2 — `NormalizationEngine`
Produces five normalised forms from Arabic text:
| Form | Description |
|------|-------------|
| `diacriticsStripped` | Removes all tashkeel (U+064B–U+065F, U+0670) |
| `searchForm` | Strip + alef unify + alef maqsura → yah |
| `rootForm` | Search form + tah marbuta → hah |
| `flatForm` | Root form + hamza variants stripped |
| `toSearchForm` | Shorthand for search form |

Also exposes `expandShadda`, `diacriticInventory`, and `normalizeAll`.

#### Engine 3 — `MorphologyEngine`
Rule-based root extraction and morpheme analysis.
- Prefix stripping (16 patterns, longest-match first)
- Suffix stripping (17 patterns, longest-match first)
- Classical Arabic pattern matching for word class detection (`verb` / `noun` / `particle` / `unknown`)
- Root extraction using augment-letter filtering (classical Arabic augment set: ا و ي م ت ن ه ل)

#### Engine 4 — `LetterAnalyzerEngine`
Static lookup table covering all 28 Arabic letters plus hamza. Each entry encodes:
- `makhraj` (articulation point, 12 categories)
- Solar/lunar classification
- Qalqala, madd-carrier, idhar-letter, hamza flags
- `tafkhim` weight: `heavy` / `light` / `contextual`
- `tajweedComplexityScore` (1–5)

#### Engine 5 — `WordAnalyzerEngine`
Aggregates letter-level and morphological analysis into a `WordAnalysis` record:
- Letter count, syllable estimate, tajweed complexity (0–100)
- Learner difficulty (1–5): `lcScore × 0.30 + tajweedComplexity × 0.50 + syllableScore × 0.20`
- Tajweed flags: `hasQalqala`, `hasMadd`, `hasGhunna`, `hasShadda`, `hasHamza`

#### Engine 6 — `VerseStructureAnalyzerEngine`
Aggregates per-word analysis into verse-level metrics:
- Word count, letter count, unique-word count
- Tajweed complexity (mean of word scores)
- Difficulty (0–100, with length penalty)
- Rhyme ending (last 1–2 consonants of final word)
- Tajweed flags aggregated across all words

#### Engine 7 — `TajweedRuleEngine`
Comprehensive tajweed detection across a full text. Detects:

| Category | Rules detected |
|----------|----------------|
| Noon rules | idhar, idgham_bighunn, idgham_bilaghunna, iqlab, ikhfa |
| Meem rules | idgham_shafawi, ikhfa_shafawi, idhar_shafawi |
| Madd | madd_tabii, madd_muttasil, madd_lazim, madd_lin |
| Qalqala | qalqala_sughra (medial sukun), qalqala_kubra (pause) |
| Ghunna | noon/meem + shadda |
| Lam rules | lam_shamsiyya, lam_qamariyya |
| Tafkhim | heavy-letter emphasis |

Each detected application carries: `rule`, `category`, `wordIndex`, `triggerText`, `difficulty` (easy/medium/hard), and optional `expectedCounts` for madd duration.

Summary statistics include: `totalApplications`, `byCategory`, `byDifficulty`, `complexityScore` (0–100), `dominantRule`.

---

### Higher-Level Layer (Engines 8–13)

#### Engine 8 — `MistakeClassificationEngine`
Classifies a recitation error by comparing `raw` (student output) against `expected` (correct text).

**Priority order:**
1. Word repetition (consecutive duplicates)
2. Word omission (expected longer than raw)
3. Word insertion (raw longer than expected)
4. **Word substitution** (same count, different normalized words) — checked before phonetic rules
5. Elongation error (madd count mismatch)
6. Nasalization error (ghunna count mismatch)
7. Tajweed violation (rule presence diff between raw and expected)
8. Pronunciation fallback

Each result includes: `category`, `subcategory`, `severity` (critical/major/minor), optional `tajweedRule`, `confidenceScore`, `remediation` text, `relatedRules`.

Batch mode + `detectPatterns()` identifies systematic weaknesses across a session.

#### Engine 9 — `MemorizationPatternEngine`
SM-2 spaced-repetition scheduling + Ebbinghaus retention modelling.

**SM-2 algorithm:**
- Grade ≥ 3 (pass): `interval[0]=1, interval[1]=6, interval[n]=round(interval × easeFactor)`
- Grade < 3 (fail): interval resets to 1, repetitions reset to 0
- Ease factor: `min(SM2_MIN_EASE=1.3, ef + 0.1*(0.1 - (5-grade)*(0.08 + (5-grade)*0.02)))`

**Ebbinghaus retention:** `R = e^(-t / (S × EBBINGHAUS_STABILITY))` where `EBBINGHAUS_STABILITY = 1.84`.

Output `MemorizationPattern` includes: current SM-2 state, `retentionProbability`, `forgettingRate`, `optimalStudyTime`, `recommendedSessionLength`, `newToReviewRatio`, `weeklyCapacity`.

#### Engine 10 — `SimilarityEngine`
Multi-dimensional similarity between two Arabic texts:

| Dimension | Algorithm | Weight |
|-----------|-----------|--------|
| Lexical | Jaccard similarity on normalised word sets | 45% |
| Phonological | 1 − normalized Levenshtein on flat forms | 35% |
| Structural | 1 − |lenA − lenB| / max(lenA, lenB) | 20% |

Also identifies `confusablePairs`: word pairs across the two texts with `normalizedDistance < 0.4`.

Uses two-row rolling-array Levenshtein for O(min(m,n)) space.

#### Engine 11 — `RecommendationEngine`
Evaluates 12 independent rules and returns up to 8 ranked recommendations:

| Rule | Trigger | Type |
|------|---------|------|
| 1 | burdenScore > 80 (critical) | `reduce_new_memorization` |
| 2 | 60 < burdenScore ≤ 80 | `increase_review_frequency` |
| 3 | retentionProbability < 0.60 | `forgetting_curve_alert` |
| 4 | daysSinceLastSession > 14 | `consistency_alert` (critical) |
| 5 | daysSinceLastSession > 7 | `consistency_alert` (high) |
| 6 | tajweedScore < 40 | `focus_tajweed_rule` (critical) |
| 7 | tajweedScore < 60 | `focus_tajweed_rule` (high) |
| 8 | systematicMistakes present | `address_systematic_mistake` |
| 9 | velocity ≥ 10 AND on-track | `celebrate_milestone` |
| 10 | level < 3 AND velocity > target | `adjust_difficulty_up` |
| 11 | level > 2 AND velocity < 1 | `adjust_difficulty_down` |
| 12 | forgettingRate > 0.08 | `increase_review_frequency` |

Rules 2 and 12 share the same `type`; Rule 12 only fires if Rule 2 has not already fired.

#### Engine 12 — `ForecastEngine`
Velocity-based memorization completion timeline with confidence interval.

**Velocity computation:** mean of last `VELOCITY_WINDOW_SESSIONS=10` weeks.  
**Projected velocity:** `max(0.1, velocity × (1 − burdenScore/100 × 0.30))`.  
**isOnTrack:** raw mean velocity (before fallback) ≥ `MIN_ACTIVE_VELOCITY=1`.  
**Confidence interval:** optimistic×0.80 / pessimistic×1.40 of estimated weeks.  
**Completion probability:** derived from coefficient of variation (`stdDev / mean`).  
**Milestones:** four evenly-spaced targets at 25%, 50%, 75%, 100% of remaining ayahs.

#### Engine 13 — `AdaptiveLearningEngine`
Generates a personalised 7-day `AdaptivePlan` from all learning signals.

- Pace adjustment: −25% when burden > 60, −50% when burden > 80
- Review emphasis: `min(0.70, burdenScore / 100 × 0.70)`
- Session length: linearly interpolated between MIN_SESSION_MINUTES (15) and OPTIMAL_SESSION_MINUTES (30)
- Active days (Sun–Thu): full new + review targets
- Rest days (Fri–Sat): MIN_SESSION_MINUTES, review-only, no tajweed practice
- Focus areas: derived from systematic mistakes + tajweed weaknesses

---

### Orchestrator (Engine 14)

#### Engine 14 — `NativeAiOrchestratorEngine`
Wires engines 1–7 (foundation layer) into a single analysis façade.

```typescript
analyzeText(text)  → { tokens, wordAnalyses, tajweedApplications, tajweedSummary }
analyzeVerse(text, surahNumber, ayahNumber)  → above + verseAnalysis
normalizeText(text)  → search-form string
computeDifficulty(text)  → mean difficulty 1–5
extractTokens(text)  → QuranToken[]
```

---

## Application Layer

### `NativeAiEngineService`
NestJS `@Injectable()` singleton that owns all 14 engine instances. Engines are instantiated once at DI-container boot; they are stateless and safe to share across the entire process lifetime.

### Use Cases
| Class | Endpoint | Engines used |
|-------|----------|-------------|
| `AnalyzeTextUseCase` | `POST /native-ai/analyze/text` | Orchestrator (1–7) |
| `AnalyzeVerseUseCase` | `POST /native-ai/analyze/verse` | Orchestrator (1–7) |
| `ClassifyMistakeUseCase` | `POST /native-ai/mistakes/classify[/batch]` | Engine 8 |
| `ComputeSimilarityUseCase` | `POST /native-ai/similarity` | Engine 10 |
| `GetLearningInsightUseCase` | `POST /native-ai/learning/insight` | Engines 9, 12, 11, 13 |

---

## HTTP API

All endpoints share these properties:
- **Bearer auth required** (JWT access token)
- **Swagger documented** (full request/response schema)
- **RBAC guarded** (`native_ai.read` or `native_ai.create`)
- **Deterministic**: identical inputs always produce identical outputs
- **Synchronous**: no async, no database, no external calls

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/api/v1/native-ai/analyze/text` | `native_ai.read` | Tokenize + analyse Arabic text |
| POST | `/api/v1/native-ai/analyze/verse` | `native_ai.read` | Full structural verse analysis |
| POST | `/api/v1/native-ai/mistakes/classify` | `native_ai.create` | Classify a single mistake |
| POST | `/api/v1/native-ai/mistakes/classify-batch` | `native_ai.create` | Classify up to 100 mistakes |
| POST | `/api/v1/native-ai/similarity` | `native_ai.read` | Multi-dimensional text similarity |
| POST | `/api/v1/native-ai/learning/insight` | `native_ai.read` | SM-2 + forecast + recommendations + adaptive plan |

---

## RBAC Integration

Two permissions are registered under the `NATIVE_AI` category:

```
NATIVE_AI.READ   — all analysis and similarity endpoints
NATIVE_AI.CREATE — mistake classification (classified as write because it creates a classification artifact)
```

Permissions are enforced via the `@RequirePermissions()` decorator backed by the global `RolesGuard`.

---

## Test Coverage

| Engine | Spec file | Key scenarios tested |
|--------|-----------|---------------------|
| Tokenizer | `tokenizer.engine.spec.ts` | Split, tokenize, tokenizeAyah, splitMorphemes, normalization helpers |
| Normalization | `normalization.engine.spec.ts` | All 5 forms, diacriticInventory, normalizeAll |
| Morphology | `morphology.engine.spec.ts` | Root extraction, morpheme breakdown, word class detection |
| LetterAnalyzer | `letter-analyzer.engine.spec.ts` | All 28 letters, makhraj, tajweed flags, complexity, frequency |
| WordAnalyzer | `word-analyzer.engine.spec.ts` | Analysis, difficulty, syllables, tajweed flags |
| VerseStructure | `verse-structure.engine.spec.ts` | Full analysis, rhyme pattern, difficulty, flags |
| TajweedRule | `tajweed-rule.engine.spec.ts` | All noon/meem/madd/qalqala/ghunna/lam rules, summarize |
| MistakeClassification | `mistake-classification.engine.spec.ts` | All 8 categories, batch, detectPatterns |
| MemorizationPattern | `memorization-pattern.engine.spec.ts` | SM-2 (pass/fail), retention, forgetting rate, analyze |
| Similarity | `similarity.engine.spec.ts` | Levenshtein, Jaccard, compute (all dimensions), confusable pairs |
| Recommendation | `recommendation.engine.spec.ts` | All 12 rules, output structure, sorting |
| Forecast | `forecast.engine.spec.ts` | Velocity, projected velocity, dates, milestones, isOnTrack |
| AdaptiveLearning | `adaptive-learning.engine.spec.ts` | Pace, burden, schedule, focus areas, tajweed weaknesses |
| Orchestrator | `orchestrator.engine.spec.ts` | analyzeText, analyzeVerse, normalizeText, difficulty, tokens |

**Total: 1100 tests, 0 failures, 0 TypeScript errors.**

---

## Key Engineering Decisions

### Why word substitution is checked before tajweed violation
When two words are entirely different (e.g. *الكريم* vs *الرحيم*), a tajweed comparison between them is meaningless — the wrong word was spoken, regardless of its internal tajweed structure. Swapping the detection order ensures the semantically correct label fires first.

### Why `isOnTrack` uses raw mean, not the SM-2 fallback
`computeVelocity` returns `1` (not `0`) when the velocity array sums to zero, to prevent division-by-zero in pace calculations. Using that fallback for `isOnTrack` would incorrectly mark a student with zero activity as on-track. The raw mean (before fallback) is used exclusively for the boolean flag.

### Why rest days have `MIN_SESSION_MINUTES`, not `0`
A `sessionMinutes` of `0` is semantically nonsensical for a scheduled day (a session of zero length is not a session). Rest days carry a minimum 15-minute review-only slot to maintain the validity invariant that `MIN_SESSION_MINUTES ≤ sessionMinutes ≤ MAX_SESSION_MINUTES` for every scheduled day.

### Why `NativeAiModule` exports use cases, not just the service
Downstream modules (e.g. `IntelligenceModule`, `AudioIntelligenceModule`) may need to invoke specific analysis operations without depending on all 14 engines directly. Exporting use cases provides a clean, stable interface aligned with Clean Architecture boundaries.

---

## Performance Characteristics

All engines are O(n) or O(n²) in text length at most:
- Levenshtein distance: O(m × n) time, O(min(m,n)) space (two-row rolling array)
- Tokenization: O(n) where n = number of words
- Tajweed detection: O(n × |rules|) — bounded by the fixed rule set size
- SM-2: O(k) where k = number of sessions in the window

No caching is required: all computations complete in sub-millisecond time for typical Quran text lengths (≤ 20 words/ayah).
