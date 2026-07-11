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
import { CreateParentUseCase } from '../../application/use-cases/create-parent.use-case';
import { GetParentUseCase } from '../../application/use-cases/get-parent.use-case';
import { GetMyParentProfileUseCase } from '../../application/use-cases/get-my-parent-profile.use-case';
import { ListParentsUseCase } from '../../application/use-cases/list-parents.use-case';
import { ListChildrenUseCase } from '../../application/use-cases/list-children.use-case';
import { UpdateParentUseCase } from '../../application/use-cases/update-parent.use-case';
import { CreateParentDto } from '../../application/dto/create-parent.dto';
import { UpdateParentDto } from '../../application/dto/update-parent.dto';

/**
 * Parents API — `/parents`
 *
 * RBAC summary:
 *  - POST   /parents               → PARENTS.CREATE  (Tenant Admin)
 *  - GET    /parents               → PARENTS.READ    (Tenant Admin / Supervisor)
 *  - GET    /parents/me            → auth only       (parent's own profile)
 *  - GET    /parents/:id           → PARENTS.READ    (ownership enforced in use-case)
 *  - GET    /parents/:id/children  → PARENTS.READ    (ownership enforced in use-case)
 *  - PATCH  /parents/:id           → PARENTS.UPDATE
 */
@Controller('parents')
export class ParentsController {
  constructor(
    private readonly createParentUseCase: CreateParentUseCase,
    private readonly getParentUseCase: GetParentUseCase,
    private readonly getMyParentProfileUseCase: GetMyParentProfileUseCase,
    private readonly listParentsUseCase: ListParentsUseCase,
    private readonly listChildrenUseCase: ListChildrenUseCase,
    private readonly updateParentUseCase: UpdateParentUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PARENTS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateParentDto) {
    return this.createParentUseCase.execute(user.tenantId, dto);
  }

  /** Returns the calling user's own parent profile. */
  @Get('me')
  getMyProfile(@CurrentUser() user: AccessTokenPayload) {
    return this.getMyParentProfileUseCase.execute(user.tenantId, user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PARENTS.READ!)
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listParentsUseCase.execute(user.tenantId);
  }

  @Get(':parentId')
  @RequirePermissions(PERMISSIONS.PARENTS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('parentId') parentId: string) {
    return this.getParentUseCase.execute(user.tenantId, parentId, user);
  }

  @Get(':parentId/children')
  @RequirePermissions(PERMISSIONS.PARENTS.READ!)
  listChildren(@CurrentUser() user: AccessTokenPayload, @Param('parentId') parentId: string) {
    return this.listChildrenUseCase.execute(user.tenantId, parentId, user);
  }

  @Patch(':parentId')
  @RequirePermissions(PERMISSIONS.PARENTS.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('parentId') parentId: string,
    @Body() dto: UpdateParentDto,
  ) {
    return this.updateParentUseCase.execute(user.tenantId, parentId, dto);
  }
}
