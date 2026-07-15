import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SystemAlert, SystemAlertDocument } from '@database/mongoose/schemas';
import { ISystemAlertRepository } from '../../domain/repositories/system-alert.repository.interface';
import { AlertStatus, AlertType, AlertSeverity } from '@shared/enums/admin-operations.enum';

@Injectable()
export class SystemAlertRepository implements ISystemAlertRepository {
  constructor(@InjectModel(SystemAlert.name) private readonly model: Model<SystemAlertDocument>) {}

  findAll(filter?: { status?: AlertStatus; type?: AlertType; severity?: AlertSeverity }) {
    const q: Record<string, unknown> = {};
    if (filter?.status) q.status = filter.status;
    if (filter?.type) q.type = filter.type;
    if (filter?.severity) q.severity = filter.severity;
    return this.model.find(q).sort({ severity: -1, createdAt: -1 }).exec();
  }

  findActive() {
    return this.model.find({ status: AlertStatus.ACTIVE }).sort({ severity: -1, createdAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  create(data: Partial<SystemAlert>) {
    return this.model.create(data);
  }

  update(id: string, data: Partial<SystemAlert>) {
    return this.model.findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true }).exec();
  }

  countActive(): Promise<number> {
    return this.model.countDocuments({ status: AlertStatus.ACTIVE }).exec();
  }
}
