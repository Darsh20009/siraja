import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from '@database/mongoose/schemas';
import {
  AttendanceItem,
  AttendanceListFilter,
  AttendanceRateStat,
  CreateAttendanceInput,
  IAttendanceRepository,
  UpdateAttendanceInput,
} from '../../domain/repositories/attendance.repository.interface';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

@Injectable()
export class AttendanceRepository implements IAttendanceRepository {
  constructor(
    @InjectModel(Attendance.name)
    private readonly model: Model<AttendanceDocument>,
  ) {}

  async create(input: CreateAttendanceInput): Promise<AttendanceItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      session: input.sessionId ? new Types.ObjectId(input.sessionId) : undefined,
      student: new Types.ObjectId(input.studentId),
      group: input.groupId ? new Types.ObjectId(input.groupId) : undefined,
      sheikh: input.sheikhId ? new Types.ObjectId(input.sheikhId) : undefined,
      status: input.status,
      date: input.date,
      checkedInAt: input.checkedInAt,
      recordedBy: input.recordedById ? new Types.ObjectId(input.recordedById) : undefined,
      notes: input.notes,
    });
    return toItem(doc.toObject());
  }

  async bulkCreate(inputs: CreateAttendanceInput[]): Promise<AttendanceItem[]> {
    const docs = await this.model.insertMany(
      inputs.map((input) => ({
        tenantId: new Types.ObjectId(input.tenantId),
        session: input.sessionId ? new Types.ObjectId(input.sessionId) : undefined,
        student: new Types.ObjectId(input.studentId),
        group: input.groupId ? new Types.ObjectId(input.groupId) : undefined,
        sheikh: input.sheikhId ? new Types.ObjectId(input.sheikhId) : undefined,
        status: input.status,
        date: input.date,
        checkedInAt: input.checkedInAt,
        recordedBy: input.recordedById ? new Types.ObjectId(input.recordedById) : undefined,
        notes: input.notes,
      })),
      { ordered: false },
    );
    return (docs as AttendanceDocument[]).map((d) => toItem(d.toObject()));
  }

  async findById(tenantId: string, id: string): Promise<AttendanceItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: AttendanceListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: AttendanceItem[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.sessionId && Types.ObjectId.isValid(filter.sessionId))
      query.session = new Types.ObjectId(filter.sessionId);
    if (filter.studentId && Types.ObjectId.isValid(filter.studentId))
      query.student = new Types.ObjectId(filter.studentId);
    else if (filter.studentIds && filter.studentIds.length > 0) {
      const validIds = filter.studentIds.filter((id) => Types.ObjectId.isValid(id));
      query.student = { $in: validIds.map((id) => new Types.ObjectId(id)) };
    }
    if (filter.groupId && Types.ObjectId.isValid(filter.groupId))
      query.group = new Types.ObjectId(filter.groupId);
    if (filter.sheikhId && Types.ObjectId.isValid(filter.sheikhId))
      query.sheikh = new Types.ObjectId(filter.sheikhId);
    if (filter.status) query.status = filter.status;
    if (filter.fromDate || filter.toDate) {
      query.date = {
        ...(filter.fromDate ? { $gte: filter.fromDate } : {}),
        ...(filter.toDate ? { $lte: filter.toDate } : {}),
      };
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { items: docs.map(toItem), total };
  }

  async update(tenantId: string, id: string, input: UpdateAttendanceInput): Promise<AttendanceItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: removeUndefined(input as Record<string, unknown>) },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Attendance record not found.');
    return toItem(doc);
  }

  async getStudentAttendanceRate(
    tenantId: string,
    studentId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<AttendanceRateStat> {
    if (!Types.ObjectId.isValid(studentId))
      return { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 };

    const dateFilter: Record<string, unknown> = {};
    if (fromDate || toDate) {
      dateFilter.date = {
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
      .select('status')
      .lean();

    return computeRate(docs);
  }

  async getGroupAttendanceRate(
    tenantId: string,
    groupId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<AttendanceRateStat> {
    if (!Types.ObjectId.isValid(groupId))
      return { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 };

    const dateFilter: Record<string, unknown> = {};
    if (fromDate || toDate) {
      dateFilter.date = {
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
      .select('status')
      .lean();

    return computeRate(docs);
  }
}

function computeRate(docs: { status: string }[]): AttendanceRateStat {
  const stat = { total: docs.length, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 };
  for (const d of docs) {
    if (d.status === AttendanceStatus.PRESENT) stat.present++;
    else if (d.status === AttendanceStatus.ABSENT) stat.absent++;
    else if (d.status === AttendanceStatus.LATE) stat.late++;
    else if (d.status === AttendanceStatus.EXCUSED) stat.excused++;
  }
  stat.attendanceRate = stat.total > 0 ? Math.round(((stat.present + stat.late) / stat.total) * 100) : 0;
  return stat;
}

function toItem(doc: any): AttendanceItem {
  return {
    id: String(doc._id),
    sessionId: doc.session ? String(doc.session) : undefined,
    studentId: String(doc.student),
    groupId: doc.group ? String(doc.group) : undefined,
    sheikhId: doc.sheikh ? String(doc.sheikh) : undefined,
    status: doc.status,
    date: doc.date,
    checkedInAt: doc.checkedInAt,
    recordedById: doc.recordedBy ? String(doc.recordedBy) : undefined,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function removeUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
