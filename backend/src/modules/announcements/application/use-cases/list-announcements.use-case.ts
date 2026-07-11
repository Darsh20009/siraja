import { Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  ANNOUNCEMENT_REPOSITORY,
  IAnnouncementRepository,
} from '../../domain/repositories/announcement.repository.interface';
import { AnnouncementScope, AnnouncementStatus } from '@shared/enums/announcement.enum';
import { Role } from '@shared/enums/roles.enum';

/**
 * ListAnnouncementsUseCase
 *
 * Two modes:
 *
 * Audience view (manage=false, default):
 *   Returns GLOBAL + TENANT published non-expired announcements for all roles.
 *   CIRCLE announcements are excluded for non-admin callers (circleId is always
 *   ignored for non-admins — set to undefined before reaching this use-case by
 *   the controller). This prevents cross-circle disclosure via untrusted query
 *   input.
 *
 * Management view (manage=true):
 *   Tenant Admin / Super Admin: unrestricted access — see all announcements in
 *     their tenant across all scopes and statuses.
 *   Sheikh / Supervisor: restricted to announcements THEY created
 *     (createdById === user.sub). They cannot see other circles' drafts.
 *   All other roles: manage=true is silently ignored; falls back to audience view.
 */
@Injectable()
export class ListAnnouncementsUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY)
    private readonly repo: IAnnouncementRepository,
  ) {}

  async execute(
    user: AccessTokenPayload,
    opts: {
      manage?: boolean;
      scope?: AnnouncementScope;
      status?: AnnouncementStatus;
      circleId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const roles = user.roles as Role[];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);
    const isTenantAdmin = roles.includes(Role.TENANT_ADMIN);
    const isFullAdmin = isSuperAdmin || isTenantAdmin;
    const isSheikh = roles.includes(Role.SHEIKH);
    const isSupervisor = roles.includes(Role.SUPERVISOR);

    if (opts.manage) {
      if (isFullAdmin) {
        // Admins: unrestricted management view — all scopes, all statuses.
        return this.repo.findAll(
          user.tenantId,
          {
            scope: opts.scope,
            status: opts.status,
            circleId: opts.circleId,
          },
          opts.page ?? 1,
          opts.limit ?? 20,
        );
      }

      if (isSheikh || isSupervisor) {
        // Sheikh / Supervisor: management view is STRICTLY scoped to
        // announcements they created. They cannot see other creators' drafts
        // or other circles' announcements regardless of query params.
        return this.repo.findAll(
          user.tenantId,
          {
            scope: opts.scope,
            status: opts.status,
            circleId: opts.circleId,
            createdById: user.sub, // hard-locked to caller
          },
          opts.page ?? 1,
          opts.limit ?? 20,
        );
      }

      // Other roles fall through to audience view.
    }

    // Audience view: GLOBAL + TENANT only (circleId already stripped for
    // non-admins by the controller before reaching this use-case).
    return this.repo.findVisible(
      user.tenantId,
      opts.circleId,
      opts.page ?? 1,
      opts.limit ?? 20,
    );
  }
}
