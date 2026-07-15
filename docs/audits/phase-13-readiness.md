# Phase 13 Readiness Assessment
**Siraja — Pre-Phase 13 Gate Review**
*Date: 2026-07-15*

---

## Gate Decision: CONDITIONAL GO ⚠️

Phase 13 can begin on features that do not depend on missing infrastructure. Four infrastructure prerequisites must be resolved in parallel with Phase 13 development. Three AI features require net-new architectural components (audio pipeline, vector DB, WebSocket) that should be scoped as Phase 13 epics.

---

## 1. Outstanding Phase 12 Issues (Must Close Before Phase 13 Ships)

| # | Issue | Severity | Owner |
|---|---|---|---|
| 1 | Quran data not seeded (`seed:quran` never run) | **Critical** | DevOps / Task #2 |
| 2 | Redis not configured (`REDIS_URL` absent → queues no-op) | **Critical** | DevOps / Task #3 |
| 3 | `MOONSHOT_API_KEY` not set → AI endpoints fail | **High** | DevOps / Task #4 |
| 4 | SMTP credentials not set → emails dropped silently | **High** | DevOps / Task #4 |
| 5 | S3/R2 credentials not set → file uploads fail | **High** | DevOps / Task #4 |
| 6 | `AiQueueProcessor` stubbed — async AI delivery broken | **High** | Phase 13 P1 |
| 7 | No permission seeder run | **High** | DevOps / Task #2 |
| 8 | Repository interfaces return plain class not `HydratedDocument<T>` | Medium | Tech debt |
| 9 | `isDeleted` missing from compound indexes in 15+ schemas | Medium | Phase 13 or dedicated sprint |
| 10 | No cron jobs — overdue sessions never auto-marked | Medium | Phase 13 |

---

## 2. Phase 13 Feature Map

### 2.1 Real-Time Communication Layer (P0 — Blocks mobile UX)

**What's missing:** No WebSocket gateway exists anywhere in the codebase. Notifications, messaging, and gamification events currently require clients to poll.

**Work required:**
- Add `@nestjs/platform-socket.io` and `@nestjs/websockets`
- Create `NotificationsGateway` (authenticated, tenant-scoped, per-user room join)
- Create `MessagingGateway` (thread-scoped rooms, real-time message delivery)
- Wire `EventsModule` listeners to emit via gateway instead of (or in addition to) polling
- Add Redis adapter (`socket.io-redis`) for multi-instance support

**Estimate:** 2–3 weeks

**Dependencies:** Redis must be provisioned first.

---

### 2.2 Quran Recitation Analysis — Faster-Whisper Pipeline (P0 — Core product differentiator)

**What's missing:** The `audio-queue.processor.ts` file exists but contains only a TODO comment. Nothing calls Whisper. No audio transcription, no recitation scoring, no comparison to reference ayah text.

**Work required:**

**Phase A — Audio Ingestion:**
- Secure audio upload endpoint (`POST /recitation/upload`) with file-type validation (`.m4a`, `.mp3`, `.wav`, `.ogg`), size limit (25 MB), virus scan recommendation
- Store audio in S3/R2 via existing `StorageModule`
- Enqueue job in `audio` BullMQ queue

**Phase B — Transcription Worker:**
- Choose transcription provider:
  - **Option A (Cloud):** OpenAI Whisper API (`/v1/audio/transcriptions`) — no infra, pay-per-use
  - **Option B (Self-hosted):** Faster-Whisper via Python sidecar — lower cost at scale, requires separate Python service
- Wire `AudioQueueProcessor` to call chosen provider
- Return normalized Arabic transcript

**Phase C — Scoring:**
- Pass transcript + reference ayah text to existing `MistakeDetectorService` (LCS alignment already works)
- Pass results to `MasteryScoreEngine` to update ayah performance record
- Store mistakes in `MistakesRepository`
- Emit `MEMORIZATION_RECORDED` event (triggers gamification, notifications)

**Phase D — API Surface:**
- `POST /recitation/sessions` — upload + trigger analysis
- `GET /recitation/sessions/:id` — poll for result (or push via WebSocket)
- `GET /recitation/students/:studentId/history` — paginated recitation history

**Estimate:** 4–6 weeks (Option A cloud) / 8–10 weeks (Option B self-hosted)

**Dependencies:** S3/R2 configured, Redis provisioned (audio queue), `MistakeDetectorService` (already implemented).

---

### 2.3 Virtual Sheikh — Conversational AI (P1)

**What's missing:** No conversational state, session management, turn history, or intent routing exists. This is a net-new feature.

**Work required:**
- **Session model:** `VirtualSheikhSession` schema (userId, tenantId, turns: [{role, content, timestamp}], context snapshot)
- **Intent classification:** Prompt routing layer to differentiate: question about a verse, tafsir request, pronunciation help, progress question, motivational message
- **Context injection:** On each turn, inject student's current mastery data, recent mistakes, assigned ayahs — so the Sheikh "knows" the student
- **Controller:** `POST /virtual-sheikh/sessions`, `POST /virtual-sheikh/sessions/:id/message`, `GET /virtual-sheikh/sessions/:id`
- **Cost guard integration:** Each turn goes through `AiInsightOrchestratorService` cost checks
- **Real-time streaming:** Optional — stream LLM response tokens via WebSocket for better UX

**Estimate:** 3–4 weeks

**Dependencies:** `MOONSHOT_API_KEY` configured, WebSocket gateway (for streaming).

---

### 2.4 Similar Verses Engine (P1)

**What's missing:** No vector database, no embedding generation, no similarity search. Requires a fundamentally different data store.

**Work required:**
- **Embedding generation:** Generate Sentence-BERT or OpenAI `text-embedding-3-small` embeddings for all 6,236 ayahs (one-time batch job)
- **Vector store:** Choose provider:
  - **Option A:** Pinecone (managed, no infra)
  - **Option B:** MongoDB Atlas Vector Search (already on Atlas — lowest friction)
  - **Option C:** pgvector (new DB dependency)
- **Recommendation:** Use MongoDB Atlas Vector Search — no new infrastructure
- **Seeder:** `seed:ayah-embeddings` script that batches all ayahs, calls embedding API, stores vectors
- **API:** `GET /quran/ayahs/:id/similar?limit=10` — returns similar ayahs by semantic meaning
- **Use case:** Surface in Smart Mushaf when a student struggles with an ayah ("students who struggled with this verse also struggled with…")

**Estimate:** 2–3 weeks (Atlas Vector Search path)

**Dependencies:** Quran data seeded, OpenAI/Moonshot embedding API access.

---

### 2.5 Memorization DNA — AI Profile (P1)

**What's missing:** `MasteryScoreEngine` provides deterministic weighted scores. "Memorization DNA" implies a per-student learning pattern profile — identifying whether a student is a visual learner, struggles with specific Juz patterns, or has time-of-day performance variance.

**Work required:**
- `MemorizationDnaService` — aggregates historical performance into a student profile vector
- Attributes: forgetting curve shape (fast/slow decay), mistake type distribution, peak performance time, phonetic error clustering (requires Whisper data)
- Store as JSON snapshot in `student-progress` schema (extend with `dnaSnapshot` field)
- API: `GET /ai/students/:studentId/memorization-dna`
- LLM narrative: feed DNA attributes to Moonshot for human-readable profile summary

**Estimate:** 2–3 weeks

**Dependencies:** Sufficient historical data (sessions, mistakes, SM-2 history), `MOONSHOT_API_KEY`.

---

### 2.6 AI Heatmaps — Intelligent Weakness Visualization (P1)

**What's missing:** `WeaknessHeatmapService` produces aggregation-based heatmaps. "AI Heatmaps" implies predictive and explanatory overlays — e.g., "why" this ayah is weak, predicted future weak spots, pattern clusters.

**Work required:**
- Extend `WeaknessHeatmapService` with an `AiHeatmapEnhancerService`
- For each weak ayah cluster: call LLM to generate a brief explanation ("You consistently miss the waqf after verse 5 in Surah Al-Baqarah — this is a common pattern in Juz 1 learners")
- Predictive layer: use SM-2 due dates + historical decay rate to forecast which ayahs will become weak in the next 7/14/30 days
- API: `GET /ai/students/:studentId/heatmap` — returns standard heatmap data + AI commentary + predictions

**Estimate:** 2 weeks

**Dependencies:** `WeaknessHeatmapService` (implemented), `MOONSHOT_API_KEY`, sufficient session history.

---

### 2.7 AI Forecasting — Predictive Engine (P1)

**What's missing:** `generate-forecast-explanation.use-case.ts` wraps an LLM call but has no predictive model. It narrates existing data rather than forecasting future states.

**Work required:**
- `MemorizationForecastEngine` — uses SM-2 scheduled intervals + historical adherence rate to predict completion dates, retention rates at future time points
- Model inputs: current mastery scores, SM-2 schedules, attendance history, historical completion rate
- Output: probability of completing assigned Juz in N days, projected mastery score at week/month boundaries
- Wire existing `ForecastController` to consume `MemorizationForecastEngine` output
- Feed forecast data to LLM for narrative explanation (already wired)

**Estimate:** 2–3 weeks

**Dependencies:** SM-2 data (implemented), attendance data, historical session records.

---

### 2.8 Infrastructure: Wire AI Queue (P0)

**What's missing:** `AiQueueProcessor.process()` logs a TODO and returns immediately. All AI report generation is currently synchronous and blocks the request.

**Work required:**
- Remove TODO stub from `AiQueueProcessor.process()`
- Wire `AiQueueJob` types: `GENERATE_SHEIKH_REPORT`, `GENERATE_PARENT_REPORT`, `GENERATE_INSIGHT`, `GENERATE_FORECAST`
- Dispatch to `AiInsightOrchestratorService` based on job type
- Return job ID to client immediately; client polls `GET /ai/reports/:reportId` or receives push via WebSocket
- Add `report` BullMQ queue consumer for completed report storage

**Estimate:** 1 week

**Dependencies:** Redis provisioned, WebSocket gateway (for push delivery, optional for Phase 13 P1).

---

### 2.9 Infrastructure: Cron Jobs (P1)

**What's missing:** No `@Cron` decorators or `ScheduleModule` anywhere in the codebase.

**Required scheduled tasks:**
| Job | Frequency | Purpose |
|---|---|---|
| Mark overdue sessions | Daily 00:00 | Update sessions past due date to `OVERDUE` status |
| Prune activity logs | Weekly | Enforce TTL policy (180-day TTL exists on schema but TTL index only works at document level) |
| Snapshot leaderboard | Daily | Already referenced in Gamification but not scheduled |
| AI usage ledger rollup | Monthly | Aggregate token usage per tenant for billing |
| Refresh SM-2 due items | Daily | Pre-compute overdue revision lists into cache |

**Estimate:** 1 week

---

### 2.10 Test Coverage (P1)

Current test coverage is ~22% of services and ~0% of controllers. Phase 13 should target 60%+ service coverage before first production deployment.

**Priority modules to test:**
- Students, Sheikhs, Circles, Memorization (core academic domain)
- Smart Mushaf (QuranMatcher, MistakeDetector already tested — need controller + integration tests)
- AI module (mock LLM responses, test cost guard, test caching)
- Infrastructure (CacheService fallback, QueueService no-op behavior, EventEmitter listeners)
- Auth integration (token refresh, reuse detection)

**Estimate:** 3–4 weeks

---

## 3. Phase 13 Proposed Epic Structure

```
Phase 13 — Intelligence & Real-Time Platform

Epic 13.1: Infrastructure Hardening (2 weeks)
  ├─ 13.1.1 Provision Redis (Upstash) + wire queues
  ├─ 13.1.2 Configure SMTP + validate email delivery
  ├─ 13.1.3 Configure S3/R2 + validate file uploads
  ├─ 13.1.4 Wire AiQueueProcessor to orchestrator
  └─ 13.1.5 Add ScheduleModule + 5 cron jobs

Epic 13.2: Real-Time Layer (3 weeks)
  ├─ 13.2.1 WebSocket gateway (auth + tenant-scoped rooms)
  ├─ 13.2.2 Notifications push (wire EventsModule → gateway)
  └─ 13.2.3 Messaging real-time delivery

Epic 13.3: Recitation Analysis (5 weeks)
  ├─ 13.3.1 Audio upload endpoint + S3 storage
  ├─ 13.3.2 Whisper transcription worker (cloud API path)
  ├─ 13.3.3 Wire transcript → MistakeDetector → MasteryScore
  └─ 13.3.4 Recitation history API

Epic 13.4: Advanced AI (6 weeks)
  ├─ 13.4.1 Virtual Sheikh conversational engine
  ├─ 13.4.2 Memorization DNA profile
  ├─ 13.4.3 AI Heatmaps (predictive + explanatory)
  └─ 13.4.4 AI Forecasting predictive model

Epic 13.5: Similar Verses Engine (3 weeks)
  ├─ 13.5.1 Atlas Vector Search setup + ayah embeddings seeder
  └─ 13.5.2 Similar verses API + Smart Mushaf integration

Epic 13.6: Test Coverage Sprint (3 weeks)
  └─ 13.6.1 Bring service coverage to 60%+
```

**Total Phase 13 estimate: 20–22 weeks** (with parallel execution of 13.1–13.3 and 13.4–13.5, realistic calendar time: 12–14 weeks with 2 engineers)

---

## 4. Phase 13 Dependency Graph

```
Quran Seeded ─────────────────────────────────────────────────┐
                                                               │
Redis Provisioned ──────┬── AiQueue Wired ──── Virtual Sheikh  │
                        │                                      │
                        └── WebSocket Gateway ── Notifications │
                                                 Messaging     │
                                                               │
MOONSHOT_API_KEY ────────── AI Reports (sync) ─ AI Queue Async │
                            Virtual Sheikh                     │
                            Memorization DNA                   │
                            AI Heatmaps                        │
                            AI Forecasting                     │
                                                               ▼
S3/R2 Configured ─────── Audio Upload ─── Whisper ─── MistakeDetector
                                                       MasteryScore
                                                       (already done ✅)
                                          ┌────────────────────┘
Atlas Vector Search ──── Embeddings ──── Similar Verses
```

---

## 5. Readiness Scores by Epic

| Epic | Blocker Cleared? | Can Start? |
|---|---|---|
| 13.1 Infrastructure | REDIS_URL, SMTP, S3 secrets needed | ✅ Start immediately |
| 13.2 WebSocket | Redis must be provisioned | ⚠️ After 13.1.1 |
| 13.3 Recitation | S3 must work, Whisper API key | ⚠️ After 13.1.3 |
| 13.4 Advanced AI | MOONSHOT_API_KEY, ideally Redis + async queue | ⚠️ After 13.1.1 + 13.1.4 |
| 13.5 Similar Verses | Quran seeded, embedding API | ⚠️ After Task #2 |
| 13.6 Tests | No blockers | ✅ Start immediately |

---

## 6. Definition of Done for Phase 13

- [ ] Redis provisioned and all 5 queues processing jobs
- [ ] Quran data seeded (114 surahs, 6,236 ayahs verified)
- [ ] All 5 AI endpoints return real LLM responses (not errors)
- [ ] WebSocket gateway deployed and tested (notification + messaging)
- [ ] Audio upload → transcription → mistake detection → score update pipeline end-to-end tested
- [ ] Virtual Sheikh maintains conversation state across 3+ turns
- [ ] Similar verses returns semantic results for at least 10 test ayahs
- [ ] AI queue processes jobs asynchronously (job ID returned, result delivered via push or poll)
- [ ] 5 cron jobs registered and verified via logs
- [ ] Service test coverage ≥ 60%
- [ ] All Phase 12 outstanding issues closed
