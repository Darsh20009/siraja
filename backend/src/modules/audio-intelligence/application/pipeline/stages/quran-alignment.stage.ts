import { Inject, Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import {
  ISpeechRecognitionProvider,
  SPEECH_RECOGNITION_PROVIDER,
} from '../../../infrastructure/providers/interfaces/speech-recognition.provider.interface';
import { AudioAlignmentEngine } from '../../../domain/engines/audio-alignment.engine';
import type { WordAlignment } from '../../../domain/entities/word-alignment.entity';

/**
 * QuranAlignmentStage — transcribes each segment and aligns the resulting
 * words against the expected Quran word sequence.
 *
 * Pipeline:
 *   For each segment:
 *     1. Slice the preprocessed audio buffer to the segment's time window
 *        (approximated from byte offsets at the known sample rate)
 *     2. Call ISpeechRecognitionProvider.transcribe()
 *     3. Call AudioAlignmentEngine.align() to map recognised words to
 *        Quran positions
 *     4. Embed WordAlignments back onto the segment entity
 *
 * When the null ASR provider is active (isNullProvider = true):
 *   - All expected words are modelled as deletions
 *   - ctx.usedNullAsrProvider is set to true
 *   - The session will be marked 'no_asr' instead of 'completed'
 *
 * Writes to context:
 *   ctx.wordAlignments (flat list from all segments)
 *   ctx.totalExpectedWords, ctx.correctWords, ctx.deletedWords, ctx.insertedWords
 *   ctx.usedNullAsrProvider
 *   ctx.segments[i].wordAlignments (in-place)
 */
@Injectable()
export class QuranAlignmentStage implements IPipelineStage {
  readonly stageName = 'QuranAlignment';

  private readonly alignmentEngine = new AudioAlignmentEngine();

  constructor(
    @Inject(SPEECH_RECOGNITION_PROVIDER)
    private readonly asrProvider: ISpeechRecognitionProvider,
  ) {}

  async execute(ctx: AudioPipelineContext): Promise<void> {
    const allAlignments: WordAlignment[] = [];
    let totalExpected = 0;
    let totalCorrect = 0;
    let totalDeleted = 0;
    let totalInserted = 0;
    let usedNull = false;

    // Distribute expected words across segments proportionally
    const wordsPerSegment = this.distributeWordsToSegments(ctx);

    for (const segment of ctx.segments) {
      const expectedForSegment = wordsPerSegment.get(segment.segmentIndex) ?? [];

      // Slice the audio buffer for this segment
      const segmentBuffer = this.sliceBuffer(
        ctx.preprocessedBuffer,
        segment.startSeconds,
        segment.endSeconds,
        ctx.sampleRate || 16000,
      );

      // Transcribe
      const transcription = await this.asrProvider.transcribe(segmentBuffer, {
        language: 'ar',
        initialPrompt: 'بسم الله الرحمن الرحيم',
      });

      if (transcription.isNullProvider) usedNull = true;

      // Align
      const result = this.alignmentEngine.align(
        transcription.words,
        expectedForSegment,
        segment.id,
      );

      // Update segment
      segment.wordAlignments = result.wordAlignments;

      allAlignments.push(...result.wordAlignments);
      totalExpected += result.totalExpectedWords;
      totalCorrect += result.correctWords;
      totalDeleted += result.deletedWords;
      totalInserted += result.insertedWords;
    }

    ctx.wordAlignments = allAlignments;
    ctx.totalExpectedWords = totalExpected;
    ctx.correctWords = totalCorrect;
    ctx.deletedWords = totalDeleted;
    ctx.insertedWords = totalInserted;
    ctx.usedNullAsrProvider = usedNull;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Distribute the full set of expected words to segments proportionally
   * by segment duration. Words are assigned sequentially — the first
   * segment receives the first N words, and so on.
   */
  private distributeWordsToSegments(
    ctx: AudioPipelineContext,
  ): Map<number, typeof ctx.expectedWords> {
    const result = new Map<number, typeof ctx.expectedWords>();
    const totalWords = ctx.expectedWords.length;
    const totalDuration = ctx.segments.reduce((s, seg) => s + seg.durationSeconds, 0);

    if (ctx.segments.length === 0 || totalDuration === 0) return result;

    let wordOffset = 0;

    ctx.segments.forEach((segment, i) => {
      const isLast = i === ctx.segments.length - 1;
      const fraction = segment.durationSeconds / totalDuration;
      const wordsForSegment = isLast
        ? totalWords - wordOffset
        : Math.max(0, Math.round(fraction * totalWords));

      const slice = ctx.expectedWords.slice(wordOffset, wordOffset + wordsForSegment);
      result.set(segment.segmentIndex, slice);
      wordOffset += slice.length;
    });

    return result;
  }

  /**
   * Extract a byte slice of the audio buffer corresponding to the given
   * time window. Uses 16-bit mono PCM at the session sample rate for slicing.
   * Returns the full buffer if the slice would be empty or out of bounds.
   */
  private sliceBuffer(
    buffer: Buffer,
    startSeconds: number,
    endSeconds: number,
    sampleRate: number,
  ): Buffer {
    const BYTES_PER_SAMPLE = 2; // 16-bit
    const bytesPerSecond = sampleRate * BYTES_PER_SAMPLE;

    const startByte = Math.floor(startSeconds * bytesPerSecond);
    const endByte = Math.ceil(endSeconds * bytesPerSecond);

    if (startByte >= buffer.length || endByte <= startByte) {
      return buffer; // safe fallback
    }

    return buffer.subarray(
      Math.min(startByte, buffer.length),
      Math.min(endByte, buffer.length),
    );
  }
}
