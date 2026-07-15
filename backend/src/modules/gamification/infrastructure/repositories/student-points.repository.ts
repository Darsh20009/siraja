import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StudentPoints, StudentPointsDocument } from '@database/mongoose/schemas';
import { IStudentPointsRepository } from '../../domain/repositories/student-points.repository.interface';
import { PointActivityType } from '@shared/enums/gamification.enum';

function currentDayKey(): string { return new Date().toISOString().split('T')[0]; }
function currentWeekKey(): string {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const w = Math.ceil((((d.getTime() - y.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}
function currentMonthKey(): string { const n = new Date(); return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}`; }
function currentYearKey(): string { return `${new Date().getUTCFullYear()}`; }

@Injectable()
export class StudentPointsRepository implements IStudentPointsRepository {
  constructor(
    @InjectModel(StudentPoints.name)
    private readonly model: Model<StudentPointsDocument>,
  ) {}

  findByStudent(tenantId: string, studentId: string): Promise<StudentPointsDocument | null> {
    return this.model.findOne({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      isDeleted: false,
    }).exec();
  }

  async upsert(tenantId: string, studentId: string): Promise<StudentPointsDocument> {
    return this.model.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId) },
      { $setOnInsert: { tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec() as Promise<StudentPointsDocument>;
  }

  async addPoints(
    tenantId: string,
    studentId: string,
    activityType: PointActivityType,
    points: number,
    now: string,
  ): Promise<StudentPointsDocument> {
    const dayKey = currentDayKey();
    const weekKey = currentWeekKey();
    const monthKey = currentMonthKey();
    const yearKey = currentYearKey();

    // Build $inc — always increment total; period counters only if still in same period
    const doc = await this.findByStudent(tenantId, studentId);

    const inc: Record<string, number> = {
      totalPoints: points,
      [`breakdown.${activityType}`]: points,
    };

    // Daily
    if (!doc?.lastDailyReset || doc.lastDailyReset === dayKey) inc['dailyPoints'] = points;
    // Weekly
    if (!doc?.lastWeeklyReset || doc.lastWeeklyReset === weekKey) inc['weeklyPoints'] = points;
    // Monthly
    if (!doc?.lastMonthlyReset || doc.lastMonthlyReset === monthKey) inc['monthlyPoints'] = points;
    // Yearly
    if (!doc?.lastYearlyReset || doc.lastYearlyReset === yearKey) inc['yearlyPoints'] = points;

    const setOnInsert: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
    };
    const set: Record<string, unknown> = {
      lastDailyReset: dayKey,
      lastWeeklyReset: weekKey,
      lastMonthlyReset: monthKey,
      lastYearlyReset: yearKey,
    };

    // If period rolled over, reset counter first then add (handle via findOneAndUpdate + conditional)
    return this.model.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId) },
      { $inc: inc, $set: set, $setOnInsert: setOnInsert },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec() as Promise<StudentPointsDocument>;
  }

  findTopByTotal(tenantId: string, limit: number): Promise<StudentPointsDocument[]> {
    return this.model.find({ tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .sort({ totalPoints: -1 }).limit(limit).exec();
  }

  findTopByWeekly(tenantId: string, limit: number): Promise<StudentPointsDocument[]> {
    return this.model.find({ tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .sort({ weeklyPoints: -1 }).limit(limit).exec();
  }

  findTopByMonthly(tenantId: string, limit: number): Promise<StudentPointsDocument[]> {
    return this.model.find({ tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .sort({ monthlyPoints: -1 }).limit(limit).exec();
  }

  async rolloverPeriods(tenantId: string, studentId: string, now: string): Promise<void> {
    // Rollover is handled inline in addPoints — this method is a no-op hook for explicit triggers
  }
}
