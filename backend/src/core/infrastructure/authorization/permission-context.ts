import { Injectable, Scope } from '@nestjs/common';
import { EffectivePermissions } from '@core/domain/authorization/permission-resolver.interface';

/**
 * Request-scoped authorization context — mirrors `TenantContext`.
 *
 * Initialized empty by `PermissionContextMiddleware` on every request,
 * then lazily populated (once) by `PermissionsGuard` the first time a
 * route requires a permission check. `TenantScopeGuard` and
 * `ResourceOwnershipGuard`, which run after `PermissionsGuard` in the
 * guard chain, read the already-resolved value instead of re-querying —
 * one DB round trip for effective-permission resolution per request,
 * however many guards consult it.
 */
@Injectable({ scope: Scope.REQUEST })
export class PermissionContext {
  private _effective?: EffectivePermissions;

  get isResolved(): boolean {
    return this._effective !== undefined;
  }

  get effective(): EffectivePermissions | undefined {
    return this._effective;
  }

  set(effective: EffectivePermissions): void {
    this._effective = effective;
  }
}
