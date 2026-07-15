import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User, UserDocument,
  Student, StudentDocument,
  Sheikh, SheikhDocument,
  Parent, ParentDocument,
  Supervisor, SupervisorDocument,
} from '@database/mongoose/schemas';
import { OPERATIONAL_SNAPSHOT_REPOSITORY } from '../../domain/repositories/operational-snapshot.repository.interface';
import { IOperationalSnapshotRepository } from '../../domain/repositories/operational-snapshot.repository.interface';
import { SYSTEM_ALERT_REPOSITORY, ISystemAlertRepository } from '../../domain/repositories/system-alert.repository.interface';
import { DONATION_REPOSITORY, IDonationRepository } from '../../domain/repositories/donation.repository.interface';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Sheikh.name) private readonly sheikhModel: Model<SheikhDocument>,
    @InjectModel(Parent.name) private readonly parentModel: Model<ParentDocument>,
    @InjectModel(Supervisor.name) private readonly supervisorModel: Model<SupervisorDocument>,
    @Inject(OPERATIONAL_SNAPSHOT_REPOSITORY) private readonly snapshotRepo: IOperationalSnapshotRepository,
    @Inject(SYSTEM_ALERT_REPOSITORY) private readonly alertRepo: ISystemAlertRepository,
    @Inject(DONATION_REPOSITORY) private readonly donationRepo: IDonationRepository,
  ) {}

  async getPlatformOverview() {
    const [
      totalUsers,
      totalStudents,
      totalSheikhs,
      totalParents,
      totalSupervisors,
      activeAlerts,
      latestSnapshot,
    ] = await Promise.all([
      this.userModel.countDocuments({ isDeleted: { $ne: true } }),
      this.studentModel.countDocuments({ isDeleted: { $ne: true } }),
      this.sheikhModel.countDocuments({ isDeleted: { $ne: true } }),
      this.parentModel.countDocuments({ isDeleted: { $ne: true } }),
      this.supervisorModel.countDocuments({ isDeleted: { $ne: true } }),
      this.alertRepo.countActive(),
      this.snapshotRepo.findLatest(),
    ]);

    return {
      users: {
        total: totalUsers,
        students: totalStudents,
        sheikhs: totalSheikhs,
        parents: totalParents,
        supervisors: totalSupervisors,
      },
      infrastructure: {
        activeAlerts,
        storageUsedMb: latestSnapshot?.storageUsedMb ?? 0,
        queueJobsFailed: latestSnapshot?.queueJobsFailed ?? 0,
        emailsSentToday: latestSnapshot?.emailsSentToday ?? 0,
        dailyAiRequests: latestSnapshot?.dailyAiRequests ?? 0,
      },
      activity: {
        dailyActiveUsers: latestSnapshot?.dailyActiveUsers ?? 0,
        dailyMemorizationRecords: latestSnapshot?.dailyMemorizationRecords ?? 0,
        dailyReviewRecords: latestSnapshot?.dailyReviewRecords ?? 0,
      },
      fundraising: {
        cumulativeDonationAmount: latestSnapshot?.cumulativeDonationAmount ?? 0,
        totalDonationsToday: latestSnapshot?.totalDonationsToday ?? 0,
      },
      snapshotDate: latestSnapshot?.date ?? null,
    };
  }

  async getGrowthMetrics(days = 30) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().split('T')[0];
    const toStr = today.toISOString().split('T')[0];

    const snapshots = await this.snapshotRepo.findRange(fromStr, toStr);
    return {
      period: { from: fromStr, to: toStr, days },
      daily: snapshots.map(s => ({
        date: s.date,
        newUsers: s.newUsersToday,
        newStudents: s.newStudentsToday,
        dailyActive: s.dailyActiveUsers,
        memorizations: s.dailyMemorizationRecords,
        reviews: s.dailyReviewRecords,
      })),
    };
  }

  async captureSnapshot(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const [totalUsers, totalStudents, totalSheikhs, totalParents, totalSupervisors, activeAlerts] = await Promise.all([
      this.userModel.countDocuments({ isDeleted: { $ne: true } }),
      this.studentModel.countDocuments({ isDeleted: { $ne: true } }),
      this.sheikhModel.countDocuments({ isDeleted: { $ne: true } }),
      this.parentModel.countDocuments({ isDeleted: { $ne: true } }),
      this.supervisorModel.countDocuments({ isDeleted: { $ne: true } }),
      this.alertRepo.countActive(),
    ]);

    await this.snapshotRepo.upsert(today, {
      totalUsers,
      totalStudents,
      totalSheikhs,
      totalParents,
      totalSupervisors,
      openAlerts: activeAlerts,
    });

    this.logger.log(`Snapshot captured for ${today}`);
  }
}
