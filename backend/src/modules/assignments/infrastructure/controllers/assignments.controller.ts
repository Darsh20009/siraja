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
import { CreateAssignmentUseCase } from '../../application/use-cases/create-assignment.use-case';
import { ListAssignmentsUseCase } from '../../application/use-cases/list-assignments.use-case';
import { GetAssignmentUseCase } from '../../application/use-cases/get-assignment.use-case';
import { SubmitAssignmentUseCase } from '../../application/use-cases/submit-assignment.use-case';
import { ReviewAssignmentUseCase } from '../../application/use-cases/review-assignment.use-case';
import { CreateAssignmentDto } from '../../application/dto/create-assignment.dto';
import { SubmitAssignmentDto } from '../../application/dto/submit-assignment.dto';
import { ReviewAssignmentDto } from '../../application/dto/review-assignment.dto';
import { AssignmentStatus, AssignmentType } from '@shared/enums/exam-assignment.enum';

/**
 * Assignments API — `/assignments`
 *
 * RBAC summary:
 *  POST   /assignments                  → ASSIGNMENTS.CREATE  (Sheikh, Admin)
 *  GET    /assignments                  → ASSIGNMENTS.READ    (role-scoped in use-case)
 *  GET    /assignments/:id              → ASSIGNMENTS.READ
 *  PATCH  /assignments/:id/submit       → ASSIGNMENTS.UPDATE  (Student, Sheikh, Admin)
 *  PATCH  /assignments/:id/review       → ASSIGNMENTS.APPROVE (Sheikh, Supervisor, Admin)
 */
@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly createAssignment: CreateAssignmentUseCase,
    private readonly listAssignments: ListAssignmentsUseCase,
    private readonly getAssignment: GetAssignmentUseCase,
    private readonly submitAssignment: SubmitAssignmentUseCase,
    private readonly reviewAssignment: ReviewAssignmentUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ASSIGNMENTS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateAssignmentDto) {
    return this.createAssignment.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ASSIGNMENTS.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('studentId') studentId?: string,
    @Query('groupId') groupId?: string,
    @Query('type') type?: AssignmentType,
    @Query('status') status?: AssignmentStatus,
    @Query('fromDue') fromDue?: string,
    @Query('toDue') toDue?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listAssignments.execute(user, {
      studentId,
      groupId,
      type,
      status,
      fromDue,
      toDue,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ASSIGNMENTS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.getAssignment.execute(user, id);
  }

  @Patch(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ASSIGNMENTS.READ!) // Students have READ; ownership enforced in use-case
  submit(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.submitAssignment.execute(user, id, dto);
  }

  @Patch(':id/review')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ASSIGNMENTS.APPROVE!)
  review(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: ReviewAssignmentDto,
  ) {
    return this.reviewAssignment.execute(user, id, dto);
  }
}
