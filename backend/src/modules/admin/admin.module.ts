import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  // Existing schemas reused by Admin module
  User, UserSchema,
  Student, StudentSchema,
  Sheikh, SheikhSchema,
  Parent, ParentSchema,
  Supervisor, SupervisorSchema,
  Tenant, TenantSchema,
  AuditLog, AuditLogSchema,
  // Phase 12E schemas
  DonationCampaign, DonationCampaignSchema,
  Donation, DonationSchema,
  Feedback, FeedbackSchema,
  FeatureRequest, FeatureRequestSchema,
  FeatureVote, FeatureVoteSchema,
  FeatureFollow, FeatureFollowSchema,
  SupportTicket, SupportTicketSchema,
  TicketMessage, TicketMessageSchema,
  SystemAlert, SystemAlertSchema,
  TenantBranding, TenantBrandingSchema,
  OperationalSnapshot, OperationalSnapshotSchema,
} from '@database/mongoose/schemas';

// Repository tokens
import { DONATION_CAMPAIGN_REPOSITORY } from './domain/repositories/donation-campaign.repository.interface';
import { DONATION_REPOSITORY } from './domain/repositories/donation.repository.interface';
import { FEEDBACK_REPOSITORY } from './domain/repositories/feedback.repository.interface';
import { FEATURE_REQUEST_REPOSITORY } from './domain/repositories/feature-request.repository.interface';
import { FEATURE_VOTE_REPOSITORY } from './domain/repositories/feature-vote.repository.interface';
import { FEATURE_FOLLOW_REPOSITORY } from './domain/repositories/feature-follow.repository.interface';
import { SUPPORT_TICKET_REPOSITORY } from './domain/repositories/support-ticket.repository.interface';
import { TICKET_MESSAGE_REPOSITORY } from './domain/repositories/ticket-message.repository.interface';
import { SYSTEM_ALERT_REPOSITORY } from './domain/repositories/system-alert.repository.interface';
import { TENANT_BRANDING_REPOSITORY } from './domain/repositories/tenant-branding.repository.interface';
import { OPERATIONAL_SNAPSHOT_REPOSITORY } from './domain/repositories/operational-snapshot.repository.interface';
import { AUDIT_LOG_ADMIN_REPOSITORY } from './domain/repositories/audit-log-admin.repository.interface';

// Repository implementations
import { DonationCampaignRepository } from './infrastructure/repositories/donation-campaign.repository';
import { DonationRepository } from './infrastructure/repositories/donation.repository';
import { FeedbackRepository } from './infrastructure/repositories/feedback.repository';
import { FeatureRequestRepository } from './infrastructure/repositories/feature-request.repository';
import { FeatureVoteRepository } from './infrastructure/repositories/feature-vote.repository';
import { FeatureFollowRepository } from './infrastructure/repositories/feature-follow.repository';
import { SupportTicketRepository } from './infrastructure/repositories/support-ticket.repository';
import { TicketMessageRepository } from './infrastructure/repositories/ticket-message.repository';
import { SystemAlertRepository } from './infrastructure/repositories/system-alert.repository';
import { TenantBrandingRepository } from './infrastructure/repositories/tenant-branding.repository';
import { OperationalSnapshotRepository } from './infrastructure/repositories/operational-snapshot.repository';
import { AuditLogAdminRepository } from './infrastructure/repositories/audit-log-admin.repository';

// Application services
import { DashboardService } from './application/services/dashboard.service';
import { DonationsService } from './application/services/donations.service';
import { FeedbackService } from './application/services/feedback.service';
import { FeatureVotingService } from './application/services/feature-voting.service';
import { SupportService } from './application/services/support.service';
import { SystemAlertsService } from './application/services/system-alerts.service';
import { AnalyticsService } from './application/services/analytics.service';
import { PresentationService } from './application/services/presentation.service';
import { AuditAdminService } from './application/services/audit-admin.service';
import { TenantAdminService } from './application/services/tenant-admin.service';
import { SnapshotScheduler } from './application/services/snapshot.scheduler';

// Controllers
import { DashboardController } from './infrastructure/controllers/dashboard.controller';
import { DonationsController } from './infrastructure/controllers/donations.controller';
import { FeedbackController } from './infrastructure/controllers/feedback.controller';
import { FeatureVotingController } from './infrastructure/controllers/feature-voting.controller';
import { SupportController } from './infrastructure/controllers/support.controller';
import { SystemAlertsController } from './infrastructure/controllers/system-alerts.controller';
import { TenantAdminController } from './infrastructure/controllers/tenant-admin.controller';
import { PresentationController } from './infrastructure/controllers/presentation.controller';
import { AuditController } from './infrastructure/controllers/audit.controller';

/**
 * AdminModule — Phase 12E
 *
 * Administration, Operations & Growth Platform:
 *  1. Super Admin Dashboard + Operational Analytics (DAU/WAU/MAU, queue/AI/email/storage health)
 *  2. Tenant Administration (branding, features, limits)
 *  3. Donations System (campaigns, donors, fundraising milestones)
 *  4. Feedback System (PENDING→APPROVED/REJECTED/IN_PROGRESS/COMPLETED, isPublic)
 *  5. Feature Voting Platform (propose, vote, follow, merge, status workflow)
 *  6. Support Center (tickets, messages, assignment, resolution)
 *  7. System Alerts (infra health, auto-fire, acknowledge, resolve)
 *  8. Presentation Platform (/presentation public endpoint + testimonials)
 *  9. Audit System (admin action trail, tenant/permission changes)
 * 10. Daily Snapshot Scheduler (cron at 00:05 UTC)
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      // Existing schemas needed for cross-module queries
      { name: User.name,       schema: UserSchema },
      { name: Student.name,    schema: StudentSchema },
      { name: Sheikh.name,     schema: SheikhSchema },
      { name: Parent.name,     schema: ParentSchema },
      { name: Supervisor.name, schema: SupervisorSchema },
      { name: Tenant.name,     schema: TenantSchema },
      { name: AuditLog.name,   schema: AuditLogSchema },
      // Phase 12E schemas
      { name: DonationCampaign.name,    schema: DonationCampaignSchema },
      { name: Donation.name,            schema: DonationSchema },
      { name: Feedback.name,            schema: FeedbackSchema },
      { name: FeatureRequest.name,      schema: FeatureRequestSchema },
      { name: FeatureVote.name,         schema: FeatureVoteSchema },
      { name: FeatureFollow.name,       schema: FeatureFollowSchema },
      { name: SupportTicket.name,       schema: SupportTicketSchema },
      { name: TicketMessage.name,       schema: TicketMessageSchema },
      { name: SystemAlert.name,         schema: SystemAlertSchema },
      { name: TenantBranding.name,      schema: TenantBrandingSchema },
      { name: OperationalSnapshot.name, schema: OperationalSnapshotSchema },
    ]),
  ],
  controllers: [
    DashboardController,
    DonationsController,
    FeedbackController,
    FeatureVotingController,
    SupportController,
    SystemAlertsController,
    TenantAdminController,
    PresentationController,
    AuditController,
  ],
  providers: [
    // Repositories
    { provide: DONATION_CAMPAIGN_REPOSITORY,    useClass: DonationCampaignRepository },
    { provide: DONATION_REPOSITORY,             useClass: DonationRepository },
    { provide: FEEDBACK_REPOSITORY,             useClass: FeedbackRepository },
    { provide: FEATURE_REQUEST_REPOSITORY,      useClass: FeatureRequestRepository },
    { provide: FEATURE_VOTE_REPOSITORY,         useClass: FeatureVoteRepository },
    { provide: FEATURE_FOLLOW_REPOSITORY,       useClass: FeatureFollowRepository },
    { provide: SUPPORT_TICKET_REPOSITORY,       useClass: SupportTicketRepository },
    { provide: TICKET_MESSAGE_REPOSITORY,       useClass: TicketMessageRepository },
    { provide: SYSTEM_ALERT_REPOSITORY,         useClass: SystemAlertRepository },
    { provide: TENANT_BRANDING_REPOSITORY,      useClass: TenantBrandingRepository },
    { provide: OPERATIONAL_SNAPSHOT_REPOSITORY, useClass: OperationalSnapshotRepository },
    { provide: AUDIT_LOG_ADMIN_REPOSITORY,      useClass: AuditLogAdminRepository },
    // Application services
    DashboardService,
    DonationsService,
    FeedbackService,
    FeatureVotingService,
    SupportService,
    SystemAlertsService,
    AnalyticsService,
    PresentationService,
    AuditAdminService,
    TenantAdminService,
    // Scheduler
    SnapshotScheduler,
  ],
  exports: [
    DonationsService,
    SystemAlertsService,
    AuditAdminService,
  ],
})
export class AdminModule {}
