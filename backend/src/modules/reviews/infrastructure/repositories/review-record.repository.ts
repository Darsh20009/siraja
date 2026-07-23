import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewRecord, ReviewRecordDocument, QuranRange } from '@database/mongoose/schemas';
import {
  CreateReviewRecordInput,
  IReviewRecordRepository,
  ReviewListFilter,
  ReviewRecordItem,
  RevisionPerformance,
} from '../../domain/repositories/review-record.repository.interface';

@Injectable()
export class ReviewRecordRepository implements IReviewRecordRepository {
  constructor(
    @InjectModel(ReviewRecord.name)
    private readonly model: Model<ReviewRecordDocument>,
  ) {}

  async create(input: CreateReviewRecordInput): Promise<ReviewRecordItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      session: input.sessionId ? new Types.ObjectId(input.sessionId) : undefined,
      reviewedBy: new Types.ObjectId(input.reviewedById),
      range: input.range,
      retentionGrade: input.retentionGrade,
      nextReviewDueAt: input.nextReviewDueAt,
      notes: input.notes,
      reviewedAt: input.reviewedAt ?? new Date(),
    });
    return toRecord(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<ReviewRecordItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: ReviewListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: ReviewRecordItem[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.studentId && Types.ObjectId.isValid(filter.studentId)) {
      query.student = new Types.ObjectId(filter.studentId);
    } else if (filter.studentIds && filter.studentIds.length > 0) {
      const validIds = filter.studentIds.filter((id) => Types.ObjectId.isValid(id));
      query.student = { $in: validIds.map((id) => new Types.ObjectId(id)) };
    }
    if (filter.reviewedById && Types.ObjectId.isValid(filter.reviewedById))
      query.reviewedBy = new Types.ObjectId(filter.reviewedById);
    if (filter.sessionId && Types.ObjectId.isValid(filter.sessionId))
      query.session = new Types.ObjectId(filter.sessionId);
    if (filter.fromDate || filter.toDate) {
      query.reviewedAt = {
        ...(filter.fromDate ? { $gte: filter.fromDate } : {}),
        ...(filter.toDate ? { $lte: filter.toDate } : {}),
      };
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).sort({ reviewedAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);

    return { items: docs.map(toRecord), total };
  }

  async getStudentPerformance(tenantId: string, studentId: string): Promise<RevisionPerformance> {
    if (!Types.ObjectId.isValid(studentId)) {
      return { totalSessions: 0, totalAyahsRevised: 0, gradeBreakdown: {}, averageAyahsPerSession: 0, dueTodayCount: 0 };
    }

    const tenantOid = new Types.ObjectId(tenantId);
    const studentOid = new Types.ObjectId(studentId);
    const now = new Date();

    const [docs, dueTodayCount] = await Promise.all([
      this.model
        .find({ tenantId: tenantOid, student: studentOid, isDeleted: false })
        .select('range retentionGrade')
        .lean(),
      this.model.countDocuments({
        tenantId: tenantOid,
        student: studentOid,
        isDeleted: false,
        nextReviewDueAt: { $lte: now },
      }),
    ]);

    let totalAyahsRevised = 0;
    const gradeBreakdown: Record<string, number> = {};

    for (const doc of docs) {
      const range = doc.range as QuranRange;
      if (range) {
        totalAyahsRevised +=
          range.surahFrom === range.surahTo
            ? Math.max(0, range.ayahTo - range.ayahFrom + 1)
            : Math.max(1, (range.surahTo - range.surahFrom) * 10 + range.ayahTo - range.ayahFrom + 1);
      }
      if (doc.retentionGrade) {
        gradeBreakdown[doc.retentionGrade] = (gradeBreakdown[doc.retentionGrade] ?? 0) + 1;
      }
    }

    const totalSessions = docs.length;
    const averageAyahsPerSession = totalSessions > 0 ? parseFloat((totalAyahsRevised / totalSessions).toFixed(1)) : 0;

    return { totalSessions, totalAyahsRevised, gradeBreakdown, averageAyahsPerSession, dueTodayCount };
  }

  async getTotalAyahsRevised(tenantId: string, studentId: string): Promise<number> {
    const perf = await this.getStudentPerformance(tenantId, studentId);
    return perf.totalAyahsRevised;
  }
}

function toRecord(doc: any): ReviewRecordItem {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    sessionId: doc.session ? String(doc.session) : undefined,
    reviewedById: String(doc.reviewedBy),
    range: doc.range,
    retentionGrade: doc.retentionGrade,
    nextReviewDueAt: doc.nextReviewDueAt,
    notes: doc.notes,
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
