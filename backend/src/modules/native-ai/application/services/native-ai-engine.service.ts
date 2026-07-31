import { Injectable } from '@nestjs/common';

import { TokenizerEngine } from '../../domain/engines/tokenizer.engine';
import { NormalizationEngine } from '../../domain/engines/normalization.engine';
import { MorphologyEngine } from '../../domain/engines/morphology.engine';
import { LetterAnalyzerEngine } from '../../domain/engines/letter-analyzer.engine';
import { WordAnalyzerEngine } from '../../domain/engines/word-analyzer.engine';
import { VerseStructureAnalyzerEngine } from '../../domain/engines/verse-structure.engine';
import { TajweedRuleEngine } from '../../domain/engines/tajweed-rule.engine';
import { MistakeClassificationEngine } from '../../domain/engines/mistake-classification.engine';
import { MemorizationPatternEngine } from '../../domain/engines/memorization-pattern.engine';
import { SimilarityEngine } from '../../domain/engines/similarity.engine';
import { RecommendationEngine } from '../../domain/engines/recommendation.engine';
import { ForecastEngine } from '../../domain/engines/forecast.engine';
import { AdaptiveLearningEngine } from '../../domain/engines/adaptive-learning.engine';
import { NativeAiOrchestratorEngine } from '../../domain/engines/orchestrator.engine';

/**
 * NativeAiEngineService — NestJS-injectable façade that owns the singleton
 * instances of all 14 native-AI domain engines.
 *
 * Engines are pure TypeScript classes with no NestJS metadata; this service
 * instantiates them once at DI container boot and exposes them as readonly
 * properties so use-cases and controllers can access them without
 * re-instantiation overhead.
 *
 * Architecture note: engines never mutate shared state, so a single instance
 * per process is both correct and efficient.
 */
@Injectable()
export class NativeAiEngineService {
  // ── Foundation engines ────────────────────────────────────────────────────

  /** Splits Arabic text into structured QuranToken objects. */
  readonly tokenizer = new TokenizerEngine();

  /** All Arabic normalisation forms (search, root, flat, diacritics-stripped). */
  readonly normalizer = new NormalizationEngine();

  /** Rule-based root extraction and morpheme breakdown. */
  readonly morphology = new MorphologyEngine();

  /** Per-letter tajweed and phonological property lookup. */
  readonly letterAnalyzer = new LetterAnalyzerEngine();

  /** Per-word linguistic and tajweed analysis. */
  readonly wordAnalyzer = new WordAnalyzerEngine();

  /** Verse-level structural analysis (difficulty, rhyme, flags). */
  readonly verseAnalyzer = new VerseStructureAnalyzerEngine();

  /** Comprehensive tajweed rule detection (noon/meem/madd/qalqala/ghunna/lam). */
  readonly tajweedEngine = new TajweedRuleEngine();

  // ── Higher-level engines ──────────────────────────────────────────────────

  /** Classifies recitation mistakes by category, severity, and remediation. */
  readonly mistakeClassifier = new MistakeClassificationEngine();

  /** SM-2 spaced-repetition scheduling + Ebbinghaus retention modelling. */
  readonly memorizationPattern = new MemorizationPatternEngine();

  /** Multi-dimensional lexical/phonological/structural similarity. */
  readonly similarity = new SimilarityEngine();

  /** Rule-based personalised recommendation generation. */
  readonly recommendation = new RecommendationEngine();

  /** Velocity-based memorization completion forecast with CI bounds. */
  readonly forecast = new ForecastEngine();

  /** Personalised weekly study plan generation. */
  readonly adaptiveLearning = new AdaptiveLearningEngine();

  // ── Top-level orchestrator ────────────────────────────────────────────────

  /** Wires all 7 foundation engines into a single analysis façade. */
  readonly orchestrator = new NativeAiOrchestratorEngine();
}
