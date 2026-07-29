import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// ── Schemas ───────────────────────────────────────────────────────────────────
import {
  AudioSession,
  AudioSessionSchema,
} from '@database/mongoose/schemas/audio-session.schema';
import {
  AudioSegment,
  AudioSegmentSchema,
} from '@database/mongoose/schemas/audio-segment.schema';
import {
  AudioMistakeDetection,
  AudioMistakeDetectionSchema,
} from '@database/mongoose/schemas/audio-mistake-detection.schema';
import {
  TajweedObservation,
  TajweedObservationSchema,
} from '@database/mongoose/schemas/tajweed-observation.schema';
import { Ayah, AyahSchema } from '@database/mongoose/schemas/ayah.schema';

// ── Domain consumers ──────────────────────────────────────────────────────────
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

// ── Provider interfaces (DI tokens) ──────────────────────────────────────────
import { SPEECH_RECOGNITION_PROVIDER } from './infrastructure/providers/interfaces/speech-recognition.provider.interface';
import { AUDIO_PREPROCESSOR } from './infrastructure/providers/interfaces/audio-preprocessor.provider.interface';
import { AUDIO_FEATURE_EXTRACTOR } from './infrastructure/providers/interfaces/audio-feature-extractor.provider.interface';

// ── Null providers ─────────────────────────────────────────────────────────────
import { NullSpeechRecognitionProvider } from './infrastructure/providers/null/null-speech-recognition.provider';
import { NullAudioPreprocessor } from './infrastructure/providers/null/null-audio-preprocessor.provider';
import { NullAudioFeatureExtractor } from './infrastructure/providers/null/null-audio-feature-extractor.provider';

// ── Infrastructure repository ─────────────────────────────────────────────────
import { AUDIO_SESSION_REPOSITORY } from './domain/repositories/audio-session.repository.interface';
import { AudioSessionRepository } from './infrastructure/repositories/audio-session.repository';

// ── Pipeline ──────────────────────────────────────────────────────────────────
import { AudioPipelineService } from './application/pipeline/audio-pipeline.service';
import { AudioValidationStage } from './application/pipeline/stages/audio-validation.stage';
import { NoiseReductionStage } from './application/pipeline/stages/noise-reduction.stage';
import { VoiceActivityDetectionStage } from './application/pipeline/stages/voice-activity-detection.stage';
import { AudioSegmentationStage } from './application/pipeline/stages/audio-segmentation.stage';
import { FeatureExtractionStage } from './application/pipeline/stages/feature-extraction.stage';
import { QuranAlignmentStage } from './application/pipeline/stages/quran-alignment.stage';
import { MistakeDetectionStage } from './application/pipeline/stages/mistake-detection.stage';
import { ScoringStage } from './application/pipeline/stages/scoring.stage';
import { RecommendationStage } from './application/pipeline/stages/recommendation.stage';

// ── Use cases ─────────────────────────────────────────────────────────────────
import { UploadAudioSessionUseCase } from './application/use-cases/upload-audio-session.use-case';
import { ProcessAudioSessionUseCase } from './application/use-cases/process-audio-session.use-case';
import { GetAudioSessionUseCase } from './application/use-cases/get-audio-session.use-case';
import { GetStudentAudioProfileUseCase } from './application/use-cases/get-student-audio-profile.use-case';
import { GetAudioParentInsightsUseCase } from './application/use-cases/get-audio-parent-insights.use-case';
import { GetAudioSheikhInsightsUseCase } from './application/use-cases/get-audio-sheikh-insights.use-case';

// ── Controllers ───────────────────────────────────────────────────────────────
import { AudioIntelligenceController } from './infrastructure/controllers/audio-intelligence.controller';
import { AudioParentIntelligenceController } from './infrastructure/controllers/audio-parent-intelligence.controller';
import { AudioSheikhIntelligenceController } from './infrastructure/controllers/audio-sheikh-intelligence.controller';

/**
 * AudioIntelligenceModule — Phase 13B: Local Quran Audio Intelligence.
 *
 * A fully local audio analysis pipeline. No external AI services are
 * called — all processing runs deterministically in-process.
 *
 * Provider strategy:
 *   Null providers are registered by default. Replace them with real
 *   implementations (Faster-Whisper, whisper.cpp, ONNX Runtime, Vosk)
 *   by overriding the DI tokens in a feature-flag module or environment-
 *   specific configuration module without changing this file.
 *
 * Multer is configured with in-memory storage so audio buffers are
 * available directly in controller handlers without a temporary file step.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AudioSession.name, schema: AudioSessionSchema },
      { name: AudioSegment.name, schema: AudioSegmentSchema },
      { name: AudioMistakeDetection.name, schema: AudioMistakeDetectionSchema },
      { name: TajweedObservation.name, schema: TajweedObservationSchema },
      { name: Ayah.name, schema: AyahSchema },
    ]),
    MulterModule.register({ storage: memoryStorage() }),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
  ],

  controllers: [
    AudioIntelligenceController,
    AudioParentIntelligenceController,
    AudioSheikhIntelligenceController,
  ],

  providers: [
    // ── Null providers (default — replace with real impls when available) ──
    NullSpeechRecognitionProvider,
    NullAudioPreprocessor,
    NullAudioFeatureExtractor,
    {
      provide: SPEECH_RECOGNITION_PROVIDER,
      useClass: NullSpeechRecognitionProvider,
    },
    {
      provide: AUDIO_PREPROCESSOR,
      useClass: NullAudioPreprocessor,
    },
    {
      provide: AUDIO_FEATURE_EXTRACTOR,
      useClass: NullAudioFeatureExtractor,
    },

    // ── Repository ─────────────────────────────────────────────────────────
    {
      provide: AUDIO_SESSION_REPOSITORY,
      useClass: AudioSessionRepository,
    },

    // ── Pipeline stages ────────────────────────────────────────────────────
    AudioValidationStage,
    NoiseReductionStage,
    VoiceActivityDetectionStage,
    AudioSegmentationStage,
    FeatureExtractionStage,
    QuranAlignmentStage,
    MistakeDetectionStage,
    ScoringStage,
    RecommendationStage,
    AudioPipelineService,

    // ── Use cases ──────────────────────────────────────────────────────────
    UploadAudioSessionUseCase,
    ProcessAudioSessionUseCase,
    GetAudioSessionUseCase,
    GetStudentAudioProfileUseCase,
    GetAudioParentInsightsUseCase,
    GetAudioSheikhInsightsUseCase,
  ],

  exports: [
    GetStudentAudioProfileUseCase,
    GetAudioParentInsightsUseCase,
    GetAudioSheikhInsightsUseCase,
  ],
})
export class AudioIntelligenceModule {}
