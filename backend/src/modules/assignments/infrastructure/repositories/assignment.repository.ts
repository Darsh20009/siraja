import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assignment, AssignmentDocument } from '@database/mongoose/schemas';
import {
  AssignmentItem,
  AssignmentListFilter,
  CreateAssignmentInput,
  IAssignmentRepository,
  ReviewAssignmentInput,
  SubmitAssignmentInput,
  UpdateAssignmentInput,
} from '../../domain/repositories/assignment.repository.interface';
import { AssignmentStatus } from '@shared/enums/exam-assignment.enum';

@Injectable()
export class AssignmentRepository implements IAssignmentRepository {
  constructor(
    @InjectModel(Assignment.name)
    private readonly model: Model<AssignmentDocument>,
  ) {}

  async create(input: CreateAssignmentInput): Promise<AssignmentItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      group: input.groupId ? new Types.ObjectId(input.groupId) : undefined,
      assignedBy: new Types.ObjectId(input.assignedById),
      type: input.type,
      title: input.title,
      description: input.description,
      status: AssignmentStatus.ASSIGNED,
      dueAt: input.dueAt,
    });
    return toItem(doc.toObject());
  }

  async bulkCreate(inputs: CreateAssignmentInput[]): Promise<AssignmentItem[]> {
    const docs = await this.model.insertMany(
      inputs.map((input) => ({
        tenantId: new Types.ObjectId(input.tenantId),
        student: new Types.ObjectId(input.studentId),
        group: input.groupId ? new Types.ObjectId(input.groupId) : undefined,
        assignedBy: new Types.ObjectId(input.assignedById),
        type: input.type,
        title: input.title,
        description: input.description,
        status: AssignmentStatus.ASSIGNED,
        dueAt: input.dueAt,
      })),
    );
    return docs.map((d) => toItem((d as any).toObject()));
  }

  async findById(tenantId: string, id: string): Promise<AssignmentItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: AssignmentListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: AssignmentItem[]; total: number }> {
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
    if (filter.assignedById && Types.ObjectId.isValid(filter.assignedById))
      query.assignedBy = new Types.ObjectId(filter.assignedById);
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.fromDue || filter.toDue) {
      query.dueAt = {
        ...(filter.fromDue ? { $gte: filter.fromDue } : {}),
        ...(filter.toDue ? { $lte: filter.toDue } : {}),
      };
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { items: docs.map(toItem), total };
  }

  async update(tenantId: string, id: string, input: UpdateAssignmentInput): Promise<AssignmentItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: removeUndefined(input as Record<string, unknown>) },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Assignment not found.');
    return toItem(doc);
  }

  async submit(tenantId: string, id: string, input: SubmitAssignmentInput): Promise<AssignmentItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        {
          $set: {
            status: AssignmentStatus.SUBMITTED,
            submittedAt: input.submittedAt,
            submissionNotes: input.submissionNotes,
          },
        },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Assignment not found.');
    return toItem(doc);
  }

  async review(tenantId: string, id: string, input: ReviewAssignmentInput): Promise<AssignmentItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: removeUndefined({ status: input.status, feedback: input.feedback }) },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Assignment not found.');
    return toItem(doc);
  }

  async markOverdue(tenantId: string): Promise<number> {
    const result = await this.model.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        status: AssignmentStatus.ASSIGNED,
        dueAt: { $lt: new Date() },
        isDeleted: false,
      },
      { $set: { status: AssignmentStatus.OVERDUE } },
    );
    return result.modifiedCount;
  }
}

function toItem(doc: any): AssignmentItem {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    groupId: doc.group ? String(doc.group) : undefined,
    assignedById: String(doc.assignedBy),
    type: doc.type,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    dueAt: doc.dueAt,
    submittedAt: doc.submittedAt,
    submissionNotes: doc.submissionNotes,
    feedback: doc.feedback,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function removeUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
