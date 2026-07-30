import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';

import { UploadAudioSessionUseCase } from '../../application/use-cases/upload-audio-session.use-case';
import { ProcessAudioSessionUseCase } from '../../application/use-cases/process-audio-session.use-case';
import { GetAudioSessionUseCase } from '../../application/use-cases/get-audio-session.use-case';
import { GetStudentAudioProfileUseCase } from '../../application/use-cases/get-student-audio-profile.use-case';
import { UploadAudioSessionDto } from '../../dto/upload-audio-session.dto';
import {
  AudioSessionSummaryDto,
  AudioScoreDto,
  AudioRecommendationDto,
} from '../../dto/audio-session-response.dto';
import { StudentAudioProfileDto } from '../../dto/audio-insights-response.dto';
import type { AudioSession } from '../../domain/entities/audio-session.entity';
import type { StudentAudioProfile } from '../../application/use-cases/get-student-audio-profile.use-case';
import { AudioRules } from '../../domain/rules/audio-rules';
import type { AudioFormat } from '../../domain/entities/audio-session.entity';

@ApiTags('Audio Intelligence')
@ApiBearerAuth()
@Controller('audio-intelligence')
export class AudioIntelligenceController {
  constructor(
    private readonly uploadUseCase: UploadAudioSessionUseCase,
    private readonly processUseCase: ProcessAudioSessionUseCase,
    private readonly getSessionUseCase: GetAudioSessionUseCase,
    private readonly getProfileUseCase: GetStudentAudioProfileUseCase,
  ) {}

  // ── Upload ─────────────────────────────────────────────────────────────────

  @Post('sessions/upload')
  @RequirePermissions(PERMISSIONS.AUDIO_INTELLIGENCE!.CREATE!)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: undefined, // use memory storage (default)
      limits: { fileSize: AudioRules.MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an audio recitation session',
    description:
      'Upload a Quran recitation audio file for analysis. The session is created in ' +
      '"pending" status. Immediately triggers the processing pipeline synchronously. ' +
      'No external AI services involved.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Audio file' },
        format: { type: 'string', enum: ['wav', 'mp3', 'ogg', 'webm', 'm4a', 'flac'] },
        surahNumber: { type: 'integer', minimum: 1, maximum: 114 },
        fromAyah: { type: 'integer', minimum: 1 },
        toAyah: { type: 'integer', minimum: 1 },
        studentId: { type: 'string' },
        memorizationRecordId: { type: 'string' },
      },
      required: ['audio', 'format', 'surahNumber', 'fromAyah', 'toAyah', 'studentId'],
    },
  })
  @ApiResponse({ status: 201, type: AudioSessionSummaryDto })
  async uploadAndProcess(
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAudioSessionDto,
  ): Promise<AudioSessionSummaryDto> {
    if (!file) {
      throw new BadRequestException('No audio file provided in the "audio" field.');
    }

    const accepted = Object.keys(AudioRules.ACCEPTED_MIME_TYPES) as AudioFormat[];
    if (!accepted.includes(dto.format)) {
      throw new BadRequestException(`Unsupported format: ${dto.format}`);
    }

    // Upload and create session record
    const session = await this.uploadUseCase.execute(user, {
      audioBuffer: file.buffer,
      format: dto.format,
      fileSizeBytes: file.size,
      surahNumber: Number(dto.surahNumber),
      fromAyah: Number(dto.fromAyah),
      toAyah: Number(dto.toAyah),
      studentId: dto.studentId,
      memorizationRecordId: dto.memorizationRecordId,
    });

    // Process synchronously (for async: enqueue a BullMQ job here instead)
    const processed = await this.processUseCase.execute(user, session.id);
    return this.toSummaryDto(processed);
  }

  // ── Process (re-trigger) ───────────────────────────────────────────────────

  @Post('sessions/:sessionId/process')
  @RequirePermissions(PERMISSIONS.AUDIO_INTELLIGENCE!.CREATE!)
  @ApiOperation({
    summary: 'Trigger processing for a pending audio session',
    description:
      'Re-triggers the analysis pipeline for a session in "pending" status. ' +
      'Sessions already in "completed" or "processing" are returned unchanged.',
  })
  @ApiParam({ name: 'sessionId', description: 'AudioSession ID' })
  @ApiResponse({ status: 200, type: AudioSessionSummaryDto })
  async processSession(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sessionId') sessionId: string,
  ): Promise<AudioSessionSummaryDto> {
    const session = await this.processUseCase.execute(user, sessionId);
    return this.toSummaryDto(session);
  }

  // ── Get session ────────────────────────────────────────────────────────────

  @Get('sessions/:sessionId')
  @RequirePermissions(PERMISSIONS.AUDIO_INTELLIGENCE!.READ!)
  @ApiOperation({
    summary: 'Get a full audio session with all analysis details',
    description:
      'Returns the AudioSession with segments, word alignments, mistake detections, ' +
      'tajweed observations, score, and recommendations.',
  })
  @ApiParam({ name: 'sessionId', description: 'AudioSession ID' })
  @ApiResponse({ status: 200, type: AudioSessionSummaryDto })
  async getSession(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sessionId') sessionId: string,
  ): Promise<AudioSessionSummaryDto> {
    const session = await this.getSessionUseCase.execute(user, sessionId);
    return this.toSummaryDto(session);
  }

  // ── Student audio profile ──────────────────────────────────────────────────

  @Get('students/:studentId/profile')
  @RequirePermissions(PERMISSIONS.AUDIO_INTELLIGENCE!.READ!)
  @ApiOperation({
    summary: 'Get student audio intelligence profile',
    description:
      'Returns aggregated audio analysis metrics for a student across the past 90 days: ' +
      'average composite score, tajweed/accuracy/fluency/consistency breakdowns, ' +
      'mistake counts, and latest recommendations.',
  })
  @ApiParam({ name: 'studentId', description: 'Student profile ID' })
  @ApiResponse({ status: 200, type: StudentAudioProfileDto })
  async getStudentProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ): Promise<StudentAudioProfileDto> {
    const profile = await this.getProfileUseCase.execute(user, studentId);
    return this.toProfileDto(profile);
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

  private toSummaryDto(session: AudioSession): AudioSessionSummaryDto {
    const score = session.score
      ? ({
          compositeScore: session.score.compositeScore,
          breakdown: session.score.breakdown,
          totalExpectedWords: session.score.totalExpectedWords,
          correctWords: session.score.correctWords,
          insertedWords: session.score.insertedWords,
          deletedWords: session.score.deletedWords,
          totalMistakes: session.score.totalMistakes,
          criticalMistakes: session.score.criticalMistakes,
          majorMistakes: session.score.majorMistakes,
          minorMistakes: session.score.minorMistakes,
          wordsPerMinute: session.score.wordsPerMinute,
          speechDurationSeconds: session.score.speechDurationSeconds,
          tier: session.score.tier,
        } satisfies AudioScoreDto)
      : undefined;

    return {
      id: session.id,
      studentId: session.studentId,
      surahNumber: session.surahNumber,
      fromAyah: session.fromAyah,
      toAyah: session.toAyah,
      format: session.format,
      durationSeconds: session.durationSeconds,
      status: session.status,
      score,
      recommendations: (session.recommendations ?? []).map(
        (r): AudioRecommendationDto => ({
          type: r.type,
          priority: r.priority,
          title: r.title,
          description: r.description,
          triggeredBy: r.triggeredBy,
          actionable: r.actionable,
          target: r.target,
          tajweedRule: r.tajweedRule,
        }),
      ),
      totalSegments: session.totalSegments,
      totalMistakes: session.totalMistakes,
      criticalMistakes: session.criticalMistakes,
      tajweedObservationCount: session.tajweedObservationCount,
      processedAt: session.processedAt?.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  private toProfileDto(profile: StudentAudioProfile): StudentAudioProfileDto {
    return {
      studentId: profile.studentId,
      generatedAt: profile.generatedAt.toISOString(),
      totalSessions: profile.totalSessions,
      completedSessions: profile.completedSessions,
      averageCompositeScore: profile.averageCompositeScore,
      bestCompositeScore: profile.bestCompositeScore,
      latestCompositeScore: profile.latestCompositeScore,
      averageAccuracyScore: profile.averageAccuracyScore,
      averageTajweedScore: profile.averageTajweedScore,
      averageFluencyScore: profile.averageFluencyScore,
      averageConsistencyScore: profile.averageConsistencyScore,
      totalMistakes: profile.totalMistakes,
      totalCriticalMistakes: profile.totalCriticalMistakes,
      latestTier: profile.latestTier,
    };
  }
}
