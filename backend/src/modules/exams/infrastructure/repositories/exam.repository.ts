import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Exam, ExamDocument } from '@database/mongoose/schemas';
import {
  CreateExamInput,
  ExamItem,
  ExamListFilter,
  ExamPerformanceStat,
  GradeExamInput,
  IExamRepository,
  UpdateExamInput,
} from '../../domain/repositories/exam.repository.interface';
import { ExamResult, ExamStatus } from '@shared/enums/exam-assignment.enum';

@Injectable()
export class ExamRepository implements IExamRepository {
  constructor(
    @InjectModel(Exam.name)
    private readonly model: Model<ExamDocument>,
  ) {}

  async create(input: CreateExamInput): Promise<ExamItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      group: input.groupId ? new Types.ObjectId(input.groupId) : undefined,
      examiner: input.examinerId ? new Types.ObjectId(input.examinerId) : undefined,
      category: input.category,
      type: input.type,
      status: ExamStatus.SCHEDULED,
      range: input.range,
      scheduledAt: input.scheduledAt,
      result: ExamResult.PENDING,
      notes: input.notes,
    });
    return toItem(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<ExamItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: ExamListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: ExamItem[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.studentId && Types.ObjectId.isValid(filter.studentId))
      query.student = new Types.ObjectId(filter.studentId);
    else if (filter.studentIds && filter.studentIds.length > 0) {
      const validIds = filter.studentIds.filter((id) => Types.ObjectId.isValid(id));
      query.student = { $in: validIds.map((id) => new Types.ObjectId(id)) };
    }
    if (filter.groupId && Types.ObjectId.isValid(filter.groupId))
      query.group = new Types.ObjectId(filter.groupId);
    if (filter.examinerId && Types.ObjectId.isValid(filter.examinerId))
      query.examiner = new Types.ObjectId(filter.examinerId);
    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;
    if (filter.result) query.result = filter.result;
    if (filter.fromDate || filter.toDate) {
      query.scheduledAt = {
        ...(filter.fromDate ? { $gte: filter.fromDate } : {}),
        ...(filter.toDate ? { $lte: filter.toDate } : {}),
      };
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).sort({ scheduledAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { items: docs.map(toItem), total };
  }

  async update(tenantId: string, id: string, input: UpdateExamInput): Promise<ExamItem> {
    const updateData: Record<string, unknown> = removeUndefined({
      status: input.status,
      scheduledAt: input.scheduledAt,
      notes: input.notes,
    });
    if (input.examinerId) updateData.examiner = new Types.ObjectId(input.examinerId);

    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: updateData },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Exam not found.');
    return toItem(doc);
  }

  async grade(tenantId: string, id: string, input: GradeExamInput): Promise<ExamItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        {
          $set: removeUndefined({
            score: input.score,
            grade: input.grade,
            result: input.result,
            notes: input.notes,
            status: ExamStatus.GRADED,
          }),
        },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Exam not found.');
    return toItem(doc);
  }

  async getStudentPerformance(
    tenantId: string,
    studentId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<ExamPerformanceStat> {
    if (!Types.ObjectId.isValid(studentId))
      return { total: 0, graded: 0, passed: 0, failed: 0, averageScore: 0, passRate: 0 };

    const dateFilter: Record<string, unknown> = {};
    if (fromDate || toDate) {
      dateFilter.scheduledAt = {
        ...(fromDate ? { $gte: fromDate } : {}),
        ...(toDate ? { $lte: toDate } : {}),
      };
    }

    const docs = await this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        isDeleted: false,
        ...dateFilter,
      })
      .select('status result score')
      .lean();

    return computePerformance(docs);
  }

  async getGroupPerformance(
    tenantId: string,
    groupId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<ExamPerformanceStat> {
    if (!Types.ObjectId.isValid(groupId))
      return { total: 0, graded: 0, passed: 0, failed: 0, averageScore: 0, passRate: 0 };

    const dateFilter: Record<string, unknown> = {};
    if (fromDate || toDate) {
      dateFilter.scheduledAt = {
        ...(fromDate ? { $gte: fromDate } : {}),
        ...(toDate ? { $lte: toDate } : {}),
      };
    }

    const docs = await this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        group: new Types.ObjectId(groupId),
        isDeleted: false,
        ...dateFilter,
      })
      .select('status result score')
      .lean();

    return computePerformance(docs);
  }
}

function computePerformance(docs: { status: string; result: string; score?: number }[]): ExamPerformanceStat {
  const stat: ExamPerformanceStat = { total: docs.length, graded: 0, passed: 0, failed: 0, averageScore: 0, passRate: 0 };
  let scoreSum = 0;
  for (const d of docs) {
    if (d.status === ExamStatus.GRADED) {
      stat.graded++;
      if (d.result === ExamResult.PASS) stat.passed++;
      else if (d.result === ExamResult.FAIL) stat.failed++;
      if (d.score != null) scoreSum += d.score;
    }
  }
  stat.averageScore = stat.graded > 0 ? Math.round(scoreSum / stat.graded) : 0;
  stat.passRate = stat.graded > 0 ? Math.round((stat.passed / stat.graded) * 100) : 0;
  return stat;
}

function toItem(doc: any): ExamItem {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    groupId: doc.group ? String(doc.group) : undefined,
    examinerId: doc.examiner ? String(doc.examiner) : undefined,
    category: doc.category,
    type: doc.type,
    status: doc.status,
    range: doc.range,
    scheduledAt: doc.scheduledAt,
    score: doc.score,
    grade: doc.grade,
    result: doc.result,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function removeUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
