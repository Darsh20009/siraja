---
name: Siraja Phase 11 AI Learning Intelligence Architecture
description: Cost-controlled, grounded-AI orchestration pattern for text/data-driven AI features (Mistake Intelligence, Recommendations, Forecast Explanations, Sheikh/Parent AI Reports). Read before touching the AI module or adding a new AI feature.
---

## Scope decision
ASR/speech-to-text is deferred to a later phase. Phase 11 only covers text/data-grounded pipelines that narrate or analyze data already computed by other modules (Mistakes, Reviews, Progress, AyahPerformance, Forecast) — it never recomputes or overrides that data. This boundary must hold for any new AI feature added later: gather grounding data from an existing repository/use-case, then hand it to the AI layer. Never let an AI use-case write back to an authoritative collection.

## Central choke point
Every AI feature use-case calls through one service, `AiInsightOrchestratorService.getOrGenerate()`: cache lookup (via a source-data hash) → availability check → budget check (`AiCostGuardService`) → LLM call (`ILlmProvider`) → usage-ledger record → persist. Individual use-cases only gather grounding data and build a prompt — they never call the LLM or ledger directly.
**Why:** keeps cost control and caching uniform; a use-case cannot accidentally bypass the budget guard.
**How to apply:** any new AI feature must go through this orchestrator, not call `ILlmProvider` directly.

## Schema reuse over duplication
Reused the pre-existing but previously-unwired `AiRequest`/`AiReport` Mongoose schemas (added `sourceDataHash`, `modelVersion`, `acknowledgedBy`, `acknowledgedAt`) instead of creating a new `ai_insights` collection, since the codebase already had this scaffolding sitting unused.
**Why:** avoids two competing AI-record schemas in the same codebase.
**How to apply:** before adding a new schema for an AI-adjacent feature, check `database/mongoose/schemas/ai-*.ts` first.

## Cost control stack (target $50-100/month)
Three layers, in order: (1) cache hit via `sourceDataHash` match skips the LLM entirely, (2) cheap short-circuit returns a canned non-persisted response when there's nothing to analyze (zero mistakes/reviews/weak ayahs) — no LLM call, no ledger entry, (3) `AiCostGuardService` checks daily+monthly spend from a dedicated `ai_usage_ledger` collection before allowing a real call, throwing `AiUnavailableException('AI_BUDGET_EXCEEDED')` past the limit.
**Why:** conservative budget was a hard requirement; layering cheap checks before the expensive one minimizes spend.
**How to apply:** any new AI feature should implement its own short-circuit condition and rely on the shared orchestrator for the cache+budget layers.

## Read-vs-force RBAC split
Plain "read" AI endpoints auto-generate on cache miss and are available to Student/Parent/Sheikh/Supervisor/Admin (`AI.READ`). An explicit `force=true` regenerate is restricted to Sheikh/Supervisor/Admin (`AI.CREATE`), enforced a second time *inside* each use-case (not just the controller guard) — a Student/Parent with a valid `AI.READ` grant still cannot pass `force=true` to trigger a paid regeneration.
**Why:** prevents students/parents from driving up AI spend via forced regeneration, defense-in-depth against a future guard refactor.
**How to apply:** any new generate-* use-case must re-check the force-regenerate role gate itself, not rely solely on the controller decorator.

## Graceful degradation without a vendor key
`MoonshotProvider` checks `MOONSHOT_API_KEY` at call time, not boot time — the app boots cleanly with the key unset, throwing `AiUnavailableException('AI_UNAVAILABLE')` only when a feature is actually invoked. `MOONSHOT_API_KEY` was deliberately left out of `env.validation.ts`'s required list, mirroring the pattern used for optional email vars.
**Why:** AI is an additive feature; its absence must never block the rest of the platform from booting.
**How to apply:** any new external AI/optional-vendor integration should follow this same call-time (not boot-time) check pattern.

## Advisory-only boundary
`AiReport.acknowledgedBy`/`acknowledgedAt` let a Sheikh/Supervisor/Admin explicitly sign off on a report (`AI.APPROVE`). Nothing in the platform auto-applies an AI report's content to a student's authoritative record.
**Why:** locked-in product requirement — "AI must be an assistant only, never a source of truth."
**How to apply:** never wire an AI use-case's output back into Progress/Mistakes/Reviews/Exams write paths; acknowledgement is a human action, not a data mutation trigger.
