import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '@database/mongoose/schemas';
import { IAuditLogAdminRepository } from '../../domain/repositories/audit-log-admin.repository.interface';
import { AuditAction, AuditEntityType } from '@shared/enums/audit.enum';

@Injectable()
export class AuditLogAdminRepository implements IAuditLogAdminRepository {
  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  findAll(
    filter?: {
      actorId?: string;
      tenantId?: string;
      action?: AuditAction;
      entityType?: AuditEntityType | string;
      fromDate?: Date;
      toDate?: Date;
    },
    limit = 50,
    skip = 0,
  ) {
    const q: FilterQuery<AuditLogDocument> = {};
    if (filter?.actorId) q.actor = new Types.ObjectId(filter.actorId);
    if (filter?.tenantId) q.tenantId = filter.tenantId;
    if (filter?.action) q.action = filter.action;
    if (filter?.entityType) q.entityType = filter.entityType;
    if (filter?.fromDate || filter?.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filter.fromDate) dateFilter.$gte = filter.fromDate;
      if (filter.toDate) dateFilter.$lte = filter.toDate;
      (q as Record<string, unknown>).createdAt = dateFilter;
    }
    return this.model.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
  }

  findById(id: string) {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  create(data: Partial<AuditLog>) {
    return this.model.create(data);
  }

  count(filter?: { tenantId?: string; action?: AuditAction }): Promise<number> {
    const q: FilterQuery<AuditLogDocument> = {};
    if (filter?.tenantId) q.tenantId = filter.tenantId;
    if (filter?.action) q.action = filter.action;
    return this.model.countDocuments(q).exec();
  }
}
