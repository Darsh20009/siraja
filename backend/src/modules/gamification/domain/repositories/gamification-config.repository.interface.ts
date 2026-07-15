import { GamificationConfigDocument } from '@database/mongoose/schemas';
import { PointActivityType } from '@shared/enums/gamification.enum';

export const GAMIFICATION_CONFIG_REPOSITORY = Symbol('GAMIFICATION_CONFIG_REPOSITORY');

export interface IGamificationConfigRepository {
  findByTenantId(tenantId: string): Promise<GamificationConfigDocument | null>;
  upsert(tenantId: string, data: Partial<GamificationConfigDocument>): Promise<GamificationConfigDocument>;
  getPointValue(tenantId: string, activityType: PointActivityType): Promise<number>;
}
