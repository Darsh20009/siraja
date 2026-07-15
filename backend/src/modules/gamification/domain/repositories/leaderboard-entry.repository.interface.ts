import { LeaderboardEntryDocument } from '@database/mongoose/schemas';
import { LeaderboardEntityType, LeaderboardPeriod } from '@shared/enums/gamification.enum';

export const LEADERBOARD_ENTRY_REPOSITORY = Symbol('LEADERBOARD_ENTRY_REPOSITORY');

export interface UpsertLeaderboardEntryData {
  tenantId: string;
  entityId: string;
  entityType: LeaderboardEntityType;
  entityName: string;
  period: LeaderboardPeriod;
  periodKey: string;
  points: number;
  rank: number;
  achievementCount: number;
  badgeCount: number;
  computedAt: string;
}

export interface ILeaderboardEntryRepository {
  findLeaderboard(tenantId: string, entityType: LeaderboardEntityType, period: LeaderboardPeriod, periodKey: string, limit?: number): Promise<LeaderboardEntryDocument[]>;
  findEntityRanking(tenantId: string, entityId: string, entityType: LeaderboardEntityType): Promise<LeaderboardEntryDocument[]>;
  upsert(data: UpsertLeaderboardEntryData): Promise<LeaderboardEntryDocument>;
  bulkUpsert(entries: UpsertLeaderboardEntryData[]): Promise<void>;
  deleteByPeriod(tenantId: string, period: LeaderboardPeriod, periodKey: string): Promise<void>;
}
