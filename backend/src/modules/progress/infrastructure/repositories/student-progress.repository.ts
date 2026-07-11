import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StudentProgress, StudentProgressDocument } from '@database/mongoose/schemas';
import {
  IStudentProgressRepository,
  StudentProgressRecord,
  UpsertProgressInput,
} from '../../domain/repositories/student-progress.repository.interface';

@Injectable()
export class StudentProgressRepository implements IStudentProgressRepository {
  constructor(
    @InjectModel(StudentProgress.name)
    private readonly model: Model<StudentProgressDocument>,
  ) {}

  async findByStudent(tenantId: string, studentId: string): Promise<StudentProgressRecord | null> {
    if (!Types.ObjectId.isValid(studentId)) return null;
    const doc = await this.model
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        isDeleted: false,
      })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async upsert(input: UpsertProgressInput): Promise<StudentProgressRecord> {
    if (!Types.ObjectId.isValid(input.studentId)) {
      throw new Error(`Invalid studentId: ${input.studentId}`);
    }

    const doc = await this.model
      .findOneAndUpdate(
        {
          tenantId: new Types.ObjectId(input.tenantId),
          student: new Types.ObjectId(input.studentId),
        },
        {
          $set: {
            tenantId: new Types.ObjectId(input.tenantId),
            student: new Types.ObjectId(input.studentId),
            totalAyahsMemorized: input.totalAyahsMemorized,
            totalPagesMemorized: input.totalPagesMemorized,
            totalJuzMemorized: input.totalJuzMemorized,
            memorizationPercentage: input.memorizationPercentage,
            totalMemorizationSessions: input.totalMemorizationSessions,
            lastMemorizationDate: input.lastMemorizationDate,
            totalAyahsRevised: input.totalAyahsRevised,
            revisionPercentage: input.revisionPercentage,
            totalRevisionSessions: input.totalRevisionSessions,
            lastRevisionDate: input.lastRevisionDate,
            currentStreak: input.currentStreak,
            longestStreak: input.longestStreak,
            lastActivityDate: input.lastActivityDate,
            isDeleted: false,
          },
        },
        { new: true, upsert: true },
      )
      .lean();

    return toRecord(doc!);
  }
}

function toRecord(doc: any): StudentProgressRecord {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    totalAyahsMemorized: doc.totalAyahsMemorized ?? 0,
    totalPagesMemorized: doc.totalPagesMemorized ?? 0,
    totalJuzMemorized: doc.totalJuzMemorized ?? 0,
    memorizationPercentage: doc.memorizationPercentage ?? 0,
    totalMemorizationSessions: doc.totalMemorizationSessions ?? 0,
    lastMemorizationDate: doc.lastMemorizationDate ?? null,
    totalAyahsRevised: doc.totalAyahsRevised ?? 0,
    revisionPercentage: doc.revisionPercentage ?? 0,
    totalRevisionSessions: doc.totalRevisionSessions ?? 0,
    lastRevisionDate: doc.lastRevisionDate ?? null,
    currentStreak: doc.currentStreak ?? 0,
    longestStreak: doc.longestStreak ?? 0,
    lastActivityDate: doc.lastActivityDate ?? null,
    updatedAt: doc.updatedAt,
  };
}
