import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '@database/mongoose/schemas';
import {
  CreateNotificationInput,
  INotificationRepository,
  NotificationItem,
  NotificationListFilter,
} from '../../domain/repositories/notification.repository.interface';
import { NotificationStatus } from '@shared/enums/notification.enum';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      recipient: new Types.ObjectId(input.recipientId),
      type: input.type,
      channel: input.channel,
      priority: input.priority,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      deepLink: input.deepLink,
      templateId: input.templateId ? new Types.ObjectId(input.templateId) : undefined,
      actorId: input.actorId ? new Types.ObjectId(input.actorId) : undefined,
      status: NotificationStatus.PENDING,
      isRead: false,
      isArchived: false,
    });
    return toItem(doc.toObject());
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<NotificationItem[]> {
    const docs = await this.model.insertMany(
      inputs.map((i) => ({
        tenantId: new Types.ObjectId(i.tenantId),
        recipient: new Types.ObjectId(i.recipientId),
        type: i.type,
        channel: i.channel,
        priority: i.priority,
        title: i.title,
        body: i.body,
        data: i.data ?? {},
        deepLink: i.deepLink,
        templateId: i.templateId ? new Types.ObjectId(i.templateId) : undefined,
        actorId: i.actorId ? new Types.ObjectId(i.actorId) : undefined,
        status: NotificationStatus.PENDING,
        isRead: false,
        isArchived: false,
      })),
      { ordered: false },
    );
    return docs.map((d) => toItem((d as any).toObject()));
  }

  async findById(tenantId: string, id: string): Promise<NotificationItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: NotificationListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: NotificationItem[]; total: number; unreadCount: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.recipientId && Types.ObjectId.isValid(filter.recipientId))
      query.recipient = new Types.ObjectId(filter.recipientId);
    if (filter.type) query.type = filter.type;
    if (filter.channel) query.channel = filter.channel;
    if (filter.isRead !== undefined) query.isRead = filter.isRead;
    if (filter.isArchived !== undefined) query.isArchived = filter.isArchived;
    if (filter.priority) query.priority = filter.priority;

    const [total, docs, unreadCount] = await Promise.all([
      this.model.countDocuments(query),
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      filter.recipientId && Types.ObjectId.isValid(filter.recipientId)
        ? this.model.countDocuments({
            tenantId: new Types.ObjectId(tenantId),
            recipient: new Types.ObjectId(filter.recipientId),
            isRead: false,
            isArchived: false,
            isDeleted: false,
          })
        : Promise.resolve(0),
    ]);

    return { items: docs.map(toItem), total, unreadCount };
  }

  async markRead(tenantId: string, id: string): Promise<NotificationItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: { isRead: true, readAt: new Date(), status: NotificationStatus.READ } },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Notification not found.');
    return toItem(doc);
  }

  async markAllRead(tenantId: string, recipientId: string): Promise<number> {
    const result = await this.model.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        recipient: new Types.ObjectId(recipientId),
        isRead: false,
        isDeleted: false,
      },
      { $set: { isRead: true, readAt: new Date(), status: NotificationStatus.READ } },
    );
    return result.modifiedCount;
  }

  async archive(tenantId: string, id: string): Promise<NotificationItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: { isArchived: true, archivedAt: new Date() } },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Notification not found.');
    return toItem(doc);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }

  async countUnread(tenantId: string, recipientId: string): Promise<number> {
    return this.model.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      recipient: new Types.ObjectId(recipientId),
      isRead: false,
      isArchived: false,
      isDeleted: false,
    });
  }

  async updateStatus(tenantId: string, id: string, status: NotificationStatus): Promise<NotificationItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: { status } },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Notification not found.');
    return toItem(doc);
  }
}

function toItem(doc: any): NotificationItem {
  return {
    id: String(doc._id),
    tenantId: String(doc.tenantId),
    recipientId: String(doc.recipient),
    type: doc.type,
    channel: doc.channel,
    status: doc.status,
    priority: doc.priority,
    title: doc.title,
    body: doc.body,
    data: doc.data,
    deepLink: doc.deepLink,
    isRead: doc.isRead,
    readAt: doc.readAt,
    isArchived: doc.isArchived,
    archivedAt: doc.archivedAt,
    templateId: doc.templateId ? String(doc.templateId) : undefined,
    actorId: doc.actorId ? String(doc.actorId) : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
