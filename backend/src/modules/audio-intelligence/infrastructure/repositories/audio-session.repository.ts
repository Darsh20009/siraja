import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  AudioSession as AudioSessionSchema,
  AudioSessionDocument,
} from '@database/mongoose/schemas/audio-session.schema';
import {
  AudioSegment as AudioSegmentSchema,
  AudioSegmentDocument,
} from '@database/mongoose/schemas/audio-segment.schema';
import {
  AudioMistakeDetection,
  AudioMistakeDetectionDocument,
} from '@database/mongoose/schemas/audio-mistake-detection.schema';
import {
  TajweedObservation as TajweedObservationSchema,
  TajweedObservationDocument,
} from '@database/mongoose/schemas/tajweed-observation.schema';

import {
  IAudioSessionRepository,
  CreateAudioSessionInput,
  SaveProcessingResultsInput,
  AudioSessionFilter,
} from '../../domain/repositories/audio-session.repository.interface';
import type { AudioSession } from '../../domain/entities/audio-session.entity';
import type { AudioSegment } from '../../domain/entities/audio-segment.entity';
import type { MistakeDetection } from '../../domain/entities/mistake-detection.entity';
import type { TajweedObservation } from '../../domain/entities/tajweed-observation.entity';

@Injectable()
export class AudioSessionRepository implements IAudioSessionRepository {
  constructor(
    @InjectModel(AudioSessionSchema.name)
    private readonly sessionModel: Model<AudioSessionDocument>,
    @InjectModel(AudioSegmentSchema.name)
    private readonly segmentModel: Model<AudioSegmentDocument>,
    @InjectModel(AudioMistakeDetection.name)
    private readonly mistakeModel: Model<AudioMistakeDetectionDocument>,
    @InjectModel(TajweedObservationSchema.name)
    private readonly observationModel: Model<TajweedObservationDocument>,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(input: CreateAudioSessionInput): Promise<AudioSession> {
    const doc = await this.sessionModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      memorizationRecord: input.memorizationRecordId
        ? new Types.ObjectId(input.memorizationRecordId)
        : undefined,
      surahNumber: input.surahNumber,
      fromAyah: input.fromAyah,
      toAyah: input.toAyah,
      fileKey: input.fileKey,
      format: input.format,
      durationSeconds: input.durationSeconds,
      fileSizeBytes: input.fileSizeBytes,
      sampleRate: input.sampleRate,
      channels: input.channels,
      status: 'pending',
      recommendations: [],
      totalSegments: 0,
      totalMistakes: 0,
      criticalMistakes: 0,
      tajweedObservationCount: 0,
    });
    return this.toEntity(doc);
  }

  // ── Find ───────────────────────────────────────────────────────────────────

  async findById(tenantId: string, sessionId: string): Promise<AudioSession | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;
    const doc = await this.sessionModel
      .findOne({ _id: new Types.ObjectId(sessionId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean()
      .exec();
    return doc ? this.toEntity(doc as AudioSessionDocument) : null;
  }

  async findByIdWithDetails(tenantId: string, sessionId: string): Promise<AudioSession | null> {
    const session = await this.findById(tenantId, sessionId);
    if (!session) return null;

    const [segments, mistakes, observations] = await Promise.all([
      this.loadSegments(sessionId),
      this.loadMistakes(sessionId),
      this.loadObservations(sessionId),
    ]);

    session.segments = segments;
    session.mistakes = mistakes;
    session.tajweedObservations = observations;
    return session;
  }

  async findByStudent(
    tenantId: string,
    studentId: string,
    filter?: AudioSessionFilter,
    limit = 20,
    skip = 0,
  ): Promise<AudioSession[]> {
    const query = this.buildQuery(tenantId, studentId, filter);
    const docs = await this.sessionModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    return docs.map((d) => this.toEntity(d as AudioSessionDocument));
  }

  async countByStudent(
    tenantId: string,
    studentId: string,
    filter?: AudioSessionFilter,
  ): Promise<number> {
    const query = this.buildQuery(tenantId, studentId, filter);
    return this.sessionModel.countDocuments(query).exec();
  }

  async findRecentByStudent(
    tenantId: string,
    studentId: string,
    days: number,
  ): Promise<AudioSession[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const docs = await this.sessionModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        isDeleted: false,
        createdAt: { $gte: since },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toEntity(d as AudioSessionDocument));
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async updateStatus(
    tenantId: string,
    sessionId: string,
    status: AudioSession['status'],
    errorMessage?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (errorMessage) update.errorMessage = errorMessage;
    await this.sessionModel
      .updateOne(
        { _id: new Types.ObjectId(sessionId), tenantId: new Types.ObjectId(tenantId) },
        { $set: update },
      )
      .exec();
  }

  async saveProcessingResults(
    tenantId: string,
    sessionId: string,
    results: SaveProcessingResultsInput,
  ): Promise<AudioSession> {
    const tenantOid = new Types.ObjectId(tenantId);
    const sessionOid = new Types.ObjectId(sessionId);

    // Persist segments
    const persistedSegmentIds: string[] = [];
    for (const seg of results.segments) {
      const segDoc = await this.segmentModel.create({
        session: sessionOid,
        tenantId: tenantOid,
        student: new Types.ObjectId(results.segments[0] ? undefined : '000000000000000000000000'),
        segmentIndex: seg.segmentIndex,
        startSeconds: seg.startSeconds,
        endSeconds: seg.endSeconds,
        durationSeconds: seg.durationSeconds,
        voiceActivityConfidence: seg.voiceActivityConfidence,
        energyDbfs: seg.energyDbfs,
        pitchHz: seg.pitchHz,
        wordAlignments: seg.wordAlignments.map((wa) => ({
          recognisedText: wa.recognisedText,
          expectedText: wa.expectedText,
          surahNumber: wa.surahNumber,
          ayahNumber: wa.ayahNumber,
          wordIndex: wa.wordIndex,
          startSeconds: wa.startSeconds,
          endSeconds: wa.endSeconds,
          confidence: wa.confidence,
          isMatch: wa.isMatch,
          editDistance: wa.editDistance,
        })),
      });
      persistedSegmentIds.push(String(segDoc._id));
    }

    // Persist mistakes
    for (const m of results.mistakes) {
      await this.mistakeModel.create({
        session: sessionOid,
        tenantId: tenantOid,
        student: new Types.ObjectId(m.sessionId.length === 24 ? m.sessionId : sessionId),
        type: m.type,
        severity: m.severity,
        surahNumber: m.surahNumber,
        ayahNumber: m.ayahNumber,
        wordIndex: m.wordIndex,
        recognisedText: m.recognisedText,
        expectedText: m.expectedText,
        startSeconds: m.startSeconds,
        description: m.description,
        isRecurring: m.isRecurring,
      });
    }

    // Persist tajweed observations
    for (const obs of results.tajweedObservations) {
      await this.observationModel.create({
        session: sessionOid,
        tenantId: tenantOid,
        student: new Types.ObjectId(sessionId.length === 24 ? sessionId : '000000000000000000000000'),
        rule: obs.rule,
        outcome: obs.outcome,
        expectedCounts: obs.expectedCounts,
        measuredCounts: obs.measuredCounts,
        surahNumber: obs.surahNumber,
        ayahNumber: obs.ayahNumber,
        wordIndex: obs.wordIndex,
        startSeconds: obs.startSeconds,
        description: obs.description,
      });
    }

    // Update session document
    const criticalMistakes = results.mistakes.filter((m) => m.severity === 'critical').length;
    const updated = await this.sessionModel
      .findOneAndUpdate(
        { _id: sessionOid, tenantId: tenantOid },
        {
          $set: {
            status: results.status,
            score: results.score,
            recommendations: results.recommendations,
            totalSegments: results.segments.length,
            totalMistakes: results.mistakes.length,
            criticalMistakes,
            tajweedObservationCount: results.tajweedObservations.length,
            processedAt: results.processedAt,
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    return this.toEntity((updated ?? {}) as AudioSessionDocument);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async delete(tenantId: string, sessionId: string): Promise<void> {
    const sessionOid = new Types.ObjectId(sessionId);
    await Promise.all([
      this.sessionModel.deleteOne({ _id: sessionOid, tenantId: new Types.ObjectId(tenantId) }).exec(),
      this.segmentModel.deleteMany({ session: sessionOid }).exec(),
      this.mistakeModel.deleteMany({ session: sessionOid }).exec(),
      this.observationModel.deleteMany({ session: sessionOid }).exec(),
    ]);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildQuery(
    tenantId: string,
    studentId: string,
    filter?: AudioSessionFilter,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      student: new Types.ObjectId(studentId),
      isDeleted: false,
    };
    if (filter?.status) query.status = filter.status;
    if (filter?.surahNumber) query.surahNumber = filter.surahNumber;
    if (filter?.fromDate || filter?.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filter.fromDate) dateFilter.$gte = filter.fromDate;
      if (filter.toDate) dateFilter.$lte = filter.toDate;
      query.createdAt = dateFilter;
    }
    return query;
  }

  private async loadSegments(sessionId: string): Promise<AudioSegment[]> {
    const docs = await this.segmentModel
      .find({ session: new Types.ObjectId(sessionId) })
      .sort({ segmentIndex: 1 })
      .lean()
      .exec();
    return docs.map((d) => this.segmentToEntity(d as AudioSegmentDocument, sessionId));
  }

  private async loadMistakes(sessionId: string): Promise<MistakeDetection[]> {
    const docs = await this.mistakeModel
      .find({ session: new Types.ObjectId(sessionId) })
      .lean()
      .exec();
    return docs.map((d) => this.mistakeToEntity(d as AudioMistakeDetectionDocument, sessionId));
  }

  private async loadObservations(sessionId: string): Promise<TajweedObservation[]> {
    const docs = await this.observationModel
      .find({ session: new Types.ObjectId(sessionId) })
      .lean()
      .exec();
    return docs.map((d) => this.observationToEntity(d as TajweedObservationDocument, sessionId));
  }

  // ── Entity mappers ─────────────────────────────────────────────────────────

  private toEntity(doc: AudioSessionDocument): AudioSession {
    const d = doc as unknown as Record<string, unknown>;
    return {
      id: String(d['_id']),
      tenantId: String(d['tenantId']),
      studentId: String(d['student']),
      memorizationRecordId: d['memorizationRecord'] ? String(d['memorizationRecord']) : undefined,
      surahNumber: d['surahNumber'] as number,
      fromAyah: d['fromAyah'] as number,
      toAyah: d['toAyah'] as number,
      fileKey: d['fileKey'] as string,
      format: d['format'] as AudioSession['format'],
      durationSeconds: d['durationSeconds'] as number,
      fileSizeBytes: d['fileSizeBytes'] as number,
      sampleRate: d['sampleRate'] as number,
      channels: d['channels'] as number,
      status: d['status'] as AudioSession['status'],
      errorMessage: d['errorMessage'] as string | undefined,
      score: d['score'] as AudioSession['score'],
      recommendations: (d['recommendations'] as AudioSession['recommendations']) ?? [],
      totalSegments: d['totalSegments'] as number ?? 0,
      totalMistakes: d['totalMistakes'] as number ?? 0,
      criticalMistakes: d['criticalMistakes'] as number ?? 0,
      tajweedObservationCount: d['tajweedObservationCount'] as number ?? 0,
      processedAt: d['processedAt'] as Date | undefined,
      createdAt: d['createdAt'] as Date,
      updatedAt: d['updatedAt'] as Date,
    };
  }

  private segmentToEntity(doc: AudioSegmentDocument, sessionId: string): AudioSegment {
    const d = doc as unknown as Record<string, unknown>;
    return {
      id: String(d['_id']),
      sessionId,
      segmentIndex: d['segmentIndex'] as number,
      startSeconds: d['startSeconds'] as number,
      endSeconds: d['endSeconds'] as number,
      durationSeconds: d['durationSeconds'] as number,
      voiceActivityConfidence: d['voiceActivityConfidence'] as number,
      surahNumber: d['surahNumber'] as number | undefined,
      fromAyah: d['fromAyah'] as number | undefined,
      toAyah: d['toAyah'] as number | undefined,
      energyDbfs: d['energyDbfs'] as number,
      pitchHz: d['pitchHz'] as number,
      wordAlignments: (d['wordAlignments'] as unknown[]).map((wa) => {
        const w = wa as Record<string, unknown>;
        return {
          segmentId: String(d['_id']),
          recognisedText: w['recognisedText'] as string,
          expectedText: w['expectedText'] as string | undefined,
          surahNumber: w['surahNumber'] as number | undefined,
          ayahNumber: w['ayahNumber'] as number | undefined,
          wordIndex: w['wordIndex'] as number | undefined,
          startSeconds: w['startSeconds'] as number,
          endSeconds: w['endSeconds'] as number,
          confidence: w['confidence'] as number,
          isMatch: w['isMatch'] as boolean,
          editDistance: w['editDistance'] as number,
        };
      }),
      createdAt: d['createdAt'] as Date,
    };
  }

  private mistakeToEntity(
    doc: AudioMistakeDetectionDocument,
    sessionId: string,
  ): MistakeDetection {
    const d = doc as unknown as Record<string, unknown>;
    return {
      id: String(d['_id']),
      sessionId,
      segmentId: d['segment'] ? String(d['segment']) : undefined,
      type: d['type'] as MistakeDetection['type'],
      severity: d['severity'] as MistakeDetection['severity'],
      surahNumber: d['surahNumber'] as number | undefined,
      ayahNumber: d['ayahNumber'] as number | undefined,
      wordIndex: d['wordIndex'] as number | undefined,
      recognisedText: d['recognisedText'] as string | undefined,
      expectedText: d['expectedText'] as string | undefined,
      startSeconds: d['startSeconds'] as number | undefined,
      description: d['description'] as string,
      isRecurring: d['isRecurring'] as boolean,
      createdAt: d['createdAt'] as Date,
    };
  }

  private observationToEntity(
    doc: TajweedObservationDocument,
    sessionId: string,
  ): TajweedObservation {
    const d = doc as unknown as Record<string, unknown>;
    return {
      id: String(d['_id']),
      sessionId,
      segmentId: d['segment'] ? String(d['segment']) : undefined,
      rule: d['rule'] as TajweedObservation['rule'],
      outcome: d['outcome'] as TajweedObservation['outcome'],
      expectedCounts: d['expectedCounts'] as number | undefined,
      measuredCounts: d['measuredCounts'] as number | undefined,
      surahNumber: d['surahNumber'] as number | undefined,
      ayahNumber: d['ayahNumber'] as number | undefined,
      wordIndex: d['wordIndex'] as number | undefined,
      startSeconds: d['startSeconds'] as number | undefined,
      description: d['description'] as string,
      createdAt: d['createdAt'] as Date,
    };
  }
}
