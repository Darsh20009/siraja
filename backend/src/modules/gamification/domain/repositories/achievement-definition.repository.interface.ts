import { AchievementDefinitionDocument } from '@database/mongoose/schemas';
import { AchievementType } from '@shared/enums/gamification.enum';

export const ACHIEVEMENT_DEFINITION_REPOSITORY = Symbol('ACHIEVEMENT_DEFINITION_REPOSITORY');

export interface CreateAchievementDefinitionData {
  tenantId: string;
  type: AchievementType | string;
  name: string;
  description?: string;
  iconUrl?: string;
  isAutomatic?: boolean;
  criteriaDescription?: string;
  bonusPoints?: number;
  sortOrder?: number;
  isRepeatable?: boolean;
  createdBy?: string;
}

export interface IAchievementDefinitionRepository {
  findAll(tenantId: string, onlyActive?: boolean): Promise<AchievementDefinitionDocument[]>;
  findById(tenantId: string, id: string): Promise<AchievementDefinitionDocument | null>;
  findByType(tenantId: string, type: string): Promise<AchievementDefinitionDocument | null>;
  create(data: CreateAchievementDefinitionData): Promise<AchievementDefinitionDocument>;
  update(tenantId: string, id: string, data: Partial<AchievementDefinitionDocument>): Promise<AchievementDefinitionDocument | null>;
  seedDefaults(tenantId: string): Promise<void>;
}
