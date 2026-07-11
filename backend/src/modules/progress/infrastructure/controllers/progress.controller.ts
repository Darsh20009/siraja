import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetStudentProgressUseCase } from '../../application/use-cases/get-student-progress.use-case';

/**
 * Progress API — `/progress`
 *
 * RBAC summary:
 *  GET /progress/students/:studentId  → MEMORIZATION.READ
 *  GET /progress/me                   → MEMORIZATION.READ (student's own)
 */
@Controller('progress')
export class ProgressController {
  constructor(private readonly getProgress: GetStudentProgressUseCase) {}

  @Get('me')
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  getMyProgress(@CurrentUser() user: AccessTokenPayload) {
    return this.getProgress.execute(user, user.sub);
  }

  @Get('students/:studentId')
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  getStudentProgress(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.getProgress.execute(user, studentId);
  }
}
