import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { STORAGE_PROVIDER } from '@shared/storage/storage-provider.interface';
import type { IStorageProvider } from '@shared/storage/storage-provider.interface';
import { Ayah, AyahDocument } from '@database/mongoose/schemas';

import {
  IAudioSessionRepository,
  AUDIO_SESSION_REPOSITORY,
} from '../../domain/repositories/audio-session.repository.interface';
import { AudioPipelineService } from '../pipeline/audio-pipeline.service';
import { AudioPipelineContext } from '../pipeline/pipeline-context';
import type { AudioSession } from '../../domain/entities/audio-session.entity';
import type { AyahWordData } from '../../domain/engines/audio-alignment.engine';

/**
 * ProcessAudioSessionUseCase — Phase 13B.
 *
 * Orchestrates the full audio analysis pipeline for an existing
 * AudioSession that is in 'pending' status.
 *
 * Steps:
 *   1. Load the AudioSession record
 *   2. Enforce RBAC (only the uploader, their sheikh, or an admin can trigger)
 *   3. Transition session → 'processing'
 *   4. Fetch expected Quran words from the Ayah collection
 *   5. Download the audio file from storage
 *   6. Build and run AudioPipelineContext through AudioPipelineService
 *   7. Persist all pipeline results via IAudioSessionRepository
 *   8. Transition session → 'completed' (or 'no_asr' / 'failed')
 *
 * RBAC:
 *   STUDENT    → own sessions only
 *   SHEIKH / SUPERVISOR / TENANT_ADMIN → any session in tenant
 */
@Injectable()
export class ProcessAudioSessionUseCase {
  private readonly logger = new Logger(ProcessAudioSessionUseCase.name);

  constructor(
    @Inject(AUDIO_SESSION_REPOSITORY)
    private readonly sessionRepo: IAudioSessionRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    @InjectModel(Ayah.name)
    private readonly ayahModel: Model<AyahDocument>,
    private readonly pipeline: AudioPipelineService,
  ) {}

  async execute(user: AccessTokenPayload, sessionId: string): Promise<AudioSession> {
    const roles = user.roles as Role[];

    // ── Load session ──────────────────────────────────────────────────────
    const session = await this.sessionRepo.findById(user.tenantId, sessionId);
    if (!session) throw new NotFoundException('Audio session not found.');

    // ── Ownership check ───────────────────────────────────────────────────
    if (roles.includes(Role.STUDENT)) {
      // Students cannot trigger processing — only sheikhs / admins can
      throw new ForbiddenException('Students cannot trigger audio processing.');
    }

    // ── Guard against double processing ───────────────────────────────────
    if (session.status !== 'pending') {
      // Return existing session unchanged
      return session;
    }

    // ── Transition to processing ───────────────────────────────────────────
    await this.sessionRepo.updateStatus(user.tenantId, sessionId, 'processing');

    try {
      // ── Fetch expected Quran words ─────────────────────────────────────
      const expectedWords = await this.fetchExpectedWords(
        session.surahNumber,
        session.fromAyah,
        session.toAyah,
      );

      // ── Download audio from storage ────────────────────────────────────
      const signedUrl = await this.storage.getSignedDownloadUrl({
        key: session.fileKey,
        expiresInSeconds: 300,
      });
      const audioBuffer = await this.downloadBuffer(signedUrl);

      // ── Build pipeline context ─────────────────────────────────────────
      const ctx = new AudioPipelineContext({
        sessionId,
        tenantId: user.tenantId,
        studentId: session.studentId,
        audioBuffer,
        surahNumber: session.surahNumber,
        fromAyah: session.fromAyah,
        toAyah: session.toAyah,
        format: session.format,
        fileSizeBytes: session.fileSizeBytes,
        expectedWords,
      });

      // ── Run pipeline ──────────────────────────────────────────────────
      await this.pipeline.run(ctx);

      // ── Determine final status ─────────────────────────────────────────
      const finalStatus = ctx.usedNullAsrProvider ? 'no_asr' : 'completed';

      // ── Persist results ───────────────────────────────────────────────
      const updated = await this.sessionRepo.saveProcessingResults(
        user.tenantId,
        sessionId,
        {
          status: finalStatus,
          score: ctx.score,
          recommendations: ctx.recommendations,
          segments: ctx.segments,
          mistakes: ctx.mistakes,
          tajweedObservations: ctx.tajweedObservations,
          processedAt: new Date(),
        },
      );

      return updated;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown pipeline error.';
      this.logger.error(`[${sessionId}] Pipeline failed: ${errorMessage}`);

      await this.sessionRepo.updateStatus(user.tenantId, sessionId, 'failed', errorMessage);
      throw err;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Fetch the Arabic text of all ayahs in the given range and split each
   * ayah into its space-separated words.
   *
   * Note: The Quran corpus stored in the `ayahs` collection has the full
   * Arabic text per ayah. This method splits on whitespace to produce
   * word-level data for alignment. A future enhancement can use a
   * word-index-level corpus for finer granularity.
   */
  private async fetchExpectedWords(
    surahNumber: number,
    fromAyah: number,
    toAyah: number,
  ): Promise<AyahWordData[]> {
    const ayahs = await this.ayahModel
      .find({
        surahNumber,
        ayahNumber: { $gte: fromAyah, $lte: toAyah },
      })
      .sort({ ayahNumber: 1 })
      .lean()
      .exec();

    const words: AyahWordData[] = [];
    for (const ayah of ayahs) {
      const ayahWords = (ayah.arabicText as string).split(/\s+/).filter(Boolean);
      ayahWords.forEach((wordText, idx) => {
        words.push({
          surahNumber: ayah.surahNumber as number,
          ayahNumber: ayah.ayahNumber as number,
          wordIndex: idx,
          arabicText: wordText,
        });
      });
    }
    return words;
  }

  /** Download audio bytes from a presigned URL. */
  private async downloadBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio from storage: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
