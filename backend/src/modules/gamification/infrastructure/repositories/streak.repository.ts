import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Streak, StreakDocument } from '@database/mongoose/schemas';
import { IStreakRepository } from '../../domain/repositories/streak.repository.interface';

@Injectable()
export class StreakRepository implements IStreakRepository {
  constructor(
    @InjectModel(Streak.name)
    private readonly model: Model<StreakDocument>,
  ) {}

  findByStudent(tenantId: string, studentId: string): Promise<StreakDocument | null> {
    return this.model.findOne({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      isDeleted: false,
    }).exec();
  }

  async upsert(tenantId: string, studentId: string): Promise<StreakDocument> {
    return this.model.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId) },
      { $setOnInsert: { tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec() as Promise<StreakDocument>;
  }

  /** Returns the hydrated document so StreakService can mutate + save it. */
  async recordActivity(tenantId: string, studentId: string, activityDate: string): Promise<StreakDocument> {
    return this.upsert(tenantId, studentId);
  }

  findTopByDailyStreak(tenantId: string, limit: number): Promise<StreakDocument[]> {
    return this.model
      .find({ tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .sort({ currentDailyStreak: -1 })
      .limit(limit)
      .exec();
  }
}
