import { Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import { AudioRules } from '../../../domain/rules/audio-rules';
import { AudioFormat } from '../../../domain/entities/audio-session.entity';

/**
 * AudioValidationStage — validates the raw audio buffer before any heavy
 * processing takes place.
 *
 * Checks:
 *   1. File size within [MIN_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES]
 *   2. Format is one of the accepted types
 *   3. For WAV: parse the header to extract real sample rate, channels, and duration
 *   4. For all other formats: estimate duration from size (conservative)
 *   5. Duration within [MIN_DURATION_SECONDS, MAX_DURATION_SECONDS]
 *
 * Writes to context:
 *   ctx.durationSeconds, ctx.sampleRate, ctx.channels
 *
 * Throws on any validation failure — the pipeline service catches this and
 * transitions the session to 'failed'.
 */
@Injectable()
export class AudioValidationStage implements IPipelineStage {
  readonly stageName = 'AudioValidation';

  async execute(ctx: AudioPipelineContext): Promise<void> {
    const buf = ctx.audioBuffer;

    // ── 1. File size ─────────────────────────────────────────────────────────
    if (buf.length < AudioRules.MIN_FILE_SIZE_BYTES) {
      throw new Error(
        `Audio file too small: ${buf.length} bytes (minimum ${AudioRules.MIN_FILE_SIZE_BYTES}).`,
      );
    }
    if (buf.length > AudioRules.MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Audio file too large: ${buf.length} bytes (maximum ${AudioRules.MAX_FILE_SIZE_BYTES}).`,
      );
    }

    // ── 2. Format ─────────────────────────────────────────────────────────────
    const supportedFormats = Object.keys(AudioRules.ACCEPTED_MIME_TYPES) as AudioFormat[];
    if (!supportedFormats.includes(ctx.format)) {
      throw new Error(
        `Unsupported audio format: "${ctx.format}". ` +
          `Accepted: ${supportedFormats.join(', ')}.`,
      );
    }

    // ── 3. Parse or estimate audio metadata ──────────────────────────────────
    if (ctx.format === 'wav') {
      this.parseWavHeader(buf, ctx);
    } else {
      this.estimateMetadata(buf, ctx);
    }

    // ── 4. Duration bounds ────────────────────────────────────────────────────
    if (ctx.durationSeconds < AudioRules.MIN_DURATION_SECONDS) {
      throw new Error(
        `Audio too short: ${ctx.durationSeconds.toFixed(2)}s ` +
          `(minimum ${AudioRules.MIN_DURATION_SECONDS}s).`,
      );
    }
    if (ctx.durationSeconds > AudioRules.MAX_DURATION_SECONDS) {
      throw new Error(
        `Audio too long: ${ctx.durationSeconds.toFixed(0)}s ` +
          `(maximum ${AudioRules.MAX_DURATION_SECONDS}s).`,
      );
    }
  }

  // ── WAV header parser ──────────────────────────────────────────────────────

  /**
   * Parse a standard WAV RIFF header (little-endian).
   * WAV header layout (44 bytes for PCM):
   *   0–3   "RIFF"
   *   4–7   file size − 8
   *   8–11  "WAVE"
   *   12–15 "fmt "
   *   16–19 subchunk1 size (16 for PCM)
   *   20–21 audio format (1 = PCM)
   *   22–23 num channels
   *   24–27 sample rate
   *   28–31 byte rate
   *   32–33 block align
   *   34–35 bits per sample
   *   36–39 "data"
   *   40–43 data size
   */
  private parseWavHeader(buf: Buffer, ctx: AudioPipelineContext): void {
    if (buf.length < 44) {
      throw new Error('WAV file is too short to contain a valid RIFF header.');
    }

    const riff = buf.toString('ascii', 0, 4);
    const wave = buf.toString('ascii', 8, 12);

    if (riff !== 'RIFF' || wave !== 'WAVE') {
      // Buffer claims to be WAV but has no RIFF/WAVE magic — fall back to estimate
      this.estimateMetadata(buf, ctx);
      return;
    }

    const numChannels = buf.readUInt16LE(22);
    const sampleRate = buf.readUInt32LE(24);
    const bitsPerSample = buf.readUInt16LE(34);

    ctx.sampleRate = sampleRate;
    ctx.channels = numChannels;

    // Data sub-chunk may not start at byte 36 if there are extra chunks;
    // scan for the 'data' marker up to byte 128.
    let dataSize = 0;
    let offset = 36;
    while (offset + 8 <= Math.min(buf.length, 256)) {
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === 'data') {
        dataSize = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }

    if (dataSize === 0) {
      // Could not find data chunk — estimate from total size
      dataSize = buf.length - 44;
    }

    const bytesPerSample = bitsPerSample / 8;
    const bytesPerSecond = sampleRate * numChannels * bytesPerSample;

    ctx.durationSeconds =
      bytesPerSecond > 0
        ? dataSize / bytesPerSecond
        : buf.length / (16000 * 2); // safe fallback
  }

  /**
   * Estimate duration for compressed formats (MP3, OGG, etc.) using a
   * conservative average bitrate of 128 kbps.
   */
  private estimateMetadata(buf: Buffer, ctx: AudioPipelineContext): void {
    const ASSUMED_BITRATE_KBPS = 128;
    const ASSUMED_BYTES_PER_SECOND = (ASSUMED_BITRATE_KBPS * 1000) / 8;
    ctx.durationSeconds = buf.length / ASSUMED_BYTES_PER_SECOND;
    ctx.sampleRate = 44100; // common default for compressed formats
    ctx.channels = 1;
  }
}
