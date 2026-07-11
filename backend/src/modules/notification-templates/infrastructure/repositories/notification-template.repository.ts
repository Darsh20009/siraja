import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationTemplate, NotificationTemplateDocument } from '@database/mongoose/schemas';
import {
  CreateNotificationTemplateInput,
  INotificationTemplateRepository,
  NotificationTemplateItem,
  UpdateNotificationTemplateInput,
} from '../../domain/repositories/notification-template.repository.interface';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

@Injectable()
export class NotificationTemplateRepository implements INotificationTemplateRepository {
  constructor(
    @InjectModel(NotificationTemplate.name)
    private readonly model: Model<NotificationTemplateDocument>,
  ) {}

  async create(input: CreateNotificationTemplateInput): Promise<NotificationTemplateItem> {
    const doc = await this.model.create({
      tenantId: input.tenantId ? new Types.ObjectId(input.tenantId) : null,
      name: input.name,
      description: input.description,
      type: input.type,
      channel: input.channel,
      titleTemplate: input.titleTemplate,
      bodyTemplate: input.bodyTemplate,
      htmlBodyTemplate: input.htmlBodyTemplate,
      variables: input.variables ?? [],
      isActive: true,
      createdBy: input.createdById ? new Types.ObjectId(input.createdById) : undefined,
    });
    return toItem(doc.toObject());
  }

  async findById(id: string, tenantId?: string | null): Promise<NotificationTemplateItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const query: Record<string, unknown> = { _id: new Types.ObjectId(id), isDeleted: false };

    // When tenantId is explicitly provided (not undefined), scope to that tenant
    // OR global templates (tenantId = null). This is defense-in-depth alongside
    // the controller check: non-Super Admin callers cannot fetch templates from
    // other tenants even if they know the ID.
    // When tenantId is undefined (legacy/internal use), no tenant filter is applied.
    if (tenantId !== undefined) {
      if (tenantId === null) {
        // Super Admin: unrestricted — no tenant filter.
      } else {
        // Ordinary caller: global templates + their own tenant's templates.
        query['$or'] = [{ tenantId: null }, { tenantId: new Types.ObjectId(tenantId) }];
      }
    }

    const doc = await this.model.findOne(query).lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string | null,
    type?: NotificationType,
    channel?: NotificationChannel,
    page = 1,
    limit = 20,
  ): Promise<{ items: NotificationTemplateItem[]; total: number }> {
    const query: Record<string, unknown> = { isDeleted: false };
    if (tenantId) {
      // Global + tenant-specific
      query['$or'] = [{ tenantId: null }, { tenantId: new Types.ObjectId(tenantId) }];
    } else {
      query.tenantId = null;
    }
    if (type) query.type = type;
    if (channel) query.channel = channel;

    const [total, docs] = await Promise.all([
      this.model.countDocuments(query),
      this.model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return { items: docs.map(toItem), total };
  }

  async resolve(
    tenantId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplateItem | null> {
    // Prefer tenant-specific over global; prefer active.
    const docs = await this.model
      .find({
        type,
        channel,
        isActive: true,
        isDeleted: false,
        $or: [{ tenantId: null }, { tenantId: new Types.ObjectId(tenantId) }],
      })
      .sort({ tenantId: -1 }) // tenant-specific sorts after null (non-null > null)
      .limit(2)
      .lean();

    if (!docs.length) return null;
    // Prefer tenant-specific (has a tenantId) over global.
    const tenant = docs.find((d) => d.tenantId != null);
    return toItem(tenant ?? docs[0]);
  }

  async update(id: string, input: UpdateNotificationTemplateInput): Promise<NotificationTemplateItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), isDeleted: false },
        { $set: input },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Template not found.');
    return toItem(doc);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $set: { isDeleted: true, deletedAt: new Date() } });
  }

  /** Variable substitution: replace {{key}} with values[key]. */
  render(
    template: NotificationTemplateItem,
    variables: Record<string, string>,
  ): { title: string; body: string; htmlBody?: string } {
    const replace = (str: string) =>
      str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);

    return {
      title: replace(template.titleTemplate),
      body: replace(template.bodyTemplate),
      htmlBody: template.htmlBodyTemplate ? replace(template.htmlBodyTemplate) : undefined,
    };
  }
}

function toItem(doc: any): NotificationTemplateItem {
  return {
    id: String(doc._id),
    tenantId: doc.tenantId ? String(doc.tenantId) : null,
    name: doc.name,
    description: doc.description,
    type: doc.type,
    channel: doc.channel,
    titleTemplate: doc.titleTemplate,
    bodyTemplate: doc.bodyTemplate,
    htmlBodyTemplate: doc.htmlBodyTemplate,
    variables: doc.variables ?? [],
    isActive: doc.isActive,
    createdById: doc.createdBy ? String(doc.createdBy) : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
