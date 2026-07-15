import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupportTicket, SupportTicketDocument } from '@database/mongoose/schemas';
import { ISupportTicketRepository } from '../../domain/repositories/support-ticket.repository.interface';
import { TicketStatus, TicketPriority } from '@shared/enums/support.enum';

@Injectable()
export class SupportTicketRepository implements ISupportTicketRepository {
  constructor(@InjectModel(SupportTicket.name) private readonly model: Model<SupportTicketDocument>) {}

  findAll(filter?: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string; tenantId?: string }) {
    const q: Record<string, unknown> = {};
    if (filter?.status) q.status = filter.status;
    if (filter?.priority) q.priority = filter.priority;
    if (filter?.assignedTo) q.assignedTo = new Types.ObjectId(filter.assignedTo);
    if (filter?.tenantId) q.tenantId = filter.tenantId;
    return this.model.find(q).sort({ priority: -1, createdAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  findBySubmitter(userId: string) {
    return this.model.find({ submittedBy: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).exec();
  }

  create(data: Partial<SupportTicket>) {
    return this.model.create(data);
  }

  update(id: string, data: Partial<SupportTicket>) {
    return this.model.findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true }).exec();
  }

  async countByStatus(): Promise<Array<{ status: string; count: number }>> {
    return this.model.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
  }
}
