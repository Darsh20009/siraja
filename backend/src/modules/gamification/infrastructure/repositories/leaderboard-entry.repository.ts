import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaderboardEntry, LeaderboardEntryDocument } from '@database/mongoose/schemas';
import {
  ILeaderboardEntryRepository,
  UpsertLeaderboardEntryData,
} from '../../domain/repositories/leaderboard-entry.repository.interface';
import { LeaderboardEntityType, LeaderboardPeriod } from '@shared/enums/gamification.enum';

@Injectable()
export class LeaderboardEntryRepository implements ILeaderboardEntryRepository {
  constructor(
    @InjectModel(LeaderboardEntry.name)
    private readonly model: Model<LeaderboardEntryDocument>,
  ) {}

  findLeaderboard(
    tenantId: string,
    entityType: LeaderboardEntityType,
    period: LeaderboardPeriod,
    periodKey: string,
    limit = 50,
  ): Promise<LeaderboardEntryDocument[]> {
    return this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        entityType,
        period,
        periodKey,
        isDeleted: false,
      })
      .sort({ rank: 1 })
      .limit(limit)
      .exec();
  }

  findEntityRanking(
    tenantId: string,
    entityId: string,
    entityType: LeaderboardEntityType,
  ): Promise<LeaderboardEntryDocument[]> {
    return this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        entityId,
        entityType,
        isDeleted: false,
      })
      .sort({ period: 1, periodKey: -1 })
      .exec();
  }

  async upsert(data: UpsertLeaderboardEntryData): Promise<LeaderboardEntryDocument> {
    return this.model.findOneAndUpdate(
      {
        tenantId: new Types.ObjectId(data.tenantId),
        entityId: data.entityId,
        entityType: data.entityType,
        period: data.period,
        periodKey: data.periodKey,
      },
      {
        $set: {
          entityName: data.entityName,
          points: data.points,
          rank: data.rank,
          achievementCount: data.achievementCount,
          badgeCount: data.badgeCount,
          computedAt: data.computedAt,
        },
        $setOnInsert: { tenantId: new Types.ObjectId(data.tenantId) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec() as Promise<LeaderboardEntryDocument>;
  }

  async bulkUpsert(entries: UpsertLeaderboardEntryData[]): Promise<void> {
    if (!entries.length) return;
    const ops = entries.map(data => ({
      updateOne: {
        filter: {
          tenantId: new Types.ObjectId(data.tenantId),
          entityId: data.entityId,
          entityType: data.entityType,
          period: data.period,
          periodKey: data.periodKey,
        },
        update: {
          $set: {
            entityName: data.entityName,
            points: data.points,
            rank: data.rank,
            achievementCount: data.achievementCount,
            badgeCount: data.badgeCount,
            computedAt: data.computedAt,
            tenantId: new Types.ObjectId(data.tenantId),
          },
        },
        upsert: true,
      },
    }));
    await this.model.bulkWrite(ops as never[]);
  }

  async deleteByPeriod(tenantId: string, period: LeaderboardPeriod, periodKey: string): Promise<void> {
    await this.model.deleteMany({
      tenantId: new Types.ObjectId(tenantId),
      period,
      periodKey,
    });
  }
}
