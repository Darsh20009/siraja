import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PointTransaction, PointTransactionDocument } from '@database/mongoose/schemas';
import {
  IPointTransactionRepository,
  CreatePointTransactionData,
  ITotalByActivity,
} from '../../domain/repositories/point-transaction.repository.interface';
import { PointActivityType } from '@shared/enums/gamification.enum';

@Injectable()
export class PointTransactionRepository implements IPointTransactionRepository {
  constructor(
    @InjectModel(PointTransaction.name)
    private readonly model: Model<PointTransactionDocument>,
  ) {}

  create(data: CreatePointTransactionData): Promise<PointTransactionDocument> {
    return this.model.create({
      ...data,
      studentId: new Types.ObjectId(data.studentId),
      tenantId: new Types.ObjectId(data.tenantId),
    });
  }

  findByStudent(tenantId: string, studentId: string, limit = 20): Promise<PointTransactionDocument[]> {
    return this.model
      .find({ tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId), isDeleted: false })
      .sort({ activityDate: -1 })
      .limit(limit)
      .exec();
  }

  async sumByStudent(tenantId: string, studentId: string, fromDate?: string): Promise<number> {
    const match: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      isDeleted: false,
    };
    if (fromDate) match['activityDate'] = { $gte: fromDate };
    const result = await this.model.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async breakdownByActivity(tenantId: string, studentId: string): Promise<ITotalByActivity[]> {
    return this.model.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          studentId: new Types.ObjectId(studentId),
          isDeleted: false,
        },
      },
      { $group: { _id: '$activityType', total: { $sum: '$points' } } },
      { $project: { activityType: '$_id', total: 1, _id: 0 } },
    ]);
  }

  async countByStudentAndActivity(tenantId: string, studentId: string, activityType: PointActivityType): Promise<number> {
    return this.model.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      activityType,
      isDeleted: false,
    });
  }
}
