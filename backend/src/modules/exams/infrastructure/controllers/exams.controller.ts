import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateExamUseCase } from '../../application/use-cases/create-exam.use-case';
import { ListExamsUseCase } from '../../application/use-cases/list-exams.use-case';
import { GetExamUseCase } from '../../application/use-cases/get-exam.use-case';
import { GradeExamUseCase } from '../../application/use-cases/grade-exam.use-case';
import { CreateExamDto } from '../../application/dto/create-exam.dto';
import { GradeExamDto } from '../../application/dto/grade-exam.dto';
import { ExamCategory, ExamResult, ExamStatus } from '@shared/enums/exam-assignment.enum';

/**
 * Exams API — `/exams`
 *
 * RBAC summary:
 *  POST   /exams               → EXAMS.CREATE   (Sheikh, Supervisor, Admin)
 *  GET    /exams               → EXAMS.READ     (role-scoped in use-case)
 *  GET    /exams/:id           → EXAMS.READ
 *  PATCH  /exams/:id/grade     → EXAMS.APPROVE  (Sheikh, Supervisor, Admin)
 */
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly createExam: CreateExamUseCase,
    private readonly listExams: ListExamsUseCase,
    private readonly getExam: GetExamUseCase,
    private readonly gradeExam: GradeExamUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.EXAMS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateExamDto) {
    return this.createExam.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.EXAMS.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('studentId') studentId?: string,
    @Query('groupId') groupId?: string,
    @Query('category') category?: ExamCategory,
    @Query('status') status?: ExamStatus,
    @Query('result') result?: ExamResult,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listExams.execute(user, {
      studentId,
      groupId,
      category,
      status,
      result,
      fromDate,
      toDate,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EXAMS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.getExam.execute(user, id);
  }

  @Patch(':id/grade')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EXAMS.APPROVE!)
  grade(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: GradeExamDto,
  ) {
    return this.gradeExam.execute(user, id, dto);
  }
}
