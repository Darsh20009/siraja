import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TicketMessage, TicketMessageDocument } from '@database/mongoose/schemas';
import { ITicketMessageRepository } from '../../domain/repositories/ticket-message.repository.interface';

@Injectable()
export class TicketMessageRepository implements ITicketMessageRepository {
  constructor(@InjectModel(TicketMessage.name) private readonly model: Model<TicketMessageDocument>) {}

  findByTicket(ticketId: string) {
    return this.model.find({ ticketId: new Types.ObjectId(ticketId) }).sort({ createdAt: 1 }).exec();
  }

  create(data: Partial<TicketMessage>) {
    return this.model.create(data);
  }
}
