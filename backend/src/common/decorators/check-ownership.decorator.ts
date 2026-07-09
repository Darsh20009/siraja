import { SetMetadata } from '@nestjs/common';
import { ResourceType } from '@shared/enums/resource-type.enum';

export const OWNERSHIP_KEY = 'ownership';

export interface OwnershipMetadata {
  resourceType: ResourceType;
  /** Route param name the resource id is read from. Defaults to "id". */
  paramKey: string;
}

/**
 * Requires the caller to *own* the specific resource instance being
 * accessed (see `ResourceOwnershipGuard` + `OwnershipResolverService`),
 * on top of whatever `@RequirePermissions` already required for the
 * resource *kind*. `SUPER_ADMIN` and `TENANT_ADMIN` always bypass this
 * check — ownership only constrains Supervisor/Sheikh/Parent/Student.
 *
 *   @CheckOwnership(ResourceType.STUDENT)                // reads route param "id"
 *   @CheckOwnership(ResourceType.STUDENT, 'studentId')    // reads route param "studentId"
 */
export const CheckOwnership = (resourceType: ResourceType, paramKey = 'id') =>
  SetMetadata(OWNERSHIP_KEY, { resourceType, paramKey } as OwnershipMetadata);
