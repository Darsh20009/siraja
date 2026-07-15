import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from '@database/mongoose/schemas';
import { IFeedbackRepository } from '../../domain/repositories/feedback.repository.interface';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';

@Injectable()
export class FeedbackRepository implements IFeedbackRepository {
  constructor(@InjectModel(Feedback.name) private readonly model: Model<FeedbackDocument>) {}

  findAll(filter?: { type?: FeedbackType; status?: FeedbackStatus; tenantId?: string }) {
    const q: Record<string, unknown> = {};
    if (filter?.type) q.type = filter.type;
    if (filter?.status) q.status = filter.status;
    if (filter?.tenantId) q.tenantId = filter.tenantId;
    return this.model.find(q).sort({ createdAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  create(data: Partial<Feedback>) {
    return this.model.create(data);
  }

  update(id: string, data: Partial<Feedback>) {
    return this.model.findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true }).exec();
  }

  async countByType(): Promise<Array<{ type: string; count: number }>> {
    return this.model.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $project: { type: '$_id', count: 1, _id: 0 } }]);
  }

  async averageRating(): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    return result[0]?.avg ?? 0;
  }
}
