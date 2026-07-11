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
import { CreateAssessmentUseCase } from '../../application/use-cases/create-assessment.use-case';
import { ListAssessmentsUseCase } from '../../application/use-cases/list-assessments.use-case';
import { GetAssessmentUseCase } from '../../application/use-cases/get-assessment.use-case';
import { UpdateAssessmentUseCase } from '../../application/use-cases/update-assessment.use-case';
import { CreateAssessmentDto } from '../../application/dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../../application/dto/update-assessment.dto';
import { AssessmentStatus, AssessmentType } from '@shared/enums/exam-assignment.enum';

/**
 * Assessments API — `/assessments`
 *
 * Periodic student evaluations (weekly / monthly / custom).
 *
 * RBAC summary:
 *  POST   /assessments          → REPORTS.READ   (Sheikh, Supervisor, Admin)
 *  GET    /assessments          → REPORTS.READ   (role-scoped in use-case)
 *  GET    /assessments/:id      → REPORTS.READ
 *  PATCH  /assessments/:id      → REPORTS.READ   (Sheikh, Supervisor, Admin)
 */
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly createAssessment: CreateAssessmentUseCase,
    private readonly listAssessments: ListAssessmentsUseCase,
    private readonly getAssessment: GetAssessmentUseCase,
    private readonly updateAssessment: UpdateAssessmentUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateAssessmentDto) {
    return this.createAssessment.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('studentId') studentId?: string,
    @Query('groupId') groupId?: string,
    @Query('type') type?: AssessmentType,
    @Query('status') status?: AssessmentStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listAssessments.execute(user, {
      studentId,
      groupId,
      type,
      status,
      fromDate,
      toDate,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.getAssessment.execute(user, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.REPORTS.READ!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.updateAssessment.execute(user, id, dto);
  }
}
