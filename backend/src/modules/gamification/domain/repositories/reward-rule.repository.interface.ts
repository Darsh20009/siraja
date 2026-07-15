import { RewardRuleDocument } from '@database/mongoose/schemas';
import { RewardRuleConditionType } from '@shared/enums/gamification.enum';

export const REWARD_RULE_REPOSITORY = Symbol('REWARD_RULE_REPOSITORY');

export interface CreateRewardRuleData {
  tenantId: string;
  name: string;
  description?: string;
  conditionType: RewardRuleConditionType;
  conditionValue: number;
  actionType: string;
  actionValue: string;
  oncePerStudent?: boolean;
  createdBy?: string;
}

export interface IRewardRuleRepository {
  findAll(tenantId: string, onlyActive?: boolean): Promise<RewardRuleDocument[]>;
  findById(tenantId: string, id: string): Promise<RewardRuleDocument | null>;
  create(data: CreateRewardRuleData): Promise<RewardRuleDocument>;
  update(tenantId: string, id: string, data: Partial<RewardRuleDocument>): Promise<RewardRuleDocument | null>;
  delete(tenantId: string, id: string): Promise<void>;
}
