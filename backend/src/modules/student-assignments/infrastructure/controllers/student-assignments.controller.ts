import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { AssignStudentToCircleUseCase } from '../../application/use-cases/assign-student-to-circle.use-case';
import { UnassignStudentFromCircleUseCase } from '../../application/use-cases/unassign-student-from-circle.use-case';
import { AssignStudentToSheikhUseCase } from '../../application/use-cases/assign-student-to-sheikh.use-case';
import { UnassignStudentFromSheikhUseCase } from '../../application/use-cases/unassign-student-from-sheikh.use-case';
import { LinkParentToStudentUseCase } from '../../application/use-cases/link-parent-to-student.use-case';
import { UnlinkParentFromStudentUseCase } from '../../application/use-cases/unlink-parent-from-student.use-case';
import { GetAssignmentHistoryUseCase } from '../../application/use-cases/get-assignment-history.use-case';
import { AssignStudentCircleDto } from '../../application/dto/assign-student-circle.dto';
import { AssignStudentSheikhDto } from '../../application/dto/assign-student-sheikh.dto';
import { LinkParentStudentDto } from '../../application/dto/link-parent-student.dto';

/**
 * Student Assignments API — `/assignments`
 *
 * Central coordination point for all student↔circle, student↔sheikh, and
 * student↔parent relationship management. Every operation is idempotent
 * and creates an auditable enrollment record.
 *
 * RBAC summary:
 *  - POST   /assignments/circles              → GROUPS.ASSIGN
 *  - DELETE /assignments/circles/:studentId   → GROUPS.ASSIGN
 *  - POST   /assignments/sheikhs              → SHEIKHS.ASSIGN
 *  - DELETE /assignments/sheikhs/:studentId   → SHEIKHS.ASSIGN
 *  - POST   /assignments/parents              → STUDENTS.UPDATE
 *  - DELETE /assignments/parents/:sid/:pid    → STUDENTS.UPDATE
 *  - GET    /assignments/:studentId/history   → GROUPS.READ
 */
@Controller('assignments')
export class StudentAssignmentsController {
  constructor(
    private readonly assignToCircleUseCase: AssignStudentToCircleUseCase,
    private readonly unassignFromCircleUseCase: UnassignStudentFromCircleUseCase,
    private readonly assignToSheikhUseCase: AssignStudentToSheikhUseCase,
    private readonly unassignFromSheikhUseCase: UnassignStudentFromSheikhUseCase,
    private readonly linkParentUseCase: LinkParentToStudentUseCase,
    private readonly unlinkParentUseCase: UnlinkParentFromStudentUseCase,
    private readonly getHistoryUseCase: GetAssignmentHistoryUseCase,
  ) {}

  // ── Circle assignments ────────────────────────────────────────────────

  @Post('circles')
  @RequirePermissions(PERMISSIONS.GROUPS.ASSIGN!)
  assignToCircle(@CurrentUser() user: AccessTokenPayload, @Body() dto: AssignStudentCircleDto) {
    return this.assignToCircleUseCase.execute(user.tenantId, dto, user);
  }

  @Delete('circles/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.GROUPS.ASSIGN!)
  unassignFromCircle(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.unassignFromCircleUseCase.execute(user.tenantId, studentId, user);
  }

  // ── Sheikh assignments (private 1-on-1) ───────────────────────────────

  @Post('sheikhs')
  @RequirePermissions(PERMISSIONS.SHEIKHS.ASSIGN!)
  assignToSheikh(@CurrentUser() user: AccessTokenPayload, @Body() dto: AssignStudentSheikhDto) {
    return this.assignToSheikhUseCase.execute(user.tenantId, dto, user);
  }

  @Delete('sheikhs/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SHEIKHS.ASSIGN!)
  unassignFromSheikh(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.unassignFromSheikhUseCase.execute(user.tenantId, studentId, user);
  }

  // ── Parent–student links ───────────────────────────────────────────────

  @Post('parents')
  @RequirePermissions(PERMISSIONS.STUDENTS.UPDATE!)
  linkParent(@CurrentUser() user: AccessTokenPayload, @Body() dto: LinkParentStudentDto) {
    return this.linkParentUseCase.execute(user.tenantId, dto);
  }

  @Delete('parents/:studentId/:parentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STUDENTS.UPDATE!)
  unlinkParent(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Param('parentId') parentId: string,
  ) {
    return this.unlinkParentUseCase.execute(user.tenantId, studentId, parentId);
  }

  // ── Assignment history ─────────────────────────────────────────────────

  /**
   * Assignment history: gated on `assignments.read` so all relevant roles
   * (SUPERVISOR, SHEIKH, PARENT, STUDENT) can reach the endpoint. The
   * use-case enforces fine-grained ownership on top of this coarse gate.
   */
  @Get(':studentId/history')
  @RequirePermissions(PERMISSIONS.ASSIGNMENTS.READ!)
  getHistory(@CurrentUser() user: AccessTokenPayload, @Param('studentId') studentId: string) {
    return this.getHistoryUseCase.execute(user.tenantId, studentId, user);
  }
}
