import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assessment, AssessmentDocument } from '@database/mongoose/schemas';
import {
  AssessmentItem,
  AssessmentListFilter,
  CreateAssessmentInput,
  IAssessmentRepository,
  UpdateAssessmentInput,
} from '../../domain/repositories/assessment.repository.interface';

@Injectable()
export class AssessmentRepository implements IAssessmentRepository {
  constructor(
    @InjectModel(Assessment.name)
    private readonly model: Model<AssessmentDocument>,
  ) {}

  async create(input: CreateAssessmentInput): Promise<AssessmentItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      group: input.groupId ? new Types.ObjectId(input.groupId) : undefined,
      assessedBy: new Types.ObjectId(input.assessedById),
      type: input.type,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      score: input.score,
      grade: input.grade,
      title: input.title,
      notes: input.notes,
    });
    return toItem(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<AssessmentItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: AssessmentListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: AssessmentItem[]; total: number }> {
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
    if (filter.assessedById && Types.ObjectId.isValid(filter.assessedById))
      query.assessedBy = new Types.ObjectId(filter.assessedById);
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.fromDate || filter.toDate) {
      query.periodStart = {
        ...(filter.fromDate ? { $gte: filter.fromDate } : {}),
        ...(filter.toDate ? { $lte: filter.toDate } : {}),
      };
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).sort({ periodStart: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { items: docs.map(toItem), total };
  }

  async update(tenantId: string, id: string, input: UpdateAssessmentInput): Promise<AssessmentItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: removeUndefined(input as Record<string, unknown>) },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Assessment not found.');
    return toItem(doc);
  }
}

function toItem(doc: any): AssessmentItem {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    groupId: doc.group ? String(doc.group) : undefined,
    assessedById: String(doc.assessedBy),
    type: doc.type,
    status: doc.status,
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
    score: doc.score,
    grade: doc.grade,
    title: doc.title,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function removeUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
