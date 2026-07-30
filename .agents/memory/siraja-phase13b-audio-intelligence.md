---
name: Siraja Phase 13B Audio Intelligence
description: Architecture decisions, engine inventory, bug fixes, RBAC mapping, and known gaps for the local audio analysis pipeline. Read before touching AudioIntelligenceModule.
---

# Phase 13B — Local Quran Audio Intelligence

## Status: Complete
64 tests passing across 6 spec files. App boots cleanly with all 7 audio-intelligence routes registered. No external AI services.

## Core constraint
No external AI. All computation is deterministic TypeScript in-process. Same pattern as Phase 13A: engines are plain classes instantiated with `new` inside pipeline stages — NOT registered as NestJS providers.

## Module registration
`AudioIntelligenceModule` is registered in `src/app.module.ts` at the bottom of the imports array (after `IntelligenceModule`).

## RBAC
`PermissionCategory.AUDIO_INTELLIGENCE` is now registered in `permission-registry.ts` with actions CREATE, READ, DELETE.
Import path for `RequirePermissions` in all audio-intelligence controllers is `@common/decorators/require-permissions.decorator` (NOT `@shared/authorization/...`).

## Engine inventory (all in `domain/engines/`)
- `AudioAlignmentEngine` — Levenshtein edit-distance alignment of ASR tokens to expected Quran words
- `AudioMistakeEngine` — detects wrong_word, skipped_word, repeated_word, wrong_ayah_order, skipped_ayah, pronunciation_error; skipped_ayah requires ≥ 2 words in ayah (single deletion = skipped_word)
- `TajweedAnalysisEngine` — madd, ghunna, qalqala, idgham, iqlab, ikhfa, waqf; ghunna regex allows optional vowel diacritic between noon/meem and shadda: `/[\u0646\u0645][\u064B-\u0652]?\u0651/`
- `ConfidenceEngine` — ASR confidence aggregation; standardDeviation does NOT filter confidence > 0 (confidence-0 is valid data)
- `AudioScoreEngine` — composite = accuracy×0.35 + tajweed×0.30 + fluency×0.20 + consistency×0.15
- `AudioRecommendationEngine` — 15 rules, sorted by priority, capped at 8

## Provider strategy
Three null providers are the defaults (sessions complete as `no_asr`). Replace via DI token override:
- `SPEECH_RECOGNITION_PROVIDER` → `ISpeechRecognitionProvider`
- `AUDIO_PREPROCESSOR` → `IAudioPreprocessor`
- `AUDIO_FEATURE_EXTRACTOR` → `IAudioFeatureExtractor`

## Known bug fixes applied
1. `student.user` → `student.userId` in upload use case (StudentRecord has no `.user` field)
2. `@types/multer` missing — installed as devDependency
3. `AudioMistakeEngine.detect` return type: `flagRecurrence(raw) as unknown as MistakeDetection[]` cast needed because engine produces pre-persistence records without `id`/`createdAt`
4. `PermissionCategory.AUDIO_INTELLIGENCE` was absent from CATEGORY_ACTIONS — added
5. Ghunna regex: noon/meem + optional vowel + shadda (the vowel diacritic sits between letter and shadda in Quranic text like إِنَّ)
6. ConfidenceEngine.standardDeviation filtered out confidence-0 words — removed that filter
7. AudioMistakeEngine skipped_ayah: required `> 0` words but single word with empty recognisedText was misclassified as skipped_ayah — changed to `> 1`

## Architecture doc
`backend/docs/architecture/audio-intelligence.md` — comprehensive reference including pipeline stages, data models, provider interfaces, RBAC table, score formula, and known gaps.
