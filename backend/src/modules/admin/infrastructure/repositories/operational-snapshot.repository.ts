import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OperationalSnapshot, OperationalSnapshotDocument } from '@database/mongoose/schemas';
import { IOperationalSnapshotRepository } from '../../domain/repositories/operational-snapshot.repository.interface';

@Injectable()
export class OperationalSnapshotRepository implements IOperationalSnapshotRepository {
  constructor(@InjectModel(OperationalSnapshot.name) private readonly model: Model<OperationalSnapshotDocument>) {}

  findByDate(date: string) {
    return this.model.findOne({ date }).exec();
  }

  findRange(fromDate: string, toDate: string) {
    return this.model.find({ date: { $gte: fromDate, $lte: toDate } }).sort({ date: 1 }).exec();
  }

  findLatest() {
    return this.model.findOne().sort({ date: -1 }).exec();
  }

  async upsert(date: string, data: Partial<OperationalSnapshot>) {
    const doc = await this.model.findOneAndUpdate(
      { date },
      { $set: { ...data, date } },
      { upsert: true, new: true },
    ).exec();
    return doc!;
  }
}
