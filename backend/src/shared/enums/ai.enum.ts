/**
 * Phase 11 — AI Learning Intelligence Architecture.
 *
 * `AiFeatureType` is the single taxonomy shared by `AiRequest.type` and
 * `AiReport.type` (see `database/mongoose/schemas/ai-request.schema.ts` /
 * `ai-report.schema.ts`) and by `AiUsageLedger.featureTag` — one enum,
 * referenced everywhere an AI capability needs to be identified, so a
 * cost/cache/report lookup for a feature is always keyed consistently.
 *
 * Scope approved for this phase: text/data-driven pipelines only — no
 * audio/recitation-from-speech capability yet (RECITATION_ANALYSIS is
 * reserved for a later phase once an Arabic ASR vendor is selected; it is
 * not wired to any use-case today).
 */
export enum AiFeatureType {
  MISTAKE_INTELLIGENCE = 'mistake_intelligence',
  REVISION_RECOMMENDATION = 'revision_recommendation',
  MEMORIZATION_RECOMMENDATION = 'memorization_recommendation',
  FORECAST_EXPLANATION = 'forecast_explanation',
  SHEIKH_REPORT = 'sheikh_report',
  PARENT_REPORT = 'parent_report',
  /** Reserved for a later phase (requires an Arabic ASR vendor decision) — not used yet. */
  RECITATION_ANALYSIS = 'recitation_analysis',
}

/** Backward-compatible alias — AiRequest.type and AiReport.type share the same taxonomy. */
export { AiFeatureType as AiRequestType };
/** Backward-compatible alias — see `AiFeatureType`. */
export { AiFeatureType as AiReportType };

export enum AiRequestStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
