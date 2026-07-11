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
import { CreateSheikhUseCase } from '../../application/use-cases/create-sheikh.use-case';
import { GetSheikhUseCase } from '../../application/use-cases/get-sheikh.use-case';
import { GetMySheikhProfileUseCase } from '../../application/use-cases/get-my-sheikh-profile.use-case';
import { ListSheikhsUseCase } from '../../application/use-cases/list-sheikhs.use-case';
import { UpdateSheikhUseCase } from '../../application/use-cases/update-sheikh.use-case';
import { CreateSheikhDto } from '../../application/dto/create-sheikh.dto';
import { UpdateSheikhDto } from '../../application/dto/update-sheikh.dto';

/**
 * Sheikhs API — `/sheikhs`
 *
 * RBAC summary:
 *  - POST   /sheikhs     → SHEIKHS.CREATE  (Tenant Admin)
 *  - GET    /sheikhs     → SHEIKHS.READ
 *  - GET    /sheikhs/me  → auth only        (sheikh's own profile)
 *  - GET    /sheikhs/:id → SHEIKHS.READ
 *  - PATCH  /sheikhs/:id → SHEIKHS.UPDATE
 */
@Controller('sheikhs')
export class SheikhsController {
  constructor(
    private readonly createSheikhUseCase: CreateSheikhUseCase,
    private readonly getSheikhUseCase: GetSheikhUseCase,
    private readonly getMySheikhProfileUseCase: GetMySheikhProfileUseCase,
    private readonly listSheikhsUseCase: ListSheikhsUseCase,
    private readonly updateSheikhUseCase: UpdateSheikhUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SHEIKHS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateSheikhDto) {
    return this.createSheikhUseCase.execute(user.tenantId, dto);
  }

  /** Returns the calling user's own sheikh profile. */
  @Get('me')
  getMyProfile(@CurrentUser() user: AccessTokenPayload) {
    return this.getMySheikhProfileUseCase.execute(user.tenantId, user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SHEIKHS.READ!)
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listSheikhsUseCase.execute(user.tenantId);
  }

  @Get(':sheikhId')
  @RequirePermissions(PERMISSIONS.SHEIKHS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('sheikhId') sheikhId: string) {
    return this.getSheikhUseCase.execute(user.tenantId, sheikhId);
  }

  @Patch(':sheikhId')
  @RequirePermissions(PERMISSIONS.SHEIKHS.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sheikhId') sheikhId: string,
    @Body() dto: UpdateSheikhDto,
  ) {
    return this.updateSheikhUseCase.execute(user.tenantId, sheikhId, dto);
  }
}
