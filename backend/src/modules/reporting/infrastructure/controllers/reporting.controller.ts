import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetStudentReportUseCase } from '../../application/use-cases/get-student-report.use-case';
import { GetParentReportUseCase } from '../../application/use-cases/get-parent-report.use-case';
import { GetSheikhReportUseCase } from '../../application/use-cases/get-sheikh-report.use-case';
import { GetCircleReportUseCase } from '../../application/use-cases/get-circle-report.use-case';
import { GetSupervisorReportUseCase } from '../../application/use-cases/get-supervisor-report.use-case';

/**
 * Reporting API — `/reports`
 *
 * All endpoints require REPORTS.READ permission.
 * Role-based access is enforced inside each use-case.
 *
 * RBAC summary:
 *  GET /reports/students/:id          → Student (own), Parent (children), Sheikh, Admin
 *  GET /reports/parents/:id           → Parent (own), Admin
 *  GET /reports/sheikhs/:id           → Sheikh (own), Supervisor, Admin
 *  GET /reports/circles/:id           → Sheikh, Supervisor, Admin
 *  GET /reports/supervisors/:id       → Supervisor (own), Admin
 */
@Controller('reports')
export class ReportingController {
  constructor(
    private readonly studentReport: GetStudentReportUseCase,
    private readonly parentReport: GetParentReportUseCase,
    private readonly sheikhReport: GetSheikhReportUseCase,
    private readonly circleReport: GetCircleReportUseCase,
    private readonly supervisorReport: GetSupervisorReportUseCase,
  ) {}

  @Get('students/:studentId')
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  getStudentReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.studentReport.execute(user, { studentId, fromDate, toDate });
  }

  @Get('parents/:parentId')
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  getParentReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('parentId') parentId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.parentReport.execute(user, { parentId, fromDate, toDate });
  }

  @Get('sheikhs/:sheikhId')
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  getSheikhReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sheikhId') sheikhId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.sheikhReport.execute(user, { sheikhId, fromDate, toDate });
  }

  @Get('circles/:groupId')
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  getCircleReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('groupId') groupId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.circleReport.execute(user, { groupId, fromDate, toDate });
  }

  @Get('supervisors/:supervisorId')
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  getSupervisorReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('supervisorId') supervisorId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.supervisorReport.execute(user, { supervisorId, fromDate, toDate });
  }
}
