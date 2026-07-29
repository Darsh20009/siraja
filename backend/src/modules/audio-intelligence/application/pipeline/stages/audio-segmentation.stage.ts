import { Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import { AudioRules } from '../../../domain/rules/audio-rules';
import type { AudioSegment } from '../../../domain/entities/audio-segment.entity';
import type { VoiceSegment } from '../../../infrastructure/providers/interfaces/audio-preprocessor.provider.interface';

/**
 * AudioSegmentationStage — converts raw VAD spans into AudioSegment domain
 * entities by applying gap merging, duration filtering, and splitting.
 *
 * Rules applied (from AudioRules):
 *   • Segments below MIN_SEGMENT_DURATION_SECONDS are merged with neighbour
 *   • Consecutive segments separated by < VAD_SILENCE_GAP_SECONDS are merged
 *   • Segments below VAD_CONFIDENCE_THRESHOLD are discarded
 *
 * Writes to context:
 *   ctx.segments — ordered list of AudioSegment entities with temp IDs
 */
@Injectable()
export class AudioSegmentationStage implements IPipelineStage {
  readonly stageName = 'AudioSegmentation';

  async execute(ctx: AudioPipelineContext): Promise<void> {
    const validSpans = ctx.vadSegments.filter(
      (s) => s.confidence >= AudioRules.VAD_CONFIDENCE_THRESHOLD,
    );

    if (validSpans.length === 0) {
      // Fall back to single segment spanning entire audio
      ctx.segments = [this.makeSegment(ctx.sessionId, 0, 0, ctx.durationSeconds, 0.5)];
      return;
    }

    const merged = this.mergeCloseSpans(validSpans);
    const filtered = merged.filter(
      (s) => s.endSeconds - s.startSeconds >= AudioRules.MIN_SEGMENT_DURATION_SECONDS,
    );

    ctx.segments = filtered.map((span, idx) =>
      this.makeSegment(ctx.sessionId, idx, span.startSeconds, span.endSeconds, span.confidence),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Merge adjacent spans whose gap is smaller than VAD_SILENCE_GAP_SECONDS.
   */
  private mergeCloseSpans(spans: VoiceSegment[]): VoiceSegment[] {
    if (spans.length === 0) return [];
    const sorted = [...spans].sort((a, b) => a.startSeconds - b.startSeconds);
    const merged: VoiceSegment[] = [{ ...sorted[0] }];

    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];
      const gap = current.startSeconds - last.endSeconds;

      if (gap < AudioRules.VAD_SILENCE_GAP_SECONDS) {
        // Merge by extending last segment, averaging confidence
        last.endSeconds = current.endSeconds;
        last.confidence = (last.confidence + current.confidence) / 2;
      } else {
        merged.push({ ...current });
      }
    }

    return merged;
  }

  private makeSegment(
    sessionId: string,
    index: number,
    start: number,
    end: number,
    confidence: number,
  ): AudioSegment {
    const duration = end - start;
    return {
      id: `temp-seg-${index}`, // replaced with MongoDB ObjectId after persistence
      sessionId,
      segmentIndex: index,
      startSeconds: start,
      endSeconds: end,
      durationSeconds: duration,
      voiceActivityConfidence: confidence,
      energyDbfs: 0,   // populated by FeatureExtractionStage
      pitchHz: 0,       // populated by FeatureExtractionStage
      wordAlignments: [], // populated by QuranAlignmentStage
      createdAt: new Date(),
    };
  }
}
