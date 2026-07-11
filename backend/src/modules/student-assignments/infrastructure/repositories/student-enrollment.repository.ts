import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StudentEnrollment, StudentEnrollmentDocument } from '@database/mongoose/schemas';
import {
  CreateEnrollmentInput,
  IStudentEnrollmentRepository,
  StudentEnrollmentRecord,
} from '../../domain/repositories/student-enrollment.repository.interface';

@Injectable()
export class StudentEnrollmentRepository implements IStudentEnrollmentRepository {
  constructor(
    @InjectModel(StudentEnrollment.name) private readonly model: Model<StudentEnrollmentDocument>,
  ) {}

  async create(input: CreateEnrollmentInput): Promise<StudentEnrollmentRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      enrollmentType: input.enrollmentType,
      circle: input.circleId ? new Types.ObjectId(input.circleId) : null,
      previousCircle: input.previousCircleId ? new Types.ObjectId(input.previousCircleId) : null,
      sheikh: input.sheikhId ? new Types.ObjectId(input.sheikhId) : null,
      assignedBy: new Types.ObjectId(input.assignedById),
      notes: input.notes,
      effectiveDate: new Date(),
    });
    return toRecord(doc);
  }

  async findByStudent(tenantId: string, studentId: string): Promise<StudentEnrollmentRecord[]> {
    if (!Types.ObjectId.isValid(studentId)) return [];
    const docs = await this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
      })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toRecord);
  }
}

function toRecord(doc: any): StudentEnrollmentRecord {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    enrollmentType: doc.enrollmentType,
    circleId: doc.circle ? String(doc.circle) : null,
    previousCircleId: doc.previousCircle ? String(doc.previousCircle) : null,
    sheikhId: doc.sheikh ? String(doc.sheikh) : null,
    assignedById: String(doc.assignedBy),
    effectiveDate: doc.effectiveDate,
    notes: doc.notes,
    createdAt: doc.createdAt,
  };
}
