import { ResourceType } from '@shared/enums/resource-type.enum';
import { Role } from '@shared/enums/roles.enum';

export interface OwnershipCheckParams {
  userId: string;
  tenantId: string;
  /**
   * Every role the user holds. The user owns the resource if ANY one of
   * these roles satisfies that role's ownership rule (see
   * `OwnershipResolverService.evaluate`).
   */
  roles: Role[];
  resourceType: ResourceType;
  resourceId: string;
}

/**
 * Domain contract for "may this user act on this specific resource
 * instance" — distinct from `IPermissionResolver`, which answers "may
 * this user perform this *kind* of action at all." A sheikh may have
 * `sessions.update` (permission) yet still be forbidden from updating a
 * session belonging to another sheikh's group (ownership).
 *
 * Ownership rules per role (see docs/architecture/09-authorization-blueprint.md §4):
 *   - SUPER_ADMIN / TENANT_ADMIN: always own everything in scope — never
 *     consulted (short-circuited by ResourceOwnershipGuard before this
 *     resolver is called).
 *   - STUDENT: owns only resources whose student reference is their own
 *     Student profile.
 *   - PARENT: owns resources whose student reference is one of their
 *     linked children (`Parent.students[]`).
 *   - SHEIKH: owns resources belonging to a student/session/group they
 *     are assigned to teach (`Sheikh.groups[]`).
 *   - SUPERVISOR: owns resources belonging to a group they supervise
 *     (`Supervisor.supervisedGroups[]`).
 */
export interface IOwnershipResolver {
  isOwner(params: OwnershipCheckParams): Promise<boolean>;
}

export const OWNERSHIP_RESOLVER = Symbol('OWNERSHIP_RESOLVER');
