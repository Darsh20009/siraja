import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessageThread, MessageThreadDocument } from '@database/mongoose/schemas';
import {
  CreateMessageThreadInput,
  IMessageThreadRepository,
  MessageThreadItem,
  MessageThreadListFilter,
} from '../../domain/repositories/message-thread.repository.interface';

@Injectable()
export class MessageThreadRepository implements IMessageThreadRepository {
  constructor(
    @InjectModel(MessageThread.name)
    private readonly model: Model<MessageThreadDocument>,
  ) {}

  async create(input: CreateMessageThreadInput): Promise<MessageThreadItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      type: input.type,
      createdBy: new Types.ObjectId(input.createdById),
      participants: input.participants.map((id) => new Types.ObjectId(id)),
      circleId: input.circleId ? new Types.ObjectId(input.circleId) : undefined,
      subject: input.subject,
      unreadCounts: new Map(),
      isArchived: false,
    });
    return toItem(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<MessageThreadItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: MessageThreadListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: MessageThreadItem[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.participantId && Types.ObjectId.isValid(filter.participantId))
      query.participants = new Types.ObjectId(filter.participantId);
    if (filter.type) query.type = filter.type;
    if (filter.circleId && Types.ObjectId.isValid(filter.circleId))
      query.circleId = new Types.ObjectId(filter.circleId);
    if (filter.isArchived !== undefined) query.isArchived = filter.isArchived;

    const [total, docs] = await Promise.all([
      this.model.countDocuments(query),
      this.model.find(query).sort({ lastMessageAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    return { items: docs.map(toItem), total };
  }

  async updateLastMessage(tenantId: string, id: string, preview: string): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: { lastMessagePreview: preview, lastMessageAt: new Date() } },
    );
  }

  async incrementUnread(tenantId: string, threadId: string, userIds: string[]): Promise<void> {
    if (!userIds.length) return;
    const update: Record<string, number> = {};
    for (const uid of userIds) update[`unreadCounts.${uid}`] = 1;
    await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(threadId), tenantId: new Types.ObjectId(tenantId) },
      { $inc: update },
    );
  }

  async clearUnread(tenantId: string, threadId: string, userId: string): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(threadId), tenantId: new Types.ObjectId(tenantId) },
      { $unset: { [`unreadCounts.${userId}`]: '' } },
    );
  }

  async archive(tenantId: string, id: string): Promise<MessageThreadItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: { isArchived: true } },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Thread not found.');
    return toItem(doc);
  }
}

function toItem(doc: any): MessageThreadItem {
  const unreadCounts: Record<string, number> = {};
  if (doc.unreadCounts) {
    const map: Map<string, number> | Record<string, number> = doc.unreadCounts;
    if (map instanceof Map) {
      map.forEach((v, k) => { unreadCounts[k] = v; });
    } else {
      Object.assign(unreadCounts, map);
    }
  }
  return {
    id: String(doc._id),
    tenantId: String(doc.tenantId),
    type: doc.type,
    createdById: String(doc.createdBy),
    participants: (doc.participants ?? []).map(String),
    circleId: doc.circleId ? String(doc.circleId) : undefined,
    subject: doc.subject,
    lastMessagePreview: doc.lastMessagePreview,
    lastMessageAt: doc.lastMessageAt,
    unreadCounts,
    isArchived: doc.isArchived,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
