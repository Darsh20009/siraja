import { Controller, Get, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { DashboardService } from '../../application/services/dashboard.service';
import { AnalyticsService } from '../../application/services/analytics.service';
import { SystemAlertsService } from '../../application/services/system-alerts.service';

@Controller('admin/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly analytics: AnalyticsService,
    private readonly alerts: SystemAlertsService,
  ) {}

  // ── Overview ──────────────────────────────────────────────────────────────

  @Get('overview')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getOverview() {
    return this.dashboard.getPlatformOverview();
  }

  @Get('growth')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getGrowth(@Query('days') days?: string) {
    return this.dashboard.getGrowthMetrics(days ? parseInt(days, 10) : 30);
  }

  /** Operational status: queues, AI, email, storage, tickets. */
  @Get('operational')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getOperationalSummary() {
    return this.dashboard.getOperationalSummary();
  }

  @Post('snapshot')
  @RequirePermissions(PERMISSIONS.ADMIN.CREATE!)
  captureSnapshot() {
    return this.dashboard.captureSnapshot();
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  @Get('analytics/users')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getUserGrowth(@Query('days') days?: string) {
    return this.analytics.getUserGrowth(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/dau')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getDau(@Query('days') days?: string) {
    return this.analytics.getDailyActiveUsers(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/wau')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getWau(@Query('weeks') weeks?: string) {
    return this.analytics.getWeeklyActiveUsers(weeks ? parseInt(weeks, 10) : 12);
  }

  @Get('analytics/mau')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getMau(@Query('months') months?: string) {
    return this.analytics.getMonthlyActiveUsers(months ? parseInt(months, 10) : 6);
  }

  @Get('analytics/engagement')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getEngagement(@Query('days') days?: string) {
    return this.analytics.getEngagementTrend(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/retention')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getRetention(@Query('days') days?: string) {
    return this.analytics.getRetentionProxy(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/growth')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getPlatformGrowth(@Query('days') days?: string) {
    return this.analytics.getPlatformGrowth(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/platform-usage')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getPlatformUsage(@Query('days') days?: string) {
    return this.analytics.getPlatformUsageTrend(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/donations')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getDonationTrend(@Query('days') days?: string) {
    return this.analytics.getDonationTrend(days ? parseInt(days, 10) : 30);
  }

  // ── Alerts & health ───────────────────────────────────────────────────────

  @Get('alerts')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getActiveAlerts() {
    return this.alerts.getActiveAlerts();
  }

  @Get('health')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  runHealthChecks() {
    return this.alerts.runHealthChecks();
  }
}
