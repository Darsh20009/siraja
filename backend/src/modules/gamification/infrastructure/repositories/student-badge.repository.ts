import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StudentBadge, StudentBadgeDocument } from '@database/mongoose/schemas';
import {
  IStudentBadgeRepository,
  CreateStudentBadgeData,
} from '../../domain/repositories/student-badge.repository.interface';

@Injectable()
export class StudentBadgeRepository implements IStudentBadgeRepository {
  constructor(
    @InjectModel(StudentBadge.name)
    private readonly model: Model<StudentBadgeDocument>,
  ) {}

  findByStudent(tenantId: string, studentId: string): Promise<StudentBadgeDocument[]> {
    return this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        studentId: new Types.ObjectId(studentId),
        isDeleted: false,
      })
      .sort({ awardedAt: -1 })
      .populate('badgeId')
      .exec();
  }

  async hasBadge(tenantId: string, studentId: string, badgeId: string): Promise<boolean> {
    const count = await this.model.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      badgeId: new Types.ObjectId(badgeId),
      isDeleted: false,
    });
    return count > 0;
  }

  create(data: CreateStudentBadgeData): Promise<StudentBadgeDocument> {
    return this.model.create({
      ...data,
      tenantId: new Types.ObjectId(data.tenantId),
      studentId: new Types.ObjectId(data.studentId),
      badgeId: new Types.ObjectId(data.badgeId),
      awardedByUserId: data.awardedByUserId ? new Types.ObjectId(data.awardedByUserId) : undefined,
      triggeredByRuleId: data.triggeredByRuleId ? new Types.ObjectId(data.triggeredByRuleId) : undefined,
    });
  }

  countByStudent(tenantId: string, studentId: string): Promise<number> {
    return this.model.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      isDeleted: false,
    });
  }
}
