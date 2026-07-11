import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiRequest, AiRequestDocument, AiReport, AiReportDocument } from '@database/mongoose/schemas';
import { AiFeatureType, AiRequestStatus } from '@shared/enums/ai.enum';
import {
  AiReportItem,
  CreateAiReportInput,
  IAiInsightRepository,
} from '../../domain/repositories/ai-insight.repository.interface';

@Injectable()
export class AiInsightRepository implements IAiInsightRepository {
  constructor(
    @InjectModel(AiRequest.name) private readonly requestModel: Model<AiRequestDocument>,
    @InjectModel(AiReport.name) private readonly reportModel: Model<AiReportDocument>,
  ) {}

  async findLatest(tenantId: string, type: AiFeatureType, studentId: string | null): Promise<AiReportItem | null> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      type,
      isDeleted: false,
    };
    query.student = studentId && Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : null;

    const doc = await this.reportModel.findOne(query).sort({ createdAt: -1 }).lean();
    return doc ? toItem(doc) : null;
  }

  async findById(tenantId: string, reportId: string): Promise<AiReportItem | null> {
    if (!Types.ObjectId.isValid(reportId)) return null;
    const doc = await this.reportModel
      .findOne({ _id: new Types.ObjectId(reportId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async create(input: CreateAiReportInput): Promise<AiReportItem> {
    const request = await this.requestModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      requestedBy: new Types.ObjectId(input.requestedBy),
      student: input.studentId && Types.ObjectId.isValid(input.studentId) ? new Types.ObjectId(input.studentId) : undefined,
      type: input.type,
      status: AiRequestStatus.COMPLETED,
      inputPayload: { sourceDataHash: input.sourceDataHash },
      completedAt: new Date(),
    });

    const report = await this.reportModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      request: request._id,
      student: input.studentId && Types.ObjectId.isValid(input.studentId) ? new Types.ObjectId(input.studentId) : undefined,
      type: input.type,
      summary: { content: input.content, structured: input.structured ?? {} },
      sourceDataHash: input.sourceDataHash,
      modelVersion: input.modelVersion,
    });

    return toItem(report.toObject());
  }

  async acknowledge(tenantId: string, reportId: string, userId: string): Promise<AiReportItem> {
    const doc = await this.reportModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(reportId), tenantId: new Types.ObjectId(tenantId) },
        { $set: { acknowledgedBy: new Types.ObjectId(userId), acknowledgedAt: new Date() } },
        { new: true },
      )
      .lean();
    if (!doc) throw new Error('AI report not found.');
    return toItem(doc);
  }

  async listForStudent(
    tenantId: string,
    studentId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: AiReportItem[]; total: number }> {
    if (!Types.ObjectId.isValid(studentId)) return { items: [], total: 0 };
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      student: new Types.ObjectId(studentId),
      isDeleted: false,
    };
    const [docs, total] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.reportModel.countDocuments(query),
    ]);
    return { items: docs.map(toItem), total };
  }
}

function toItem(doc: any): AiReportItem {
  return {
    id: String(doc._id),
    studentId: doc.student ? String(doc.student) : null,
    type: doc.type,
    content: doc.summary?.content ?? '',
    structured: doc.summary?.structured ?? {},
    sourceDataHash: doc.sourceDataHash,
    modelVersion: doc.modelVersion ?? null,
    acknowledgedBy: doc.acknowledgedBy ? String(doc.acknowledgedBy) : null,
    acknowledgedAt: doc.acknowledgedAt ?? null,
    createdAt: doc.createdAt,
  };
}
