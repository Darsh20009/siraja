import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '@database/mongoose/schemas';
import { ActorType, AuditAction } from '@shared/enums/audit.enum';

export interface RecordAuthEventInput {
  tenantId?: Types.ObjectId | string;
  actor?: Types.ObjectId | string;
  action: AuditAction;
  entityId?: Types.ObjectId | string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Thin wrapper writing auth-related events into the shared, append-only
 * `audit_logs` collection (Phase 2 schema) rather than inventing a
 * parallel auth-only log — logins, password changes, device revocations,
 * and token-reuse detections all belong in the same compliance trail as
 * every other sensitive action in the system.
 */
@Injectable()
export class AuthAuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>) {}

  async record(input: RecordAuthEventInput): Promise<void> {
    await this.auditLogModel.create({
      tenantId: input.tenantId,
      actor: input.actor,
      actorType: ActorType.USER,
      action: input.action,
      entityType: 'User',
      entityId: input.entityId,
      changes: input.changes ?? {},
      ipAddress: input.ipAddress,
    });
  }
}
