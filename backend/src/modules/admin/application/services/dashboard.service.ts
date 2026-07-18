import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User, UserDocument,
  Student, StudentDocument,
  Sheikh, SheikhDocument,
  Parent, ParentDocument,
  Supervisor, SupervisorDocument,
  Tenant, TenantDocument,
} from '@database/mongoose/schemas';
import { OPERATIONAL_SNAPSHOT_REPOSITORY, IOperationalSnapshotRepository } from '../../domain/repositories/operational-snapshot.repository.interface';
import { SYSTEM_ALERT_REPOSITORY, ISystemAlertRepository } from '../../domain/repositories/system-alert.repository.interface';
import { DONATION_REPOSITORY, IDonationRepository } from '../../domain/repositories/donation.repository.interface';
import { DonationsService, DEFAULT_STAGES } from './donations.service';
import { DonationStatus } from '@shared/enums/admin-operations.enum';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(User.name)       private readonly userModel: Model<UserDocument>,
    @InjectModel(Student.name)    private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Sheikh.name)     private readonly sheikhModel: Model<SheikhDocument>,
    @InjectModel(Parent.name)     private readonly parentModel: Model<ParentDocument>,
    @InjectModel(Supervisor.name) private readonly supervisorModel: Model<SupervisorDocument>,
    @InjectModel(Tenant.name)     private readonly tenantModel: Model<TenantDocument>,
    @Inject(OPERATIONAL_SNAPSHOT_REPOSITORY) private readonly snapshotRepo: IOperationalSnapshotRepository,
    @Inject(SYSTEM_ALERT_REPOSITORY)         private readonly alertRepo: ISystemAlertRepository,
    @Inject(DONATION_REPOSITORY)             private readonly donationRepo: IDonationRepository,
    private readonly donationsService: DonationsService,
  ) {}

  async getPlatformOverview() {
    const [
      totalUsers,
      totalStudents,
      totalSheikhs,
      totalParents,
      totalSupervisors,
      totalTenants,
      activeAlerts,
      latestSnapshot,
      confirmedDonationSum,
    ] = await Promise.all([
      this.userModel.countDocuments({ isDeleted: { $ne: true } }),
      this.studentModel.countDocuments({ isDeleted: { $ne: true } }),
      this.sheikhModel.countDocuments({ isDeleted: { $ne: true } }),
      this.parentModel.countDocuments({ isDeleted: { $ne: true } }),
      this.supervisorModel.countDocuments({ isDeleted: { $ne: true } }),
      this.tenantModel.countDocuments({ isDeleted: { $ne: true } }),
      this.alertRepo.countActive(),
      this.snapshotRepo.findLatest(),
      this.donationRepo.sumConfirmedGlobal?.() ?? Promise.resolve(0),
    ]);

    const fundraisingProgress = this.donationsService.getFundraisingProgress(
      latestSnapshot?.cumulativeDonationAmount ?? confirmedDonationSum,
    );

    return {
      users: { total: totalUsers, students: totalStudents, sheikhs: totalSheikhs, parents: totalParents, supervisors: totalSupervisors },
      tenants: { total: totalTenants },
      infrastructure: {
        activeAlerts,
        storageUsedMb: latestSnapshot?.storageUsedMb ?? 0,
        queueJobsFailed: latestSnapshot?.queueJobsFailed ?? 0,
        queueJobsProcessed: latestSnapshot?.queueJobsProcessed ?? 0,
        emailsSentToday: latestSnapshot?.emailsSentToday ?? 0,
        dailyAiRequests: latestSnapshot?.dailyAiRequests ?? 0,
        openTickets: latestSnapshot?.openTickets ?? 0,
      },
      activity: {
        dailyActiveUsers: latestSnapshot?.dailyActiveUsers ?? 0,
        dailyMemorizationRecords: latestSnapshot?.dailyMemorizationRecords ?? 0,
        dailyReviewRecords: latestSnapshot?.dailyReviewRecords ?? 0,
        activeStreaks: latestSnapshot?.activeStreaks ?? 0,
      },
      fundraising: {
        cumulativeDonationAmount: latestSnapshot?.cumulativeDonationAmount ?? confirmedDonationSum,
        totalDonationsToday: latestSnapshot?.totalDonationsToday ?? 0,
        currentStage: fundraisingProgress.currentStage,
        nextMilestone: fundraisingProgress.stages.find(s => !s.completed)?.targetAmount ?? null,
      },
      snapshotDate: latestSnapshot?.date ?? null,
    };
  }

  async getOperationalSummary() {
    const latest = await this.snapshotRepo.findLatest();
    return {
      date: latest?.date ?? null,
      queues: {
        jobsProcessed: latest?.queueJobsProcessed ?? 0,
        jobsFailed: latest?.queueJobsFailed ?? 0,
        failureRate: latest && latest.queueJobsProcessed > 0
          ? Math.round((latest.queueJobsFailed / (latest.queueJobsProcessed + latest.queueJobsFailed)) * 100 * 10) / 10
          : 0,
        healthy: (latest?.queueJobsFailed ?? 0) === 0,
      },
      ai: {
        dailyRequests: latest?.dailyAiRequests ?? 0,
        healthy: true,
      },
      email: {
        sentToday: latest?.emailsSentToday ?? 0,
        healthy: true,
      },
      storage: {
        usedMb: latest?.storageUsedMb ?? 0,
        usedGb: latest ? Math.round((latest.storageUsedMb / 1024) * 100) / 100 : 0,
        healthy: true,
      },
      tickets: {
        open: latest?.openTickets ?? 0,
        healthy: (latest?.openTickets ?? 0) < 50,
      },
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
        newTenants: s.newTenantsToday,
        dailyActive: s.dailyActiveUsers,
        memorizations: s.dailyMemorizationRecords,
        reviews: s.dailyReviewRecords,
      })),
    };
  }

  async captureSnapshot(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const [totalUsers, totalStudents, totalSheikhs, totalParents, totalSupervisors, totalTenants, activeAlerts] =
      await Promise.all([
        this.userModel.countDocuments({ isDeleted: { $ne: true } }),
        this.studentModel.countDocuments({ isDeleted: { $ne: true } }),
        this.sheikhModel.countDocuments({ isDeleted: { $ne: true } }),
        this.parentModel.countDocuments({ isDeleted: { $ne: true } }),
        this.supervisorModel.countDocuments({ isDeleted: { $ne: true } }),
        this.tenantModel.countDocuments({ isDeleted: { $ne: true } }),
        this.alertRepo.countActive(),
      ]);

    await this.snapshotRepo.upsert(today, {
      totalUsers,
      totalStudents,
      totalSheikhs,
      totalParents,
      totalSupervisors,
      totalTenants,
      openAlerts: activeAlerts,
    });

    this.logger.log(`Snapshot captured for ${today}`);
  }
}
