import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GamificationConfig, GamificationConfigDocument } from '@database/mongoose/schemas';
import { IGamificationConfigRepository } from '../../domain/repositories/gamification-config.repository.interface';
import { PointActivityType } from '@shared/enums/gamification.enum';

const DEFAULT_POINT_VALUES: Record<PointActivityType, number> = {
  [PointActivityType.MEMORIZATION_COMPLETION]: 100,
  [PointActivityType.REVISION_COMPLETION]: 50,
  [PointActivityType.ATTENDANCE]: 20,
  [PointActivityType.EXAM_SUCCESS]: 150,
  [PointActivityType.DAILY_STREAK]: 10,
  [PointActivityType.WEEKLY_STREAK]: 50,
  [PointActivityType.MONTHLY_STREAK]: 200,
  [PointActivityType.AI_SESSION]: 30,
  [PointActivityType.COMMUNITY_PARTICIPATION]: 15,
};

@Injectable()
export class GamificationConfigRepository implements IGamificationConfigRepository {
  constructor(
    @InjectModel(GamificationConfig.name)
    private readonly model: Model<GamificationConfigDocument>,
  ) {}

  findByTenantId(tenantId: string): Promise<GamificationConfigDocument | null> {
    return this.model.findOne({ tenantId, isDeleted: false }).exec();
  }

  async upsert(tenantId: string, data: Partial<GamificationConfigDocument>): Promise<GamificationConfigDocument> {
    return this.model.findOneAndUpdate(
      { tenantId },
      { $set: { ...data, tenantId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec() as Promise<GamificationConfigDocument>;
  }

  async getPointValue(tenantId: string, activityType: PointActivityType): Promise<number> {
    const config = await this.findByTenantId(tenantId);
    if (config?.pointValues?.[activityType] !== undefined) {
      return config.pointValues[activityType];
    }
    return DEFAULT_POINT_VALUES[activityType] ?? 0;
  }
}
