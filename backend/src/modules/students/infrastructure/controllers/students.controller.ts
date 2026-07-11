import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateStudentUseCase } from '../../application/use-cases/create-student.use-case';
import { GetStudentUseCase } from '../../application/use-cases/get-student.use-case';
import { GetMyStudentProfileUseCase } from '../../application/use-cases/get-my-student-profile.use-case';
import { ListStudentsUseCase } from '../../application/use-cases/list-students.use-case';
import { UpdateStudentUseCase } from '../../application/use-cases/update-student.use-case';
import { RemoveStudentUseCase } from '../../application/use-cases/remove-student.use-case';
import { CreateStudentDto } from '../../application/dto/create-student.dto';
import { UpdateStudentDto } from '../../application/dto/update-student.dto';

/**
 * Students API — `/students`
 *
 * RBAC summary:
 *  - POST   /students          → STUDENTS.CREATE  (Tenant Admin)
 *  - GET    /students          → STUDENTS.READ    (role-scoped in ListStudentsUseCase)
 *  - GET    /students/me       → auth only        (student's own profile)
 *  - GET    /students/:id      → STUDENTS.READ    (ownership enforced in GetStudentUseCase)
 *  - PATCH  /students/:id      → STUDENTS.UPDATE
 *  - DELETE /students/:id      → STUDENTS.DELETE
 */
@Controller('students')
export class StudentsController {
  constructor(
    private readonly createStudentUseCase: CreateStudentUseCase,
    private readonly getStudentUseCase: GetStudentUseCase,
    private readonly getMyStudentProfileUseCase: GetMyStudentProfileUseCase,
    private readonly listStudentsUseCase: ListStudentsUseCase,
    private readonly updateStudentUseCase: UpdateStudentUseCase,
    private readonly removeStudentUseCase: RemoveStudentUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateStudentDto) {
    return this.createStudentUseCase.execute(user.tenantId, dto);
  }

  /** Returns the calling user's own student profile. No STUDENTS.READ needed — auth is enough. */
  @Get('me')
  getMyProfile(@CurrentUser() user: AccessTokenPayload) {
    return this.getMyStudentProfileUseCase.execute(user.tenantId, user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS.READ!)
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listStudentsUseCase.execute(user);
  }

  @Get(':studentId')
  @RequirePermissions(PERMISSIONS.STUDENTS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('studentId') studentId: string) {
    return this.getStudentUseCase.execute(user.tenantId, studentId, user);
  }

  @Patch(':studentId')
  @RequirePermissions(PERMISSIONS.STUDENTS.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.updateStudentUseCase.execute(user.tenantId, studentId, dto);
  }

  @Delete(':studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STUDENTS.DELETE!)
  remove(@CurrentUser() user: AccessTokenPayload, @Param('studentId') studentId: string) {
    return this.removeStudentUseCase.execute(user.tenantId, studentId);
  }
}
