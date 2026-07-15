import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StudentAchievement, StudentAchievementDocument } from '@database/mongoose/schemas';
import {
  IStudentAchievementRepository,
  CreateStudentAchievementData,
} from '../../domain/repositories/student-achievement.repository.interface';

@Injectable()
export class StudentAchievementRepository implements IStudentAchievementRepository {
  constructor(
    @InjectModel(StudentAchievement.name)
    private readonly model: Model<StudentAchievementDocument>,
  ) {}

  findByStudent(tenantId: string, studentId: string): Promise<StudentAchievementDocument[]> {
    return this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        studentId: new Types.ObjectId(studentId),
        isDeleted: false,
      })
      .sort({ awardedAt: -1 })
      .populate('achievementId')
      .exec();
  }

  async hasAchievement(tenantId: string, studentId: string, achievementId: string): Promise<boolean> {
    const count = await this.model.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      achievementId: new Types.ObjectId(achievementId),
      isDeleted: false,
    });
    return count > 0;
  }

  create(data: CreateStudentAchievementData): Promise<StudentAchievementDocument> {
    return this.model.create({
      ...data,
      tenantId: new Types.ObjectId(data.tenantId),
      studentId: new Types.ObjectId(data.studentId),
      achievementId: new Types.ObjectId(data.achievementId),
      awardedByUserId: data.awardedByUserId ? new Types.ObjectId(data.awardedByUserId) : undefined,
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
