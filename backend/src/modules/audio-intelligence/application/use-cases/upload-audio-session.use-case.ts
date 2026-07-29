import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { STORAGE_PROVIDER } from '@shared/storage/storage-provider.interface';
import type { IStorageProvider } from '@shared/storage/storage-provider.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';

import {
  IAudioSessionRepository,
  AUDIO_SESSION_REPOSITORY,
} from '../../domain/repositories/audio-session.repository.interface';
import { AudioRules } from '../../domain/rules/audio-rules';
import type { AudioSession, AudioFormat } from '../../domain/entities/audio-session.entity';

export interface UploadAudioSessionInput {
  /** Raw audio bytes received from multipart upload. */
  audioBuffer: Buffer;
  /** Original file extension (wav, mp3, …). */
  format: AudioFormat;
  /** Original file size in bytes — should match audioBuffer.length. */
  fileSizeBytes: number;
  /** Quran range being recited. */
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  /** Student whose recitation this is. */
  studentId: string;
  /** Optional link to a memorization record. */
  memorizationRecordId?: string;
}

/**
 * UploadAudioSessionUseCase — Phase 13B.
 *
 * Validates the upload, stores the audio file via IStorageProvider, and
 * creates an AudioSession document in 'pending' status.
 *
 * Does NOT run the analysis pipeline. The caller (controller) should
 * immediately trigger ProcessAudioSessionUseCase after the upload.
 *
 * RBAC:
 *   STUDENT    → may upload for themselves only
 *   SHEIKH     → may upload for any student in their circles
 *   SUPERVISOR / TENANT_ADMIN → any student in the tenant
 */
@Injectable()
export class UploadAudioSessionUseCase {
  constructor(
    @Inject(AUDIO_SESSION_REPOSITORY)
    private readonly sessionRepo: IAudioSessionRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(
    user: AccessTokenPayload,
    input: UploadAudioSessionInput,
  ): Promise<AudioSession> {
    const roles = user.roles as Role[];

    // ── Validate format ────────────────────────────────────────────────────
    const accepted = Object.keys(AudioRules.ACCEPTED_MIME_TYPES) as AudioFormat[];
    if (!accepted.includes(input.format)) {
      throw new BadRequestException(
        `Unsupported audio format "${input.format}". Accepted: ${accepted.join(', ')}.`,
      );
    }

    // ── Validate file size (early, before storage) ─────────────────────────
    if (input.fileSizeBytes > AudioRules.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large (${input.fileSizeBytes} bytes). Maximum is ${AudioRules.MAX_FILE_SIZE_BYTES}.`,
      );
    }
    if (input.fileSizeBytes < AudioRules.MIN_FILE_SIZE_BYTES) {
      throw new BadRequestException('Audio file is empty or too small.');
    }

    // ── Validate Quran range ───────────────────────────────────────────────
    if (input.surahNumber < 1 || input.surahNumber > 114) {
      throw new BadRequestException('surahNumber must be between 1 and 114.');
    }
    if (input.fromAyah > input.toAyah) {
      throw new BadRequestException('fromAyah must be ≤ toAyah.');
    }

    // ── Load student and enforce ownership ────────────────────────────────
    const student = await this.studentRepo.findById(user.tenantId, input.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const isStudent = roles.includes(Role.STUDENT);
    const isSelf = isStudent && String(student.user) === user.sub;
    const isAdmin =
      roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR);
    const isSheikh = roles.includes(Role.SHEIKH);

    if (isStudent && !isSelf) {
      throw new ForbiddenException('Students can only upload their own audio sessions.');
    }
    if (!isStudent && !isAdmin && !isSheikh) {
      throw new ForbiddenException('You do not have permission to upload audio sessions.');
    }

    // ── Store the file ─────────────────────────────────────────────────────
    const fileKey = this.buildStorageKey(user.tenantId, input.studentId, input.format);
    await this.storage.upload({
      key: fileKey,
      buffer: input.audioBuffer,
      contentType: AudioRules.ACCEPTED_MIME_TYPES[input.format] ?? 'audio/octet-stream',
      metadata: {
        tenantId: user.tenantId,
        studentId: input.studentId,
        surahNumber: String(input.surahNumber),
        fromAyah: String(input.fromAyah),
        toAyah: String(input.toAyah),
      },
    });

    // ── Create session record ──────────────────────────────────────────────
    return this.sessionRepo.create({
      tenantId: user.tenantId,
      studentId: input.studentId,
      surahNumber: input.surahNumber,
      fromAyah: input.fromAyah,
      toAyah: input.toAyah,
      fileKey,
      format: input.format,
      durationSeconds: 0, // measured by ValidationStage during processing
      fileSizeBytes: input.fileSizeBytes,
      sampleRate: 0,
      channels: 0,
      memorizationRecordId: input.memorizationRecordId,
    });
  }

  private buildStorageKey(tenantId: string, studentId: string, format: AudioFormat): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `audio/${tenantId}/${studentId}/${timestamp}-${random}.${format}`;
  }
}
