# Phase 13B — Local Quran Audio Intelligence

**Status:** Complete  
**Module:** `src/modules/audio-intelligence/`  
**Constraint:** No external AI services — all computation runs deterministically in-process.

---

## 1. Overview

Phase 13B adds a fully local audio analysis pipeline to Siraja. When a student uploads an audio recitation, the system:

1. Validates and stores the file
2. Runs a 9-stage analysis pipeline
3. Produces per-word alignments, mistake detections, tajweed observations, a composite score, and personalised recommendations
4. Exposes parent and sheikh insight views over the results

No LLM, no remote model inference, no external API call — every stage is deterministic TypeScript.

---

## 2. Architecture

### 2.1 Layer diagram

```
Controller (HTTP)
    │
    ├─ UploadAudioSessionUseCase
    │       ↳ IStorageProvider   (upload file)
    │       ↳ IAudioSessionRepository  (create pending session)
    │
    └─ ProcessAudioSessionUseCase
            ↳ AudioPipelineService.run(ctx)
                   │
                   ├─ AudioValidationStage
                   ├─ NoiseReductionStage        ← IAudioPreprocessor (null)
                   ├─ VoiceActivityDetectionStage ← IAudioPreprocessor (null)
                   ├─ AudioSegmentationStage
                   ├─ FeatureExtractionStage     ← IAudioFeatureExtractor (null)
                   ├─ QuranAlignmentStage        ← ISpeechRecognitionProvider (null)
                   │       ↳ AudioAlignmentEngine
                   ├─ MistakeDetectionStage
                   │       ↳ AudioMistakeEngine
                   │       ↳ TajweedAnalysisEngine
                   ├─ ScoringStage
                   │       ↳ ConfidenceEngine
                   │       ↳ AudioScoreEngine
                   └─ RecommendationStage
                           ↳ AudioRecommendationEngine
                                    ↳ IAudioSessionRepository  (saveProcessingResults)
```

### 2.2 Clean Architecture boundaries

| Layer | Location | Role |
|-------|----------|------|
| **Domain** | `domain/` | Entities, engines, rules, repository interfaces |
| **Application** | `application/` | Use cases, pipeline service, pipeline stages |
| **Infrastructure** | `infrastructure/` | Controllers, repository implementations, provider interfaces + null providers |

Domain has **zero** NestJS or Mongoose imports. Engines are plain TypeScript classes instantiated with `new` inside stages — no DI registration, no test setup overhead.

---

## 3. Data Models

### AudioSession *(aggregate root)*
```
id            ObjectId
tenantId      string
studentId     string
surahNumber   number          (1–114)
fromAyah      number
toAyah        number
fileKey       string          (S3/R2 object key)
format        AudioFormat     (wav|mp3|ogg|webm|m4a|flac)
durationSeconds number
fileSizeBytes number
sampleRate    number
channels      number
status        AudioSessionStatus  (pending|processing|completed|failed|no_asr)
score?        AudioScore      (embedded)
recommendations AudioRecommendation[]   (embedded)
totalSegments number
totalMistakes number
criticalMistakes number
tajweedObservationCount number
memorizationRecordId? string (cross-module link)
processedAt?  Date
errorMessage? string
createdAt     Date
```

### AudioSegment
```
id, sessionId, segmentIndex
startSeconds, endSeconds, durationSeconds
voiceActivityConfidence, energyDbfs, pitchHz
wordAlignments  WordAlignment[]   (embedded)
createdAt
```

### WordAlignment *(embedded in AudioSegment)*
```
segmentId, recognisedText, expectedText
surahNumber, ayahNumber, wordIndex
startSeconds, endSeconds
confidence     0–1 (ASR word confidence)
isMatch        boolean
editDistance   number
```

### MistakeDetection *(separate collection: audio_mistake_detections)*
```
id, sessionId, segmentId?
type          AudioMistakeType
severity      critical|major|minor
surahNumber?, ayahNumber?, wordIndex?
recognisedText?, expectedText?, startSeconds?
description, isRecurring
createdAt
```

AudioMistakeType taxonomy: `wrong_word` | `skipped_word` | `repeated_word` | `wrong_ayah_order` | `skipped_ayah` | `pronunciation_error` | `madd_error` | `ghunna_error` | `qalqala_error` | `waqf_error` | `idgham_error` | `iqlab_error` | `ikhfa_error`

### TajweedObservation *(separate collection: tajweed_observations)*
```
id, sessionId, segmentId?
rule          TajweedRule
outcome       correct|incorrect|undetectable
expectedCounts?, measuredCounts?
surahNumber?, ayahNumber?, wordIndex?, startSeconds?
description, createdAt
```

TajweedRule coverage: `madd_tabii` | `madd_muttasil` | `ghunna` | `qalqala` | `idgham_bighunn` | `iqlab` | `ikhfa` | `waqf_tam` | `waqf_kafi`

### AudioScore *(embedded in AudioSession)*
```
compositeScore  0–100
breakdown { accuracyScore, tajweedScore, fluencyScore, consistencyScore }
totalExpectedWords, correctWords, insertedWords, deletedWords
totalMistakes, criticalMistakes, majorMistakes, minorMistakes
wordsPerMinute, speechDurationSeconds, asrConfidenceScore
tier  AudioScoreTier  (excellent|good|needs_improvement|critical)
```

Score formula:
```
compositeScore = accuracy×0.35 + tajweed×0.30 + fluency×0.20 + consistency×0.15
```

---

## 4. Processing Pipeline

Each stage receives a mutable `AudioPipelineContext` and writes its output fields.

| # | Stage | Input | Output |
|---|-------|-------|--------|
| 1 | **AudioValidation** | raw buffer | `durationSeconds`, `sampleRate`, `channels` |
| 2 | **NoiseReduction** | audioBuffer | `preprocessedBuffer`, `noiseFloorDbfs` |
| 3 | **VoiceActivityDetection** | preprocessedBuffer | `vadSegments`, `speechRatio`, `totalSpeechSeconds` |
| 4 | **AudioSegmentation** | vadSegments | `segments[]` |
| 5 | **FeatureExtraction** | segments | `segmentFeatures` map |
| 6 | **QuranAlignment** | segments + features + expectedWords | `wordAlignments[]`, `correctWords`, `deletedWords`, `insertedWords` |
| 7 | **MistakeDetection** | wordAlignments + features | `mistakes[]`, `tajweedObservations[]` |
| 8 | **Scoring** | everything above | `score` |
| 9 | **Recommendation** | score + mistakes + tajweed | `recommendations[]` |

Stages 2, 3, 5, 6 delegate to provider interfaces. When no real provider is wired (default), the Null providers produce zero/empty data and `ctx.usedNullAsrProvider` is set to `true` → session status becomes `no_asr` instead of `completed`.

---

## 5. Engines

All engines are **pure TypeScript classes** with no NestJS imports. They are instantiated with `new` inside pipeline stages for zero-overhead testing.

### AudioAlignmentEngine
Aligns ASR transcript tokens to the expected Quran word list using edit distance (Levenshtein). Produces `WordAlignment[]`. Normalises Arabic text (strips diacritics) before comparison.

### AudioMistakeEngine
Detects structural recitation errors from `WordAlignment[]`:
- `skipped_ayah` — all words in an ayah are deletions (requires ≥ 2 words to distinguish from a single missed word)
- `wrong_ayah_order` — ayah number sequence regresses
- `skipped_word` — deletion (recognisedText empty, expectedText present)
- `repeated_word` — consecutive identical recognisedText values
- `wrong_word` — substitution (!isMatch)
- `pronunciation_error` — matched but ASR confidence < 40%

Recurrence flagging: mistakes of the same type appearing ≥ RECURRENCE_THRESHOLD (3) times are marked `isRecurring: true`. Recurring `major` mistakes are promoted to `critical`.

### TajweedAnalysisEngine
Evaluates tajweed rules by pattern-matching Arabic text and measuring acoustic features:
- **Madd** (tabii, muttasil): duration-based; requires real acoustic features
- **Ghunna**: noon/meem with shadda — regex allows optional vowel diacritic between letter and shadda
- **Qalqala**: any of ق ط ب ج د present
- **Idgham / Iqlab / Ikhfa**: noon-sakinah context detection
- **Waqf**: silence gap analysis between words; >1s at ayah boundary → `waqf_tam`; >1.5s within ayah → `waqf_kafi`

When no real acoustic features are available, all observations are marked `undetectable`.

### ConfidenceEngine
Aggregates per-word ASR confidence into session-level and segment-level scores (0–100). The `standardDeviation` method includes confidence-0 words so that varied-confidence arrays compute non-zero spread correctly.

### AudioScoreEngine
Computes 4 sub-scores from pipeline outputs, then combines into `compositeScore`:
- **Accuracy** (×0.35): word error rate + critical mistake penalty
- **Tajweed** (×0.30): tajweed adherence from TajweedAnalysisEngine.summarise
- **Fluency** (×0.20): words-per-minute + speech ratio
- **Consistency** (×0.15): confidence standard deviation inversion

### AudioRecommendationEngine
Generates personalised recommendations from score breakdown and mistake patterns. Rules (15 named rules) fire based on score thresholds and mistake counts, sorted high → medium → low, capped at 8 recommendations.

---

## 6. Provider Interfaces

Three provider interfaces define the seams for future real implementations.

### ISpeechRecognitionProvider
```typescript
transcribe(input: TranscriptionInput): Promise<TranscriptionResult>
```
Where `TranscriptionResult` contains `words: TranscriptionWord[]` (each with `text`, `startSeconds`, `endSeconds`, `confidence`).

Null implementation: returns empty transcript. Session status → `no_asr`.

Target implementations: **Faster-Whisper** (Python sidecar via HTTP), **whisper.cpp** (native binary), **ONNX Runtime** (model bundle in-process), **Vosk** (offline streaming).

### IAudioPreprocessor
```typescript
denoise(buffer: Buffer, sampleRate: number): Promise<Buffer>
detectVoiceActivity(buffer: Buffer, sampleRate: number): Promise<VoiceSegment[]>
```

Null implementation: returns buffer unchanged; VAD returns single full-duration segment.

Target implementations: RNNoise (WASM), SileroVAD (ONNX), WebRTC VAD.

### IAudioFeatureExtractor
```typescript
extract(segment: AudioSegmentInput): Promise<SegmentFeatures>
```

Where `SegmentFeatures` includes `meanPitchHz`, `meanEnergyDbfs`, `pitchVariance`, `mfccMeans[13]`, `voicedRatio`.

Null implementation: returns zeroed features.

Target implementations: librosa-compatible (Python sidecar), Essentia.js (WASM).

---

## 7. RBAC

Permission category: `AUDIO_INTELLIGENCE`

| Action | Who |
|--------|-----|
| `audio_intelligence.create` | Student (own), Sheikh, Supervisor, Tenant Admin |
| `audio_intelligence.read` | Student (own), Parent (own children), Sheikh (own circle), Supervisor, Tenant Admin |
| `audio_intelligence.delete` | Supervisor, Tenant Admin |

Ownership is enforced at the use-case layer using the four-branch RBAC pattern consistent with Phases 7–13A:
- **STUDENT** — `student.userId === user.sub`
- **SHEIKH** — student in sheikh's circles
- **PARENT** — student linked to parent
- **SUPERVISOR / TENANT_ADMIN** — any student in the tenant

---

## 8. Integration with Intelligence Core (Phase 13A)

`AudioIntelligenceModule` exports three use cases that the `IntelligenceModule` (Phase 13A) can optionally consume:

- `GetStudentAudioProfileUseCase` — aggregated per-student audio metrics (90-day window)
- `GetAudioParentInsightsUseCase` — all children's audio scores + aggregate view
- `GetAudioSheikhInsightsUseCase` — class-level audio scores, attention flags, top performers

These are **advisory read-only** — no write calls to any domain. The `AudioIntelligenceModule` imports only the student/sheikh/parent repositories from their modules; it never writes to them.

---

## 9. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/audio-intelligence/sessions/upload` | Upload + immediately process a recitation |
| POST | `/api/v1/audio-intelligence/sessions/:sessionId/process` | Re-trigger processing |
| GET | `/api/v1/audio-intelligence/sessions/:sessionId` | Full session with all analysis detail |
| GET | `/api/v1/audio-intelligence/students/:studentId/profile` | Aggregated student audio profile |
| GET | `/api/v1/audio-intelligence/parents/:parentId/insights` | Parent view (all children) |
| GET | `/api/v1/audio-intelligence/sheikhs/:sheikhId/insights` | Sheikh class-level view |

All endpoints require `Bearer` JWT. Upload uses `multipart/form-data` with a `limits.fileSize` guard from `AudioRules.MAX_FILE_SIZE_BYTES`.

---

## 10. Audio Rules (tunable constants)

```typescript
MAX_FILE_SIZE_BYTES     = 50 MB
MIN_FILE_SIZE_BYTES     = 1 KB
MAX_DURATION_SECONDS    = 600s (10 min)
MIN_DURATION_SECONDS    = 1s

ACCEPTED_MIME_TYPES     = { wav, mp3, ogg, webm, m4a, flac }

RECURRENCE_THRESHOLD    = 3          // mistakes → isRecurring
CRITICAL_MISTAKE_TYPES  = [skipped_ayah, wrong_ayah_order]
MAJOR_MISTAKE_TYPES     = [skipped_word, wrong_word]

MADD_TABII_COUNTS       = 2 beats
MADD_MUTTASIL_COUNTS    = 4 beats
MADD_TOLERANCE          = 1 beat
GHUNNA_COUNTS           = 2 beats
BEAT_DURATION_SECONDS   = 0.25s

W_ACCURACY              = 0.35
W_TAJWEED               = 0.30
W_FLUENCY               = 0.20
W_CONSISTENCY           = 0.15

PROFILE_WINDOW_DAYS     = 90
```

---

## 11. Known Gaps / Future Work

1. **Real ASR provider**: Null provider produces `no_asr` sessions. A Faster-Whisper or whisper.cpp sidecar wired to `ISpeechRecognitionProvider` would unlock full pipeline output.
2. **Async processing**: Pipeline runs synchronously in the HTTP request. High-load deployments should enqueue `ProcessAudioSessionUseCase` as a BullMQ job (token slot already prepared in `AudioIntelligenceController`).
3. **Madd beat estimation**: Duration-based timing uses a fixed 0.25s/beat assumption. Real pitch detection from `IAudioFeatureExtractor` would improve accuracy.
4. **Word-level Quran corpus**: Alignment uses space-split words from the ayah text. A word-indexed corpus would handle split words and hamza variants more precisely.
5. **Cross-session trending**: Profile aggregation (90-day window) recomputes on every call. A materialised daily snapshot (similar to Phase 8 reporting) would reduce load.
