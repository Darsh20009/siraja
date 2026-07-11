import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '@database/mongoose/schemas';
import {
  CreateMessageInput,
  IMessageRepository,
  MessageItem,
} from '../../domain/repositories/message.repository.interface';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    @InjectModel(Message.name)
    private readonly model: Model<MessageDocument>,
  ) {}

  async create(input: CreateMessageInput): Promise<MessageItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      threadId: new Types.ObjectId(input.threadId),
      senderId: new Types.ObjectId(input.senderId),
      body: input.body,
      refType: input.refType,
      refId: input.refId ? new Types.ObjectId(input.refId) : undefined,
      readBy: new Map([[input.senderId, new Date()]]),
    });
    return toItem(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<MessageItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findByThread(
    tenantId: string,
    threadId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: MessageItem[]; total: number }> {
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      threadId: new Types.ObjectId(threadId),
      isDeleted: false,
    };
    const [total, docs] = await Promise.all([
      this.model.countDocuments(query),
      this.model.find(query).sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return { items: docs.map(toItem), total };
  }

  async markReadForUser(tenantId: string, threadId: string, userId: string): Promise<void> {
    await this.model.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        threadId: new Types.ObjectId(threadId),
        isDeleted: false,
        [`readBy.${userId}`]: { $exists: false },
      },
      { $set: { [`readBy.${userId}`]: new Date() } },
    );
  }
}

function toItem(doc: any): MessageItem {
  const readBy: Record<string, Date> = {};
  if (doc.readBy) {
    const map: Map<string, Date> | Record<string, Date> = doc.readBy;
    if (map instanceof Map) {
      map.forEach((v, k) => { readBy[k] = v; });
    } else {
      Object.assign(readBy, map);
    }
  }
  return {
    id: String(doc._id),
    tenantId: String(doc.tenantId),
    threadId: String(doc.threadId),
    senderId: String(doc.senderId),
    body: doc.body,
    readBy,
    refType: doc.refType,
    refId: doc.refId ? String(doc.refId) : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
