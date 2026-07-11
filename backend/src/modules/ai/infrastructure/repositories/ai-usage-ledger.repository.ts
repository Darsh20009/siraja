import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiUsageLedger, AiUsageLedgerDocument } from '@database/mongoose/schemas';
import {
  IAiUsageLedgerRepository,
  RecordAiUsageInput,
} from '../../domain/repositories/ai-usage-ledger.repository.interface';

@Injectable()
export class AiUsageLedgerRepository implements IAiUsageLedgerRepository {
  constructor(
    @InjectModel(AiUsageLedger.name) private readonly model: Model<AiUsageLedgerDocument>,
  ) {}

  async record(input: RecordAiUsageInput): Promise<void> {
    await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      requestedBy: new Types.ObjectId(input.requestedBy),
      student: input.studentId && Types.ObjectId.isValid(input.studentId) ? new Types.ObjectId(input.studentId) : null,
      featureTag: input.featureTag,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      modelVersion: input.modelVersion,
    });
  }

  async getSpendSince(tenantId: string, since: Date): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { tenantId: new Types.ObjectId(tenantId), isDeleted: false, createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$estimatedCostUsd' } } },
    ]);
    return result[0]?.total ?? 0;
  }
}
