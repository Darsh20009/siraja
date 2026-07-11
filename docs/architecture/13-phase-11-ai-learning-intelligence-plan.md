# Phase 11 — AI Learning Intelligence Architecture (Plan)

**Status:** Proposed — planning only, no implementation. Subscriptions/Billing (previously slated as Phase 11) is postponed indefinitely; Siraja remains free, donations may come later. This document supersedes that plan as the active Phase 11. Wait for explicit approval before any AI coding.

**Requirements locked in for this phase:** Moonshot AI only (no other LLM vendor), Arabic-first, Quran-memorization-focused, tools for Sheikh + Student + Parent. No SMS/WhatsApp (carried over from Phase 10), no Payments/Billing (postponed).

---

## 0. Grounding: what already exists to build on

AI features are additive on top of Phases 5–9 data, not a replacement for them:

- **`memorization_records`** (Phase 7) — per-evaluation sheikh grading of new material (`QuranRange`, `EvaluationGrade`, `score`).
- **`review_records`** (Phase 7) — murājaʿah sessions with `retentionGrade` and `nextReviewDueAt`.
- **`quran_mistakes`** (Phase 7) — fine-grained mistake log (`MistakeType`, `MistakeSeverity`, per-ayah, linked to a memorization or review record).
- **`ayah_performance`** (Phase 9) — materialised per-(student, ayah) state: `confidenceScore`, `heatmapLevel`, `mistakeCount`, `revisionCount`, last-touched timestamps.
- **`student_progress`** (Phase 7) — materialised aggregate (streaks, memorization/revision percentages).
- **Forecast (Phase 7)** — a deterministic heuristic already exists (`GetCompletionForecastUseCase`): daily pace from last-30-days activity × remaining ayahs = estimated completion date, plus a consistency score. This is the baseline the AI forecast strategy either augments or replaces.
- **Provider abstraction precedent (Phase 10)** — `IEmailProvider`/`EMAIL_PROVIDER` DI token pattern is the template every AI integration point in this phase should copy: an interface owned by the calling module, a concrete adapter bound in one place, env-var-only configuration, and graceful no-op when unconfigured.

Every pipeline below reads from and writes back to these existing collections/materialised views rather than inventing parallel storage, consistent with how Phase 9 (Smart Mushaf) built on top of Phase 7 instead of duplicating it.

---

## 1. AI Architecture Blueprint

### Bounded context
A new top-level bounded context, `modules/ai/` (or split into `ai-recitation`, `ai-recommendations`, `ai-forecast`, `ai-assistant` sub-modules — recommendation: one `AiModule` composition with focused sub-services, mirroring how `SmartMushafModule` is a facade over other Phase 9 modules, since these AI capabilities are cross-cutting reads over Phases 5, 7, and 9 data, not a new independent domain).

### Layering (Clean Architecture, unchanged convention)
```
modules/ai/
  domain/
    repositories/           # IAiInsightRepository, IAiUsageLedgerRepository
    value-objects/          # AiPromptContext, AiRiskFlag, etc.
  application/
    use-cases/              # one per capability (see pipelines below)
    dto/
  infrastructure/
    controllers/            # thin, RBAC-gated endpoints
    providers/
      moonshot/
        moonshot.provider.ts        # implements ILlmProvider
        moonshot-http.client.ts     # raw HTTP wrapper, no business logic
    repositories/
    schemas/                 # ai_insights, ai_usage_ledger, ai_audio_jobs
```

### Core abstraction: `ILlmProvider`
```ts
interface ILlmChatOptions {
  system?: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  tenantId: string;         // always passed for cost-ledger attribution
  featureTag: AiFeatureTag; // e.g. 'mistake-explanation', 'revision-plan'
}
interface ILlmProvider {
  chat(options: ILlmChatOptions): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number } }>;
}
```
Exactly one concrete implementation exists in this phase: `MoonshotProvider`. No other vendor is coded against, even behind the interface — the interface exists so a future vendor swap doesn't touch call sites, not because multiple vendors are supported now.

### New schemas (materialised, following the `ayah_performance`/`student_progress` convention)
- **`ai_insights`** — one document per AI-generated artifact (recommendation, forecast note, mistake explanation), tagged with `tenantId`, `studentId`, `type`, `generatedAt`, `modelVersion`, `sourceDataHash` (so stale insights can be detected/regenerated when underlying data changes), and the actual content. This is the audit trail and the cache — AI output is never only-in-memory.
- **`ai_usage_ledger`** — one row per LLM call: `tenantId`, `userId`, `featureTag`, `promptTokens`, `completionTokens`, `estimatedCostUsd`, `createdAt`. Feeds the cost-control strategy (§9) and multi-tenant strategy (§10).
- **`ai_audio_jobs`** — one row per recitation-audio submission: `tenantId`, `studentId`, `status` (`QUEUED → TRANSCRIBING → ANALYZING → DONE/FAILED`), `audioRef` (object storage key, never inline binary in Mongo), `resultRef` (link to the `quran_mistakes`/`ai_insights` records it produced).

### RBAC
New `AI` permission category, following the exact pattern of `SMART_MUSHAF`:
- Sheikh/Admin: `CREATE` (trigger analysis, generate recommendations for their own students), `READ`.
- Student: `READ` own AI insights only; `CREATE` for self-service tools explicitly designed for students (e.g. "explain my mistake" — see §5/§6).
- Parent: `READ` only, scoped to linked children (reuse the Phase 9 `assertCanAccessStudent` helper — no new ownership primitive needed).
- Super Admin/Tenant Admin: `READ` for oversight + `UPDATE`/`DELETE` for moderation (e.g. redacting a bad AI output).

---

## 2. Moonshot AI Integration Strategy

- **Vendor:** Moonshot AI (Kimi models), OpenAI-compatible chat completions API. No dedicated Replit connector exists for Moonshot today — confirmed via integration search. Access is a direct HTTPS call from `MoonshotProvider` using an API key stored as a Replit secret (`MOONSHOT_API_KEY`), requested via the environment-secrets flow when implementation starts — never hardcoded, never logged.
- **Config surface (env-var only, mirrors `EMAIL_HOST` pattern):** `MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL` (defaults to Moonshot's public endpoint), `MOONSHOT_MODEL` (e.g. `moonshot-v1-8k` / `moonshot-v1-32k` depending on context size needed), `MOONSHOT_MAX_MONTHLY_COST_USD` (see §9).
- **Graceful degradation:** if `MOONSHOT_API_KEY` is absent, `MoonshotProvider` logs a warning and every AI endpoint returns a `503 AI_UNAVAILABLE` with a clear message, rather than crashing the app — same philosophy as `SmtpEmailProvider`'s no-op-when-unconfigured.
- **Arabic-first prompting:** every system prompt is authored in Arabic by default with an explicit instruction to respond in Arabic (Modern Standard Arabic, Quranic-register vocabulary where relevant), with an opt-in `locale` parameter per-request for tenants/users who want English output (the platform already supports RTL-first Flutter UI per `replit.md`, so Arabic-first output is a UI-compatible default, not a new constraint).
- **Domain grounding:** prompts are never "bare" LLM calls — every request assembles context strictly from the platform's own data (ayah text from Phase 5 Surahs/Ayahs, mistake history from `quran_mistakes`, performance from `ayah_performance`) so Moonshot is reasoning over Siraja's verified data, not inventing Quranic content from its own training data. This is a hard safety rule (see §9) — the model is never asked to generate or verify Quranic text itself, only to reason about a student's recorded performance against text the platform already trusts.
- **Timeouts & retries:** short timeout (e.g. 15s) with a single retry on transient network failure; no retry on 4xx (bad request/auth) to avoid masking config errors.

---

## 3. Audio Processing Pipeline

Scope: ingest a student's recitation audio for later analysis (Recitation Analysis, §4) and optional mistake detection (§5).

1. **Upload** — Sheikh or Student uploads audio (mobile-recorded recitation) via a new endpoint; the file is streamed to object storage (not Mongo) and an `ai_audio_jobs` document is created with `status: QUEUED`.
2. **Transcription** — a speech-to-text step converts Arabic Quranic recitation audio into text with timing/segment metadata. This is a distinct capability from Moonshot's chat completion API (Moonshot is a text LLM, not an ASR/transcription service) — this pipeline needs a dedicated Arabic ASR step. Two realistic options to decide between at implementation time:
   - A specialized Quranic-recitation ASR model/service (higher accuracy for tajweed-heavy speech, but likely a separate vendor decision from Moonshot).
   - A general Arabic ASR provider, with Moonshot then used purely for the downstream reasoning (comparing transcript to expected ayah text, explaining discrepancies).
   This is the one place in this phase where "Moonshot AI only" cannot literally mean "Moonshot handles every step" — Moonshot is a text-reasoning model, not audio-native. The plan keeps Moonshot as the *only LLM/reasoning vendor*, while flagging that a transcription step needs its own (separate, non-LLM) provider decision — this is called out explicitly in Open Questions (§ bottom) rather than assumed silently.
3. **Alignment** — the transcript is aligned against the expected ayah range (from the student's current memorization assignment) to produce a word-level diff (expected vs. spoken).
4. **Handoff** — the diff feeds directly into the Recitation Analysis pipeline (§4); raw audio is retained only per the tenant's data-retention setting (default: 30 days, configurable), then purged — audio is evidence for a training session, not permanent record.
5. **Status & UX** — `ai_audio_jobs.status` is polled by the client (`QUEUED → TRANSCRIBING → ANALYZING → DONE/FAILED`); failures are terminal with a human-readable reason (never a silent drop).

---

## 4. Recitation Analysis Pipeline

Input: the word-level expected-vs-spoken diff from §3 (or, for text-only flows without audio, a Sheikh's manual mistake entry as today).

1. Compute per-ayah accuracy (words correct / words expected) purely deterministically (no LLM needed for the diff itself — this is string/phoneme alignment, not reasoning).
2. Feed the structured diff (not raw audio, not free text) to Moonshot with a tightly-scoped prompt: "given this expected ayah text and this list of word-level discrepancies, classify and briefly explain each discrepancy in Arabic" — output constrained to the platform's existing `MistakeType`/`MistakeSeverity` enums (Moonshot is asked to *classify into existing categories*, never to invent new taxonomy), so results merge directly into `quran_mistakes` without a translation layer.
3. Persist results as new `quran_mistakes` entries (`type`, `severity`, `note` = Moonshot's Arabic explanation) linked to the triggering `memorization_records`/`review_records` document — reusing Phase 7's schema exactly, so all of Phase 7/9's existing aggregation (mistake frequency analytics, heatmaps) picks up AI-detected mistakes automatically with zero changes to those modules.
4. Sheikh retains final authority: AI-detected mistakes are created with `resolutionStatus: OPEN` and a `source: 'AI'` marker (new optional field on `QuranMistake`, additive/non-breaking) so a Sheikh can confirm, edit, or dismiss them — AI never silently overrides a human evaluation.

---

## 5. Mistake Detection Pipeline

This is the aggregate/pattern layer on top of §4's per-session detection — "what mistakes does this student make repeatedly, and why."

1. **Trigger:** on-demand (Sheikh requests an analysis) or scheduled (e.g. weekly) per student, reading the existing `quran_mistakes` frequency data (Phase 7 already computes frequency analytics — this pipeline consumes that, doesn't recompute it).
2. **Reasoning step:** Moonshot receives a structured summary (top N recurring mistake types/locations, e.g. "confuses ذ and ز in Surah Al-Baqarah, 6 occurrences this month") and produces:
   - A plain-Arabic explanation of the likely root cause (e.g. makhraj/tajweed rule confusion) grounded only in the provided mistake categories — not free-form linguistic speculation beyond the given data.
   - A short, concrete practice suggestion (e.g. specific ayahs to drill) chosen from the student's actual assigned range, not invented content.
3. **Output:** persisted as an `ai_insights` document (`type: 'mistake-pattern'`), surfaced to Sheikh (full detail) and Student (simplified, encouraging tone) and summarized for Parent (§ "Parent insights" below).
4. **Safety constraint:** the pipeline never tells a student "you got the ayah wrong" without grounding — every explanation must cite the specific mistake records it's based on, so a Sheikh/parent can trace any AI claim back to real recorded data (auditability requirement, ties into §9).

---

## 6. Memorization Recommendation Engine

"What should this student memorize/focus on next."

1. **Inputs (all already computed, no new heavy computation):** `student_progress` (percentages, streak), `ayah_performance` heatmap (weak/needs-review ayahs), current assignment/pace from Attendance/Assignments (Phase 8).
2. **Deterministic pre-filter:** compute a candidate list algorithmically first (e.g. next unmemorized range in the student's assigned mushaf order, plus any `heatmapLevel: WEAK` ayahs due for reinforcement) — this candidate generation stays rule-based, not LLM-based, for reliability and zero cost on every page load.
3. **Moonshot's role is narrowly scoped to explanation and sequencing rationale, not selection from scratch:** given the rule-based candidate list plus the student's recent pace/consistency, Moonshot produces a short Arabic narrative recommendation ("today, focus on consolidating Surah Al-Mulk verses 1–10 before starting new material, because...") and can re-rank the *given* candidates, but cannot introduce ayahs outside the candidate set. This bounds hallucination risk to zero for the actual Quranic content recommended.
4. **Sheikh assistance tool:** a Sheikh-facing view surfaces the same recommendation with more clinical detail (mistake stats, pace numbers) to help lesson planning — same underlying `ai_insights` document, different rendering by role, not a separate pipeline.
5. **Output:** `ai_insights` (`type: 'memorization-recommendation'`), regenerated when `sourceDataHash` (progress/performance snapshot) changes meaningfully, not on every request — ties into cost control (§9).

---

## 7. Revision Recommendation Engine

"What previously memorized material is due/at-risk for revision."

1. **Deterministic base (already exists):** `review_records.nextReviewDueAt` is a spaced-repetition-style due date already computed in Phase 7. This pipeline does not replace that scheduling logic.
2. **AI value-add:** given the list of currently-due/overdue ranges plus their `ayah_performance.confidenceScore`/`heatmapLevel`, Moonshot prioritizes and explains *why* (e.g. "Surah Yusuf verses 30–40 is overdue by 12 days and has a Weak heatmap level — prioritize this over Surah Al-Kahf which is only 2 days overdue but still Good") and suggests a session structure (how much time to allocate to each range) — again, ranking/explaining a provided list, never inventing which ranges are due.
3. **Output:** `ai_insights` (`type: 'revision-recommendation'`), same audit/versioning pattern as §6.
4. **Student self-tool:** a simplified "what should I revise today" view for students, using the same underlying data with a softer, encouraging tone — one more example of role-based rendering over one pipeline rather than parallel logic.

---

## 8. Completion Forecast AI Strategy

The existing `GetCompletionForecastUseCase` (deterministic: pace × remaining ayahs) is **not replaced** — it remains the source of truth for the numeric estimate, since it's cheap, instant, and fully explainable without any AI cost. AI is additive:

1. Moonshot receives the deterministic forecast output (`dailyPaceAyahs`, `consistencyScore`, `estimatedCompletionDate`, `remainingAyahs`) plus recent trend (e.g. pace over the last 4 weeks, not just last 30 days) and produces:
   - A human-readable Arabic narrative explaining the forecast in encouraging, non-judgmental language for students/parents ("at your current pace...").
   - Risk flagging: if consistency has been dropping, an explicit (data-grounded) note to the Sheikh, not hidden from the student but not the headline message to them either.
2. **No AI-only numeric estimate is ever shown** — the deterministic date/day-count from Phase 7 is always displayed; AI only adds narrative framing around it. This avoids the failure mode of an LLM inventing a plausible-sounding but wrong completion date.
3. Cadence: computed at most once per day per student (forecasts don't meaningfully change hour-to-hour), cached in `ai_insights`.

---

## 9. AI Safety & Cost Control Strategy

### Safety
- **No unverified Quranic content generation.** Moonshot is never asked to produce, correct, or verify Quranic text itself — Ayah text always comes from Phase 5's verified `Surahs`/`Ayahs` collections. Moonshot only reasons *about* performance data and *explains in prose*. This is the single most important guardrail given the religious-text domain.
- **Grounded-only prompting.** Every prompt assembled by a use-case embeds only platform data (mistake records, performance scores, assigned ranges) — no open-ended "tell me about Surah X" prompts are exposed to end users. This is an assistance layer over the student's own recorded data, not a general Islamic-knowledge chatbot, per the stated scope (Sheikh/Student/Parent tools around memorization, not a general Q&A feature).
- **Output constrained to existing taxonomies where possible** (§4, §5) — reduces both hallucination surface and downstream integration complexity.
- **Human-in-the-loop for anything that writes a mistake record** — AI-created `quran_mistakes` entries are always `OPEN`/unconfirmed until a Sheikh reviews them (§4.4); AI never finalizes a grade or evaluation status on its own.
- **Content moderation / bad-output handling:** `ai_insights` documents support Tenant Admin/Super Admin `DELETE`/redaction (already scoped in the RBAC section) for the rare case an output is inappropriate or wrong; deleting an insight never deletes the underlying source data it was based on.
- **PII minimization in prompts:** prompts reference students by ID/first-name context only as needed for tone, never send full profile data, contact info, or unrelated records to Moonshot.

### Cost control
- **Per-tenant monthly budget** (`MOONSHOT_MAX_MONTHLY_COST_USD`, plus an optional per-tenant override stored on the Tenant document) — every `MoonshotProvider.chat()` call first checks `ai_usage_ledger` aggregated spend for the current month against the budget; over-budget calls are rejected with a clear `AI_BUDGET_EXCEEDED` error rather than silently degrading quality or queuing indefinitely.
- **Caching via `ai_insights` + `sourceDataHash`** (§1) — never regenerate an insight if the underlying data hasn't materially changed since the last generation; this is the primary cost lever, since memorization/revision/forecast data changes at most a few times a day per student, not per page view.
- **Token budgets per feature** (`maxTokens` per `AiFeatureTag`) — short, bounded outputs (recommendations/explanations are meant to be concise coaching notes, not essays), keeping per-call cost predictable and reviewable.
- **Rate limiting per user** on top of the existing global `ThrottlerModule`, specifically for AI-triggering endpoints, to prevent a single user from exhausting a tenant's budget via rapid repeated requests.
- **Full auditability:** `ai_usage_ledger` gives Super Admin a per-tenant, per-feature cost breakdown from day one — this is a reporting need, not an afterthought, since a free platform absorbing LLM costs needs visibility to stay sustainable.

---

## 10. Multi-Tenant AI Strategy

- **Data isolation:** identical to every other Phase — `ai_insights`, `ai_usage_ledger`, `ai_audio_jobs` all carry `tenantId` and every repository method is tenant-scoped, following the pattern audited and confirmed clean in Phase 10.
- **Cost isolation:** `ai_usage_ledger` is aggregated per-tenant so one tenant's usage never silently consumes another's budget; the per-tenant override (§9) lets Super Admin grant a specific tenant (e.g. a larger academy) a higher budget without a platform-wide change.
- **Feature toggle per tenant:** a `Tenant.aiFeaturesEnabled` flag (additive field) lets Super Admin disable AI features for a specific tenant entirely (e.g. a tenant that hasn't consented to AI processing of their students' data, or during a cost-control incident) without a code deploy.
- **Configuration stays platform-global, not per-tenant**, for the Moonshot API key/model/base URL — tenants don't bring their own LLM credentials in this phase (keeps the "Moonshot AI only" constraint simple and avoids a credential-management surface per tenant); this can be revisited later if a large tenant wants their own billing relationship with Moonshot.
- **No cross-tenant learning.** Every prompt/insight is generated from a single tenant's/student's data only — Moonshot is never given aggregated data across tenants (e.g. "how do students at other academies perform") to avoid any tenant-data leakage through model outputs, even indirectly.

---

## Explicit non-goals for Phase 11 (planning)

- No implementation of any kind — this document is architecture only.
- No general-purpose Islamic-knowledge chatbot — scope is strictly memorization/revision/mistake/forecast assistance grounded in the student's own recorded data.
- No SMS/WhatsApp delivery of AI content (carried over constraint from Phase 10).
- No Payments/Billing tie-in (postponed phase) — AI features are not gated by any plan/tier in this phase since Siraja remains free.
- No other LLM vendor coded against, even behind the `ILlmProvider` interface, beyond Moonshot.

## Open questions before implementation (need your input)

1. **Arabic ASR/transcription vendor for the Audio Processing Pipeline (§3).** Moonshot is a text-reasoning LLM, not a speech-to-text service — recitation audio needs a separate transcription step before Moonshot can reason about it. Do you want to select a specific Arabic/Quranic-recitation ASR provider now, or defer the Audio/Recitation-from-audio pipelines (§3–4's audio path) to a later sub-phase and start with the *text/manual-entry* mistake and recommendation pipelines (§5–8), which need no audio vendor at all and can ship independently?
2. **Per-tenant AI cost ceiling** — is there a target platform-wide monthly AI budget in mind (even a rough number), or should the default `MOONSHOT_MAX_MONTHLY_COST_USD` start conservatively (e.g. low, per-tenant) and be tuned after real usage data comes in?
3. **Audio retention window** — is 30 days an acceptable default for storing raw recitation audio before automatic deletion, or does this need to be configurable per tenant from day one for privacy/consent reasons?

## Deliverable when approved

Same audited-phase format as Phases 5–10: full Clean Architecture per sub-capability, `AI` permission category wired into the registry/matrix, `ILlmProvider`/`MoonshotProvider` following the Phase 10 email-provider pattern exactly, new schemas materialised and tenant-indexed, `tsc --noEmit` clean, workflow boots live, and a dedicated audit report before Phase 12.
