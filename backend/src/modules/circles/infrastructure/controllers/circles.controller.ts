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
import { CreateCircleUseCase } from '../../application/use-cases/create-circle.use-case';
import { GetCircleUseCase } from '../../application/use-cases/get-circle.use-case';
import { ListCirclesUseCase } from '../../application/use-cases/list-circles.use-case';
import { UpdateCircleUseCase } from '../../application/use-cases/update-circle.use-case';
import { AssignSheikhToCircleUseCase } from '../../application/use-cases/assign-sheikh-to-circle.use-case';
import { UnassignSheikhFromCircleUseCase } from '../../application/use-cases/unassign-sheikh-from-circle.use-case';
import { RemoveCircleUseCase } from '../../application/use-cases/remove-circle.use-case';
import { AssignSupervisorToCircleUseCase } from '../../application/use-cases/assign-supervisor-to-circle.use-case';
import { UnassignSupervisorFromCircleUseCase } from '../../application/use-cases/unassign-supervisor-from-circle.use-case';
import { CreateCircleDto } from '../../application/dto/create-circle.dto';
import { UpdateCircleDto } from '../../application/dto/update-circle.dto';
import { AssignSheikhDto } from '../../application/dto/assign-sheikh.dto';
import { AssignSupervisorDto } from '../../application/dto/assign-supervisor.dto';

/**
 * Circles (Halaqat) API — `/circles`
 *
 * RBAC summary:
 *  - POST   /circles                        → GROUPS.CREATE
 *  - GET    /circles                        → GROUPS.READ   (role-scoped in ListCirclesUseCase)
 *  - GET    /circles/:id                    → GROUPS.READ   (ownership enforced in GetCircleUseCase)
 *  - PATCH  /circles/:id                    → GROUPS.UPDATE
 *  - DELETE /circles/:id                    → GROUPS.DELETE
 *  - POST   /circles/:id/sheikh             → SHEIKHS.ASSIGN
 *  - DELETE /circles/:id/sheikh             → SHEIKHS.ASSIGN
 *  - POST   /circles/:id/supervisor         → SUPERVISORS.ASSIGN
 *  - DELETE /circles/:id/supervisor         → SUPERVISORS.ASSIGN
 */
@Controller('circles')
export class CirclesController {
  constructor(
    private readonly createCircleUseCase: CreateCircleUseCase,
    private readonly getCircleUseCase: GetCircleUseCase,
    private readonly listCirclesUseCase: ListCirclesUseCase,
    private readonly updateCircleUseCase: UpdateCircleUseCase,
    private readonly removeCircleUseCase: RemoveCircleUseCase,
    private readonly assignSheikhToCircleUseCase: AssignSheikhToCircleUseCase,
    private readonly unassignSheikhFromCircleUseCase: UnassignSheikhFromCircleUseCase,
    private readonly assignSupervisorToCircleUseCase: AssignSupervisorToCircleUseCase,
    private readonly unassignSupervisorFromCircleUseCase: UnassignSupervisorFromCircleUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.GROUPS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateCircleDto) {
    return this.createCircleUseCase.execute(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.GROUPS.READ!)
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listCirclesUseCase.execute(user);
  }

  @Get(':circleId')
  @RequirePermissions(PERMISSIONS.GROUPS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('circleId') circleId: string) {
    return this.getCircleUseCase.execute(user.tenantId, circleId, user);
  }

  @Patch(':circleId')
  @RequirePermissions(PERMISSIONS.GROUPS.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('circleId') circleId: string,
    @Body() dto: UpdateCircleDto,
  ) {
    return this.updateCircleUseCase.execute(user.tenantId, circleId, dto, user);
  }

  @Delete(':circleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.GROUPS.DELETE!)
  remove(@CurrentUser() user: AccessTokenPayload, @Param('circleId') circleId: string) {
    return this.removeCircleUseCase.execute(user.tenantId, circleId);
  }

  // ── Sheikh assignment ─────────────────────────────────────────────────

  @Post(':circleId/sheikh')
  @RequirePermissions(PERMISSIONS.SHEIKHS.ASSIGN!)
  assignSheikh(
    @CurrentUser() user: AccessTokenPayload,
    @Param('circleId') circleId: string,
    @Body() dto: AssignSheikhDto,
  ) {
    return this.assignSheikhToCircleUseCase.execute(user.tenantId, circleId, dto.sheikhId);
  }

  @Delete(':circleId/sheikh')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SHEIKHS.ASSIGN!)
  unassignSheikh(@CurrentUser() user: AccessTokenPayload, @Param('circleId') circleId: string) {
    return this.unassignSheikhFromCircleUseCase.execute(user.tenantId, circleId);
  }

  // ── Supervisor assignment ─────────────────────────────────────────────

  @Post(':circleId/supervisor')
  @RequirePermissions(PERMISSIONS.SUPERVISORS.ASSIGN!)
  assignSupervisor(
    @CurrentUser() user: AccessTokenPayload,
    @Param('circleId') circleId: string,
    @Body() dto: AssignSupervisorDto,
  ) {
    return this.assignSupervisorToCircleUseCase.execute(user.tenantId, circleId, dto.supervisorId);
  }

  @Delete(':circleId/supervisor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SUPERVISORS.ASSIGN!)
  unassignSupervisor(@CurrentUser() user: AccessTokenPayload, @Param('circleId') circleId: string) {
    return this.unassignSupervisorFromCircleUseCase.execute(user.tenantId, circleId);
  }
}
