import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateSupervisorUseCase } from '../../application/use-cases/create-supervisor.use-case';
import { GetSupervisorUseCase } from '../../application/use-cases/get-supervisor.use-case';
import { GetMySupervisorProfileUseCase } from '../../application/use-cases/get-my-supervisor-profile.use-case';
import { ListSupervisorsUseCase } from '../../application/use-cases/list-supervisors.use-case';
import { UpdateSupervisorUseCase } from '../../application/use-cases/update-supervisor.use-case';
import { CreateSupervisorDto } from '../../application/dto/create-supervisor.dto';
import { UpdateSupervisorDto } from '../../application/dto/update-supervisor.dto';

/**
 * Supervisors API — `/supervisors`
 *
 * RBAC summary:
 *  - POST   /supervisors     → SUPERVISORS.CREATE (Tenant Admin)
 *  - GET    /supervisors     → SUPERVISORS.READ
 *  - GET    /supervisors/me  → auth only           (supervisor's own profile)
 *  - GET    /supervisors/:id → SUPERVISORS.READ
 *  - PATCH  /supervisors/:id → SUPERVISORS.UPDATE
 */
@Controller('supervisors')
export class SupervisorsController {
  constructor(
    private readonly createSupervisorUseCase: CreateSupervisorUseCase,
    private readonly getSupervisorUseCase: GetSupervisorUseCase,
    private readonly getMySupervisorProfileUseCase: GetMySupervisorProfileUseCase,
    private readonly listSupervisorsUseCase: ListSupervisorsUseCase,
    private readonly updateSupervisorUseCase: UpdateSupervisorUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SUPERVISORS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateSupervisorDto) {
    return this.createSupervisorUseCase.execute(user.tenantId, dto);
  }

  /** Returns the calling user's own supervisor profile. */
  @Get('me')
  getMyProfile(@CurrentUser() user: AccessTokenPayload) {
    return this.getMySupervisorProfileUseCase.execute(user.tenantId, user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SUPERVISORS.READ!)
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listSupervisorsUseCase.execute(user.tenantId);
  }

  @Get(':supervisorId')
  @RequirePermissions(PERMISSIONS.SUPERVISORS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('supervisorId') supervisorId: string) {
    return this.getSupervisorUseCase.execute(user.tenantId, supervisorId);
  }

  @Patch(':supervisorId')
  @RequirePermissions(PERMISSIONS.SUPERVISORS.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('supervisorId') supervisorId: string,
    @Body() dto: UpdateSupervisorDto,
  ) {
    return this.updateSupervisorUseCase.execute(user.tenantId, supervisorId, dto);
  }
}
