import { BadgeDefinitionDocument } from '@database/mongoose/schemas';
import { BadgeTier, BadgeType } from '@shared/enums/gamification.enum';

export const BADGE_DEFINITION_REPOSITORY = Symbol('BADGE_DEFINITION_REPOSITORY');

export interface CreateBadgeDefinitionData {
  tenantId: string;
  name: string;
  description?: string;
  tier: BadgeTier;
  type: BadgeType;
  iconUrl?: string;
  bonusPoints?: number;
  sortOrder?: number;
  seasonKey?: string;
  eventKey?: string;
  createdBy?: string;
}

export interface IBadgeDefinitionRepository {
  findAll(tenantId: string, onlyActive?: boolean): Promise<BadgeDefinitionDocument[]>;
  findById(tenantId: string, id: string): Promise<BadgeDefinitionDocument | null>;
  findByTierAndType(tenantId: string, tier?: BadgeTier, type?: BadgeType): Promise<BadgeDefinitionDocument[]>;
  create(data: CreateBadgeDefinitionData): Promise<BadgeDefinitionDocument>;
  update(tenantId: string, id: string, data: Partial<BadgeDefinitionDocument>): Promise<BadgeDefinitionDocument | null>;
  delete(tenantId: string, id: string): Promise<void>;
}
