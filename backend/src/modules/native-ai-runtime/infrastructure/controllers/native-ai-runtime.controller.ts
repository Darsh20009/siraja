import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '../../../../shared/authorization/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../../../../shared/authorization/permission-registry';

import { RunStudentAnalysisUseCase } from '../../application/use-cases/run-student-analysis.use-case';
import { GenerateParentReportUseCase } from '../../application/use-cases/generate-parent-report.use-case';
import { GetSheikhDashboardUseCase } from '../../application/use-cases/get-sheikh-dashboard.use-case';
import { GetStudentTimelineUseCase } from '../../application/use-cases/get-student-timeline.use-case';
import { ComputeRiskUseCase } from '../../application/use-cases/compute-risk.use-case';
import { LearningPlannerService } from '../../application/planners/learning-planner.service';
import { RevisionSchedulerService } from '../../application/planners/revision-scheduler.service';
import { AiRuntimeService } from '../../application/services/ai-runtime.service';
import { AiMetricsService } from '../../application/services/ai-metrics.service';
import { AiEventBusService } from '../../application/services/ai-event-bus.service';

import {
  RunStudentAnalysisRequestDto,
  RunStudentAnalysisResponseDto,
} from '../../application/dtos/student-analysis.dto';
import {
  GenerateParentReportRequestDto,
  GenerateParentReportResponseDto,
} from '../../application/dtos/parent-report.dto';
import {
  GetSheikhDashboardRequestDto,
  GetSheikhDashboardResponseDto,
  GetLearningPlanRequestDto,
  GetLearningPlanResponseDto,
  GetRevisionScheduleRequestDto,
  GetRevisionScheduleResponseDto,
} from '../../application/dtos/sheikh-dashboard.dto';
import {
  GetStudentTimelineRequestDto,
  GetStudentTimelineResponseDto,
} from '../../application/dtos/student-timeline.dto';
import {
  ComputeRiskRequestDto,
  ComputeRiskResponseDto,
  GetMetricsResponseDto,
  GetRecentEventsResponseDto,
  GetRuntimeStatusResponseDto,
} from '../../application/dtos/risk-assessment.dto';
import type { TajweedRuleType } from '../../../native-ai/domain/entities/tajweed-rule-application.entity';

interface AuthenticatedRequest extends Request {
  user?: { sub: string; tenantId?: string };
  tenantId?: string;
}

/**
 * NativeAiRuntimeController — HTTP layer for the Phase 13D Native AI Runtime.
 *
 * All endpoints are:
 * - JWT-authenticated
 * - RBAC-guarded (NATIVE_AI_RUNTIME category)
 * - Tenant-aware (tenant resolved from X-Tenant-Slug header)
 * - Fully deterministic: identical inputs → identical outputs
 * - Zero external AI service calls
 */
@ApiTags('Native AI Runtime')
@ApiSecurity('bearer')
@ApiSecurity('tenant-slug')
@Controller('native-ai-runtime')
export class NativeAiRuntimeController {
  constructor(
    private readonly runStudentAnalysis: RunStudentAnalysisUseCase,
    private readonly generateParentReport: GenerateParentReportUseCase,
    private readonly getSheikhDashboard: GetSheikhDashboardUseCase,
    private readonly getStudentTimeline: GetStudentTimelineUseCase,
    private readonly computeRisk: ComputeRiskUseCase,
    private readonly planner: LearningPlannerService,
    private readonly scheduler: RevisionSchedulerService,
    private readonly runtime: AiRuntimeService,
    private readonly metrics: AiMetricsService,
    private readonly eventBus: AiEventBusService,
  ) {}

  // ── Analysis ──────────────────────────────────────────────────────────────

  @Post('analysis/student')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.READ!)
  @ApiOperation({ summary: 'Run full AI analysis for a single student' })
  @ApiResponse({ status: 200, type: RunStudentAnalysisResponseDto })
  analyzeStudent(
    @Body() dto: RunStudentAnalysisRequestDto,
    @Req() req: AuthenticatedRequest,
  ): RunStudentAnalysisResponseDto {
    return this.runStudentAnalysis.execute(dto, this.resolveTenantId(req));
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Post('reports/parent')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.EXPORT!)
  @ApiOperation({ summary: 'Generate a comprehensive AI-powered parent report' })
  @ApiResponse({ status: 200, type: GenerateParentReportResponseDto })
  parentReport(
    @Body() dto: GenerateParentReportRequestDto,
    @Req() req: AuthenticatedRequest,
  ): GenerateParentReportResponseDto {
    return this.generateParentReport.execute(dto, this.resolveTenantId(req));
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @Post('dashboard/sheikh')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.READ!)
  @ApiOperation({ summary: 'Build the AI dashboard payload for a sheikh' })
  @ApiResponse({ status: 200, type: GetSheikhDashboardResponseDto })
  sheikhDashboard(
    @Body() dto: GetSheikhDashboardRequestDto,
    @Req() req: AuthenticatedRequest,
  ): GetSheikhDashboardResponseDto {
    return this.getSheikhDashboard.execute(dto, this.resolveTenantId(req));
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  @Post('timeline/student')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.READ!)
  @ApiOperation({ summary: 'Build and AI-annotate a student learning timeline' })
  @ApiResponse({ status: 200, type: GetStudentTimelineResponseDto })
  studentTimeline(
    @Body() dto: GetStudentTimelineRequestDto,
    @Req() req: AuthenticatedRequest,
  ): GetStudentTimelineResponseDto {
    return this.getStudentTimeline.execute(dto, this.resolveTenantId(req));
  }

  // ── Risk ──────────────────────────────────────────────────────────────────

  @Post('risk/compute')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.READ!)
  @ApiOperation({ summary: 'Compute predictive risk assessment for a student' })
  @ApiResponse({ status: 200, type: ComputeRiskResponseDto })
  riskAssessment(
    @Body() dto: ComputeRiskRequestDto,
    @Req() req: AuthenticatedRequest,
  ): ComputeRiskResponseDto {
    return this.computeRisk.execute(dto, this.resolveTenantId(req));
  }

  // ── Plans ─────────────────────────────────────────────────────────────────

  @Post('plans/learning')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.CREATE!)
  @ApiOperation({ summary: 'Generate a personalized AI learning plan' })
  @ApiResponse({ status: 200, type: GetLearningPlanResponseDto })
  learningPlan(
    @Body() dto: GetLearningPlanRequestDto,
    @Req() req: AuthenticatedRequest,
  ): GetLearningPlanResponseDto {
    const tenantId = this.resolveTenantId(req);
    const result = this.planner.buildPlan({
      studentId: dto.studentId,
      tenantId,
      weeklyVelocities: dto.weeklyVelocities,
      sessions: dto.sessions,
      burdenScore: dto.burdenScore,
      tajweedScore: dto.tajweedScore,
      currentDifficultyLevel: dto.currentDifficultyLevel,
      daysSinceLastSession: dto.daysSinceLastSession,
      targetAyahs: dto.targetAyahs,
      currentProgress: dto.currentProgress,
      tajweedWeaknesses: (dto.tajweedWeaknesses ?? []) as TajweedRuleType[],
    });
    return {
      studentId: result.studentId,
      adaptivePlan: result.adaptivePlan,
      recommendations: result.recommendations,
      velocity: result.velocity,
      isOnTrack: result.isOnTrack,
      generatedAt: result.generatedAt.toISOString(),
    };
  }

  @Post('schedule/revision')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.CREATE!)
  @ApiOperation({ summary: 'Build an SM-2 adaptive revision schedule' })
  @ApiResponse({ status: 200, type: GetRevisionScheduleResponseDto })
  revisionSchedule(
    @Body() dto: GetRevisionScheduleRequestDto,
    @Req() req: AuthenticatedRequest,
  ): GetRevisionScheduleResponseDto {
    const tenantId = this.resolveTenantId(req);
    const schedule = this.scheduler.buildSchedule(
      dto.studentId,
      tenantId,
      dto.sessions,
      dto.itemsToSchedule,
    );
    return {
      studentId: schedule.studentId,
      generatedAt: schedule.generatedAt.toISOString(),
      items: schedule.items,
      totalDueThisWeek: schedule.totalDueThisWeek,
      totalDueNextWeek: schedule.totalDueNextWeek,
      pattern: schedule.pattern,
    };
  }

  // ── Operations ────────────────────────────────────────────────────────────

  @Get('status')
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.READ!)
  @ApiOperation({ summary: 'Get runtime status and registered pipeline names' })
  @ApiResponse({ status: 200, type: GetRuntimeStatusResponseDto })
  status(): GetRuntimeStatusResponseDto {
    const s = this.runtime.getStatus();
    return {
      status: s.status,
      registeredPipelines: s.registeredPipelines,
      startedAt: s.startedAt.toISOString(),
      uptimeMs: s.uptimeMs,
    };
  }

  @Get('metrics')
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.READ!)
  @ApiOperation({ summary: 'Get AI telemetry metrics for a tenant or globally' })
  @ApiResponse({ status: 200, type: GetMetricsResponseDto })
  metricsEndpoint(
    @Query('tenantId') tenantId?: string,
  ): GetMetricsResponseDto {
    const summary = tenantId
      ? this.metrics.getSummary(tenantId)
      : this.metrics.getGlobalSummary();
    return {
      tenantId: summary.tenantId,
      totalOperations: summary.totalOperations,
      totalErrors: summary.totalErrors,
      overallErrorRate: summary.overallErrorRate,
      cache: summary.cache,
      operations: summary.operations,
      lastResetAt: summary.lastResetAt.toISOString(),
    };
  }

  @Get('events')
  @RequirePermissions(PERMISSIONS.NATIVE_AI_RUNTIME.READ!)
  @ApiOperation({ summary: 'Get recent AI runtime events for a tenant' })
  @ApiResponse({ status: 200, type: GetRecentEventsResponseDto })
  recentEvents(
    @Query('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ): GetRecentEventsResponseDto {
    const events = this.eventBus.getRecentEvents(
      tenantId ?? 'unknown',
      limit ? Number(limit) : 20,
    );
    return {
      events: events.map((e) => ({
        ...e,
        emittedAt: e.emittedAt.toISOString(),
      })),
      count: events.length,
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private resolveTenantId(req: AuthenticatedRequest): string {
    return (
      req.tenantId ??
      req.user?.tenantId ??
      (req.headers['x-tenant-slug'] as string | undefined) ??
      'default'
    );
  }
}
