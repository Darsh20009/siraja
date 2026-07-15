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

  @Post('snapshot')
  @RequirePermissions(PERMISSIONS.ADMIN.CREATE!)
  captureSnapshot() {
    return this.dashboard.captureSnapshot();
  }

  @Get('analytics/users')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getUserGrowth(@Query('days') days?: string) {
    return this.analytics.getUserGrowth(days ? parseInt(days, 10) : 30);
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
