import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Announcement, AnnouncementDocument } from '@database/mongoose/schemas';
import {
  AnnouncementItem,
  AnnouncementListFilter,
  CreateAnnouncementInput,
  IAnnouncementRepository,
  UpdateAnnouncementInput,
} from '../../domain/repositories/announcement.repository.interface';
import { AnnouncementScope, AnnouncementStatus } from '@shared/enums/announcement.enum';

@Injectable()
export class AnnouncementRepository implements IAnnouncementRepository {
  constructor(
    @InjectModel(Announcement.name)
    private readonly model: Model<AnnouncementDocument>,
  ) {}

  async create(input: CreateAnnouncementInput): Promise<AnnouncementItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      scope: input.scope,
      scopedTenantId: input.scopedTenantId ? new Types.ObjectId(input.scopedTenantId) : null,
      circleId: input.circleId ? new Types.ObjectId(input.circleId) : undefined,
      title: input.title,
      body: input.body,
      htmlBody: input.htmlBody,
      priority: input.priority,
      status: AnnouncementStatus.DRAFT,
      createdBy: new Types.ObjectId(input.createdById),
      expiresAt: input.expiresAt,
      deepLink: input.deepLink,
    });
    return toItem(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<AnnouncementItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({
        _id: new Types.ObjectId(id),
        $or: [
          { tenantId: new Types.ObjectId(tenantId) },
          { scope: AnnouncementScope.GLOBAL },
        ],
        isDeleted: false,
      })
      .lean();
    return doc ? toItem(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: AnnouncementListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: AnnouncementItem[]; total: number }> {
    const query: Record<string, unknown> = {
      $or: [
        { tenantId: new Types.ObjectId(tenantId) },
        { scope: AnnouncementScope.GLOBAL },
      ],
      isDeleted: false,
    };

    if (filter.scope) query.scope = filter.scope;
    if (filter.status) query.status = filter.status;
    if (filter.circleId && Types.ObjectId.isValid(filter.circleId))
      query.circleId = new Types.ObjectId(filter.circleId);
    if (filter.createdById && Types.ObjectId.isValid(filter.createdById))
      query.createdBy = new Types.ObjectId(filter.createdById);

    const [total, docs] = await Promise.all([
      this.model.countDocuments(query),
      this.model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return { items: docs.map(toItem), total };
  }

  async findVisible(
    tenantId: string,
    circleId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: AnnouncementItem[]; total: number }> {
    const now = new Date();

    // Always include GLOBAL and TENANT scopes.
    const scopeConditions: Record<string, unknown>[] = [
      { scope: AnnouncementScope.GLOBAL },
      { scope: AnnouncementScope.TENANT, tenantId: new Types.ObjectId(tenantId) },
    ];

    // CIRCLE scope is ONLY included when the caller explicitly identifies
    // their circle. Without a circleId, circle announcements are not returned
    // — preventing cross-circle disclosure.
    if (circleId && Types.ObjectId.isValid(circleId)) {
      scopeConditions.push({
        scope: AnnouncementScope.CIRCLE,
        tenantId: new Types.ObjectId(tenantId),
        circleId: new Types.ObjectId(circleId),
      });
    }

    const query: Record<string, unknown> = {
      status: AnnouncementStatus.PUBLISHED,
      isDeleted: false,
      $or: scopeConditions,
      $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }],
    };

    const [total, docs] = await Promise.all([
      this.model.countDocuments(query),
      this.model
        .find(query)
        .sort({ priority: -1, publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    return { items: docs.map(toItem), total };
  }

  async update(tenantId: string, id: string, input: UpdateAnnouncementInput): Promise<AnnouncementItem> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          $or: [{ tenantId: new Types.ObjectId(tenantId) }, { scope: AnnouncementScope.GLOBAL }],
          isDeleted: false,
        },
        { $set: input },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Announcement not found.');
    return toItem(doc);
  }

  async publish(tenantId: string, id: string): Promise<AnnouncementItem> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          $or: [{ tenantId: new Types.ObjectId(tenantId) }, { scope: AnnouncementScope.GLOBAL }],
          isDeleted: false,
        },
        { $set: { status: AnnouncementStatus.PUBLISHED, publishedAt: new Date() } },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Announcement not found.');
    return toItem(doc);
  }

  async archive(tenantId: string, id: string): Promise<AnnouncementItem> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          $or: [{ tenantId: new Types.ObjectId(tenantId) }, { scope: AnnouncementScope.GLOBAL }],
          isDeleted: false,
        },
        { $set: { status: AnnouncementStatus.ARCHIVED } },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Announcement not found.');
    return toItem(doc);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.model.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        $or: [{ tenantId: new Types.ObjectId(tenantId) }, { scope: AnnouncementScope.GLOBAL }],
      },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }
}

function toItem(doc: any): AnnouncementItem {
  return {
    id: String(doc._id),
    tenantId: String(doc.tenantId),
    scope: doc.scope,
    scopedTenantId: doc.scopedTenantId ? String(doc.scopedTenantId) : null,
    circleId: doc.circleId ? String(doc.circleId) : undefined,
    title: doc.title,
    body: doc.body,
    htmlBody: doc.htmlBody,
    priority: doc.priority,
    status: doc.status,
    createdById: String(doc.createdBy),
    publishedAt: doc.publishedAt,
    expiresAt: doc.expiresAt,
    deepLink: doc.deepLink,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
