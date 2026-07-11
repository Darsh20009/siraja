import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateAnnouncementUseCase } from '../../application/use-cases/create-announcement.use-case';
import { ListAnnouncementsUseCase } from '../../application/use-cases/list-announcements.use-case';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from '../../application/dto/announcement.dto';
import { AnnouncementScope, AnnouncementStatus } from '@shared/enums/announcement.enum';
import {
  ANNOUNCEMENT_REPOSITORY,
  AnnouncementItem,
  IAnnouncementRepository,
} from '../../domain/repositories/announcement.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * Announcements API — `/announcements`
 *
 * RBAC summary:
 *  POST   /announcements                → ANNOUNCEMENTS.CREATE
 *  GET    /announcements                → ANNOUNCEMENTS.READ (audience or management view)
 *  GET    /announcements/:id            → ANNOUNCEMENTS.READ (access-controlled per scope)
 *  PATCH  /announcements/:id            → ANNOUNCEMENTS.UPDATE (ownership enforced)
 *  PATCH  /announcements/:id/publish    → ANNOUNCEMENTS.UPDATE (ownership enforced)
 *  PATCH  /announcements/:id/archive    → ANNOUNCEMENTS.UPDATE (ownership enforced)
 *  DELETE /announcements/:id            → ANNOUNCEMENTS.DELETE (admin only)
 *
 * === Audience listing (manage=false) ===
 * CIRCLE announcements are NEVER included for non-admin callers. Only
 * Tenant Admin and Super Admin may filter by circleId in the audience view
 * (they have unrestricted access, so no validation is needed). All other
 * roles see GLOBAL + TENANT only. This prevents cross-circle disclosure from
 * untrusted caller-supplied circleId query input.
 *
 * A future phase can expose circle announcements to members by resolving the
 * caller's enrolled circles server-side from their profile/assignments.
 *
 * === Audience GET /:id ===
 * For CIRCLE-scoped announcements the caller must be an admin (TENANT_ADMIN /
 * SUPER_ADMIN) or the announcement creator. This keeps circle read access
 * consistent with the listing policy above.
 *
 * === Mutation ownership matrix ===
 *  Super Admin  → any announcement (including GLOBAL scope)
 *  Tenant Admin → TENANT or CIRCLE in their tenant only (not GLOBAL)
 *  Sheikh / Supervisor → CIRCLE only, announcements they created
 */
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly createAnnouncement: CreateAnnouncementUseCase,
    private readonly listAnnouncements: ListAnnouncementsUseCase,
    @Inject(ANNOUNCEMENT_REPOSITORY)
    private readonly repo: IAnnouncementRepository,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENTS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateAnnouncementDto) {
    return this.createAnnouncement.execute(user, dto);
  }

  /**
   * GET /announcements
   *
   * Audience view (manage=false, default):
   *   - Non-admin callers: returns GLOBAL + TENANT only (CIRCLE is excluded).
   *   - Admin callers (TENANT_ADMIN / SUPER_ADMIN): may pass ?circleId= to also
   *     include a specific CIRCLE's published announcements.
   *
   * Management view (manage=true):
   *   - Requires admin or creator role; use-case enforces it.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENTS.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('manage') manage?: string,
    @Query('scope') scope?: AnnouncementScope,
    @Query('status') status?: AnnouncementStatus,
    @Query('circleId') circleId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isManage = manage === 'true';
    const roles = user.roles as Role[];
    const isAdmin = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);

    // Only admins may use circleId in the audience view.
    // For non-admin callers, ignore any supplied circleId to prevent
    // cross-circle disclosure via untrusted query input.
    const resolvedCircleId = isAdmin ? circleId : undefined;

    return this.listAnnouncements.execute(user, {
      manage: isManage,
      scope,
      status,
      circleId: resolvedCircleId,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  /**
   * GET /announcements/:id
   *
   * Access control per scope:
   *  GLOBAL / TENANT: any caller with ANNOUNCEMENTS.READ (tenant-scoped).
   *  CIRCLE: only Tenant Admin, Super Admin, or the announcement creator.
   *
   * This mirrors the listing policy: non-admin non-creator callers cannot
   * access individual circle announcements until circle membership validation
   * is wired server-side.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENTS.READ!)
  async getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    const announcement = await this.repo.findById(user.tenantId, id);
    if (!announcement) throw new NotFoundException('Announcement not found.');

    if (announcement.scope === AnnouncementScope.CIRCLE) {
      this.assertCanReadCircleAnnouncement(user, announcement);
    }

    return announcement;
  }

  /**
   * PATCH /announcements/:id
   * Ownership enforced: see fetchAndAssertCanModify.
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENTS.UPDATE!)
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    await this.fetchAndAssertCanModify(user, id);
    return this.repo.update(user.tenantId, id, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  /**
   * PATCH /announcements/:id/publish
   * Ownership enforced: see fetchAndAssertCanModify.
   */
  @Patch(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENTS.UPDATE!)
  async publish(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    await this.fetchAndAssertCanModify(user, id);
    return this.repo.publish(user.tenantId, id);
  }

  /**
   * PATCH /announcements/:id/archive
   * Ownership enforced: see fetchAndAssertCanModify.
   */
  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENTS.UPDATE!)
  async archiveAnnouncement(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    await this.fetchAndAssertCanModify(user, id);
    return this.repo.archive(user.tenantId, id);
  }

  /**
   * DELETE /announcements/:id
   * Restricted to Tenant Admin and Super Admin.
   * Tenant Admin cannot delete GLOBAL announcements.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENTS.DELETE!)
  async delete(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    const roles = user.roles as Role[];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);
    const isTenantAdmin = roles.includes(Role.TENANT_ADMIN);

    if (!isSuperAdmin && !isTenantAdmin) {
      throw new ForbiddenException('Only Tenant Admin or Super Admin can delete announcements.');
    }

    const existing = await this.repo.findById(user.tenantId, id);
    if (!existing) throw new NotFoundException('Announcement not found.');

    if (isTenantAdmin && !isSuperAdmin && existing.scope === AnnouncementScope.GLOBAL) {
      throw new ForbiddenException('Tenant Admin cannot delete global announcements.');
    }

    await this.repo.delete(user.tenantId, id);
    return { deleted: true };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Enforces read access for CIRCLE-scoped announcements.
   * Only Tenant Admin, Super Admin, or the announcement creator may read them.
   */
  private assertCanReadCircleAnnouncement(
    user: AccessTokenPayload,
    announcement: AnnouncementItem,
  ): void {
    const roles = user.roles as Role[];
    const isAdmin =
      roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);

    if (isAdmin || announcement.createdById === user.sub) return;

    throw new ForbiddenException(
      'Circle announcements can only be read by the creator or an admin. ' +
        'Circle-member access will be available once membership is validated server-side.',
    );
  }

  /**
   * Fetch an announcement and assert the caller has the right to mutate it.
   *
   * Ownership matrix:
   *   Super Admin      → any announcement (GLOBAL, TENANT, CIRCLE)
   *   Tenant Admin     → TENANT or CIRCLE in their tenant; NOT GLOBAL
   *   Sheikh/Supervisor → CIRCLE only, and only if they created it (createdById)
   */
  private async fetchAndAssertCanModify(
    user: AccessTokenPayload,
    id: string,
  ): Promise<AnnouncementItem> {
    const announcement = await this.repo.findById(user.tenantId, id);
    if (!announcement) throw new NotFoundException('Announcement not found.');

    const roles = user.roles as Role[];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);
    const isTenantAdmin = roles.includes(Role.TENANT_ADMIN);
    const isSheikh = roles.includes(Role.SHEIKH);
    const isSupervisor = roles.includes(Role.SUPERVISOR);

    if (isSuperAdmin) return announcement;

    if (isTenantAdmin) {
      if (announcement.scope === AnnouncementScope.GLOBAL) {
        throw new ForbiddenException('Tenant Admin cannot modify global announcements.');
      }
      return announcement;
    }

    if (isSheikh || isSupervisor) {
      if (announcement.scope !== AnnouncementScope.CIRCLE) {
        throw new ForbiddenException('Sheikhs and Supervisors may only modify circle announcements.');
      }
      if (announcement.createdById !== user.sub) {
        throw new ForbiddenException('You may only modify announcements you created.');
      }
      return announcement;
    }

    throw new ForbiddenException('Insufficient permissions to modify this announcement.');
  }
}
